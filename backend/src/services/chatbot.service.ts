/**
 * Chatbot Service
 * ----------------
 * Gathers the logged-in user's multi-month financial context and calls
 * Groq (LLaMA 3.1) for a response.
 *
 * Key improvement: when the current month has no data the AI receives
 * last-month and 3-month-average data so it can still give useful answers.
 */

import mongoose, { PipelineStage } from "mongoose";
import TransactionModel, {
  TransactionTypeEnum,
} from "../models/transaction.model";
import { convertToRupees } from "../utils/format-currency";
import {
  buildChatbotSystemPrompt,
  buildChatbotUserPrompt,
  EnrichedFinancialContext,
  PeriodSummary,
  suggestedQuestions,
} from "../utils/chatbot.prompts";
import { groqClient, GROQ_CHATBOT_MODEL } from "../config/groq-ai.config";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
} from "date-fns";
import {
  BadRequestException,
  InternalServerException,
} from "../utils/app-error";

// ─── In-memory cache (TTL = 30 min) ──────────────────────────────────────────

interface CacheEntry {
  data: EnrichedFinancialContext;
  expiresAt: number;
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const summaryCache = new Map<string, CacheEntry>();

/** Call this whenever a user's transactions change. */
export const invalidateChatbotCache = (userId: string): void => {
  summaryCache.delete(userId);
};

// ─── Aggregation helpers ─────────────────────────────────────────────────────

/**
 * Builds and runs a summary + category aggregation for a given date range.
 * Returns a PeriodSummary.
 */
const aggregatePeriod = async (
  objectId: mongoose.Types.ObjectId,
  rangeStart: Date,
  rangeEnd: Date
): Promise<PeriodSummary> => {
  const matchFilter = {
    userId: objectId,
    date: { $gte: rangeStart, $lte: rangeEnd },
  };

  // Run summary + category pipelines in parallel
  const summaryPipeline: PipelineStage[] = [
    { $match: matchFilter },
    {
      $group: {
        _id: null,
        totalIncome: {
          $sum: {
            $cond: [
              { $eq: ["$type", TransactionTypeEnum.INCOME] },
              { $abs: "$amount" },
              0,
            ],
          },
        },
        totalExpenses: {
          $sum: {
            $cond: [
              { $eq: ["$type", TransactionTypeEnum.EXPENSE] },
              { $abs: "$amount" },
              0,
            ],
          },
        },
        transactionCount: { $sum: 1 },
      },
    },
  ];

  const categoryPipeline: PipelineStage[] = [
    {
      $match: {
        ...matchFilter,
        type: TransactionTypeEnum.EXPENSE,
      },
    },
    {
      $group: {
        _id: "$category",
        totalAmount: { $sum: { $abs: "$amount" } },
      },
    },
    { $sort: { totalAmount: -1 } },
    { $limit: 10 },
  ];

  const [summaryResult, categoryResult] = await Promise.all([
    TransactionModel.aggregate(summaryPipeline),
    TransactionModel.aggregate(categoryPipeline),
  ]);

  const summary = summaryResult[0] || {
    totalIncome: 0,
    totalExpenses: 0,
    transactionCount: 0,
  };

  const totalIncome = convertToRupees(summary.totalIncome);
  const totalExpenses = convertToRupees(summary.totalExpenses);
  const savings = totalIncome - totalExpenses;
  const savingsRate =
    totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
  const expenseRatio =
    totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;

  const totalExpenseAmount = categoryResult.reduce(
    (acc: number, c: any) => acc + c.totalAmount,
    0
  );

  const categoryBreakdown = categoryResult.map((c: any) => ({
    name: c._id || "Uncategorized",
    amount: convertToRupees(c.totalAmount),
    percentage:
      totalExpenseAmount > 0 ? (c.totalAmount / totalExpenseAmount) * 100 : 0,
  }));

  return {
    totalIncome,
    totalExpenses,
    savings,
    savingsRate,
    expenseRatio,
    transactionCount: summary.transactionCount,
    categoryBreakdown,
  };
};

/**
 * Per-month expense aggregation used for "most/least expensive month" and
 * per-month savings rate for trend detection.
 */
const aggregateMonthlyBreakdown = async (
  objectId: mongoose.Types.ObjectId,
  rangeStart: Date,
  rangeEnd: Date
): Promise<
  {
    month: string;
    totalIncome: number;
    totalExpenses: number;
    savingsRate: number;
    topCategory: string;
    topCategoryAmount: number;
  }[]
> => {
  const pipeline: PipelineStage[] = [
    {
      $match: {
        userId: objectId,
        date: { $gte: rangeStart, $lte: rangeEnd },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$date" } },
        totalIncome: {
          $sum: {
            $cond: [
              { $eq: ["$type", TransactionTypeEnum.INCOME] },
              { $abs: "$amount" },
              0,
            ],
          },
        },
        totalExpenses: {
          $sum: {
            $cond: [
              { $eq: ["$type", TransactionTypeEnum.EXPENSE] },
              { $abs: "$amount" },
              0,
            ],
          },
        },
      },
    },
    { $sort: { _id: 1 } },
  ];

  // Top category per the full 3-month range (single value)
  const topCatPipeline: PipelineStage[] = [
    {
      $match: {
        userId: objectId,
        type: TransactionTypeEnum.EXPENSE,
        date: { $gte: rangeStart, $lte: rangeEnd },
      },
    },
    {
      $group: {
        _id: "$category",
        total: { $sum: { $abs: "$amount" } },
      },
    },
    { $sort: { total: -1 } },
    { $limit: 1 },
  ];

  const [monthlyResult, topCatResult] = await Promise.all([
    TransactionModel.aggregate(pipeline),
    TransactionModel.aggregate(topCatPipeline),
  ]);

  const topCat = topCatResult[0]
    ? {
        name: topCatResult[0]._id || "Uncategorized",
        amount: topCatResult[0].total,
      }
    : { name: "N/A", amount: 0 };

  return monthlyResult.map((m: any) => {
    const income = convertToRupees(m.totalIncome);
    const expenses = convertToRupees(m.totalExpenses);
    const savingsRate =
      income > 0 ? ((income - expenses) / income) * 100 : 0;
    return {
      month: m._id, // "YYYY-MM"
      totalIncome: income,
      totalExpenses: expenses,
      savingsRate,
      topCategory: topCat.name,
      topCategoryAmount: topCat.amount,
    };
  });
};

// ─── Main: build enriched financial summary ──────────────────────────────────

const getFinancialSummary = async (
  userId: string,
  userName: string
): Promise<EnrichedFinancialContext> => {
  // Check cache
  const cached = summaryCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return { ...cached.data, userName }; // always use latest userName
  }

  const now = new Date();
  const objectId = new mongoose.Types.ObjectId(userId);

  // Date ranges
  const curStart = startOfMonth(now);
  const curEnd = endOfMonth(now);
  const lastMonthDate = subMonths(now, 1);
  const lastStart = startOfMonth(lastMonthDate);
  const lastEnd = endOfMonth(lastMonthDate);
  const threeMonthsAgoDate = subMonths(now, 2);
  const threeStart = startOfMonth(threeMonthsAgoDate);

  // Parallel fetches
  const [currentMonth, lastMonth, monthlyBreakdown, recentTransactions] =
    await Promise.all([
      aggregatePeriod(objectId, curStart, curEnd),
      aggregatePeriod(objectId, lastStart, lastEnd),
      aggregateMonthlyBreakdown(objectId, threeStart, curEnd),
      TransactionModel.find({ userId: objectId })
        .sort({ date: -1 })
        .limit(10)
        .lean(),
    ]);

  // ── 3-month averages ────────────────────────────────────────────────────
  const monthsWithData = monthlyBreakdown.filter(
    (m) => m.totalIncome > 0 || m.totalExpenses > 0
  );
  const monthCount = monthsWithData.length || 1; // avoid /0

  const totalIncomeSum = monthsWithData.reduce(
    (s, m) => s + m.totalIncome,
    0
  );
  const totalExpensesSum = monthsWithData.reduce(
    (s, m) => s + m.totalExpenses,
    0
  );
  const avgIncome = totalIncomeSum / monthCount;
  const avgExpenses = totalExpensesSum / monthCount;
  const avgSavings = avgIncome - avgExpenses;
  const avgSavingsRate =
    avgIncome > 0 ? ((avgIncome - avgExpenses) / avgIncome) * 100 : 0;

  // ── Trends ──────────────────────────────────────────────────────────────
  const topCategory =
    monthlyBreakdown.length > 0 ? monthlyBreakdown[0].topCategory : "N/A";

  // Most / least expensive month
  let mostExpensiveMonth = "N/A";
  let lowestSpendingMonth = "N/A";

  if (monthsWithData.length > 0) {
    const sorted = [...monthsWithData].sort(
      (a, b) => b.totalExpenses - a.totalExpenses
    );
    mostExpensiveMonth = formatMonthLabel(sorted[0].month);
    lowestSpendingMonth = formatMonthLabel(sorted[sorted.length - 1].month);
  }

  // Savings rate trend: compare the two most recent months that have data
  let savingsRateTrend = "Stable";
  if (monthsWithData.length >= 2) {
    const recent = monthsWithData[monthsWithData.length - 1].savingsRate;
    const previous = monthsWithData[monthsWithData.length - 2].savingsRate;
    const diff = recent - previous;
    if (diff > 2) savingsRateTrend = "Increasing";
    else if (diff < -2) savingsRateTrend = "Decreasing";
  }

  // ── Recent transactions ─────────────────────────────────────────────────
  const formattedRecent = recentTransactions.map((t: any) => ({
    title: t.title || "Untitled",
    amount: convertToRupees(t.amount),
    type: t.type,
    category: t.category || "N/A",
    date: format(new Date(t.date), "dd MMM yyyy"),
  }));

  const hasCurrentMonthData = currentMonth.transactionCount > 0;

  const result: EnrichedFinancialContext = {
    userName,
    currentMonth,
    lastMonth,
    threeMonthAverage: {
      avgIncome,
      avgExpenses,
      avgSavings,
      avgSavingsRate,
    },
    topCategory,
    mostExpensiveMonth,
    lowestSpendingMonth,
    savingsRateTrend,
    recentTransactions: formattedRecent,
    hasCurrentMonthData,
  };

  // Store in cache
  summaryCache.set(userId, {
    data: result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return result;
};

/** Converts "2026-03" → "March 2026" */
const formatMonthLabel = (yyyyMm: string): string => {
  const [year, month] = yyyyMm.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return format(date, "MMMM yyyy");
};

// ─── Call Groq (LLaMA 3.1) with context + user message ────────────────────────

export const chatbotService = async (
  userId: string,
  userName: string,
  userMessage: string
) => {
  if (!userMessage || userMessage.trim().length === 0) {
    throw new BadRequestException("Message cannot be empty");
  }

  // 1. Build enriched financial context (cached)
  const context = await getFinancialSummary(userId, userName);

  // 2. Build prompts
  const systemPrompt = buildChatbotSystemPrompt(context);
  const userPrompt = buildChatbotUserPrompt(userMessage);

  // 3. Call Groq API (OpenAI-compatible chat completion)
  try {
    const chatCompletion = await groqClient.chat.completions.create({
      model: GROQ_CHATBOT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 1024,
    });

    const aiText =
      chatCompletion.choices?.[0]?.message?.content?.trim();

    if (!aiText) {
      throw new InternalServerException(
        "AI returned an empty response. Please try again."
      );
    }

    // Return richer context to the frontend
    const primary = context.hasCurrentMonthData
      ? context.currentMonth
      : context.lastMonth;

    return {
      reply: aiText,
      context: {
        totalIncome: primary.totalIncome,
        totalExpenses: primary.totalExpenses,
        availableBalance: primary.savings,
        savingsRate: Number(primary.savingsRate.toFixed(1)),
      },
    };
  } catch (error: any) {
    // If it's already our custom error, rethrow immediately
    if (error?.statusCode) throw error;

    console.error(
      "Groq API error:",
      error?.message || error
    );

    if (error?.status === 429) {
      throw new InternalServerException(
        "The AI service is currently busy due to high demand. Please wait a moment and try again."
      );
    }

    throw new InternalServerException(
      "Failed to get a response from the AI. Please try again later."
    );
  }
};

// ─── Get suggested questions ──────────────────────────────────────────────────

export const getSuggestedQuestionsService = () => {
  return suggestedQuestions;
};
