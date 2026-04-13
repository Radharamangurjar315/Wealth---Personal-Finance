/**
 * Insights Service
 * -----------------
 * Fetches user financial data, runs the deterministic analyzer,
 * and optionally enhances recommendations via Groq LLM.
 */

import mongoose, { PipelineStage } from "mongoose";
import TransactionModel, {
  TransactionTypeEnum,
} from "../models/transaction.model";
import ThresholdModel from "../models/threshold.model";
import { convertToRupees } from "../utils/format-currency";
import {
  analyzeFinancialData,
  CategorySpending,
  FinancialData,
} from "./insights.analyzer";
import { buildInsightsPrompt } from "../utils/insights.prompts";
import { groqClient, GROQ_CHATBOT_MODEL } from "../config/groq-ai.config";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
} from "date-fns";
import { InternalServerException } from "../utils/app-error";

// ─── In-memory cache (per user, 30 min TTL) ──────────────────────────────────

interface CacheEntry {
  data: any;
  expiresAt: number;
}

const insightsCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

const getCached = (userId: string) => {
  const entry = insightsCache.get(userId);
  if (entry && Date.now() < entry.expiresAt) return entry.data;
  insightsCache.delete(userId);
  return null;
};

const setCache = (userId: string, data: any) => {
  insightsCache.set(userId, { data, expiresAt: Date.now() + CACHE_TTL_MS });
};

// ─── Aggregation helpers ──────────────────────────────────────────────────────

const buildSummaryPipeline = (
  objectId: mongoose.Types.ObjectId,
  from: Date,
  to: Date
): PipelineStage[] => [
  {
    $match: {
      userId: objectId,
      date: { $gte: from, $lte: to },
    },
  },
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

const buildCategoryPipeline = (
  objectId: mongoose.Types.ObjectId,
  from: Date,
  to: Date
): PipelineStage[] => [
  {
    $match: {
      userId: objectId,
      type: TransactionTypeEnum.EXPENSE,
      date: { $gte: from, $lte: to },
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

const toCategoryBreakdown = (
  catResult: any[],
  totalExpenseAmount: number
): CategorySpending[] =>
  catResult.map((c) => ({
    name: c._id || "Uncategorized",
    amount: convertToRupees(c.totalAmount),
    percentage:
      totalExpenseAmount > 0 ? (c.totalAmount / totalExpenseAmount) * 100 : 0,
  }));

// ─── Main service ─────────────────────────────────────────────────────────────

export const getInsightsService = async (userId: string) => {
  // 1. Check cache
  const cached = getCached(userId);
  if (cached) return cached;

  const objectId = new mongoose.Types.ObjectId(userId);
  const now = new Date();

  // Current month range
  const curFrom = startOfMonth(now);
  const curTo = endOfMonth(now);

  // Previous month range
  const prevMonth = subMonths(now, 1);
  const prevFrom = startOfMonth(prevMonth);
  const prevTo = endOfMonth(prevMonth);

  // 2. Run all aggregations + threshold fetch in parallel
  const [
    curSummaryResult,
    curCategoryResult,
    prevSummaryResult,
    prevCategoryResult,
    thresholdDoc,
  ] = await Promise.all([
    TransactionModel.aggregate(buildSummaryPipeline(objectId, curFrom, curTo)),
    TransactionModel.aggregate(buildCategoryPipeline(objectId, curFrom, curTo)),
    TransactionModel.aggregate(
      buildSummaryPipeline(objectId, prevFrom, prevTo)
    ),
    TransactionModel.aggregate(
      buildCategoryPipeline(objectId, prevFrom, prevTo)
    ),
    ThresholdModel.findOne({ userId: objectId }).lean(),
  ]);

  // Parse current month
  const cur = curSummaryResult[0] || {
    totalIncome: 0,
    totalExpenses: 0,
    transactionCount: 0,
  };
  const totalIncome = convertToRupees(cur.totalIncome);
  const totalExpenses = convertToRupees(cur.totalExpenses);
  const availableBalance = totalIncome - totalExpenses;
  const savingsRate =
    totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
  const expenseRatio =
    totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;

  const curCatTotal = curCategoryResult.reduce(
    (a: number, c: any) => a + c.totalAmount,
    0
  );
  const categoryBreakdown = toCategoryBreakdown(curCategoryResult, curCatTotal);

  // Parse previous month
  const prev = prevSummaryResult[0] || {
    totalIncome: 0,
    totalExpenses: 0,
  };
  const prevTotalIncome = convertToRupees(prev.totalIncome);
  const prevTotalExpenses = convertToRupees(prev.totalExpenses);
  const prevSavingsRate =
    prevTotalIncome > 0
      ? ((prevTotalIncome - prevTotalExpenses) / prevTotalIncome) * 100
      : 0;

  const prevCatTotal = prevCategoryResult.reduce(
    (a: number, c: any) => a + c.totalAmount,
    0
  );
  const prevCategoryBreakdown = toCategoryBreakdown(
    prevCategoryResult,
    prevCatTotal
  );

  // Threshold amount (already stored in rupees — no conversion needed)
  const budgetThreshold = thresholdDoc?.amount
    ? thresholdDoc.amount
    : null;

  // 3. Run deterministic analysis
  const financialData: FinancialData = {
    totalIncome,
    totalExpenses,
    availableBalance,
    savingsRate,
    expenseRatio,
    transactionCount: cur.transactionCount,
    categoryBreakdown,
    prevTotalIncome,
    prevTotalExpenses,
    prevSavingsRate,
    prevCategoryBreakdown,
    budgetThreshold,
  };

  const analysis = analyzeFinancialData(financialData);

  // 4. Optionally enhance recommendations via Groq
  let aiRecommendations = analysis.recommendations;
  try {
    const prompt = buildInsightsPrompt(analysis);
    const chatCompletion = await groqClient.chat.completions.create({
      model: GROQ_CHATBOT_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are a helpful personal finance advisor. Respond ONLY with a JSON array of strings.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 512,
    });

    const raw = chatCompletion.choices?.[0]?.message?.content?.trim();
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        aiRecommendations = parsed;
      }
    }
  } catch (aiError: any) {
    // If AI fails, we still return the deterministic recommendations
    console.warn(
      "Insights AI enhancement failed — using deterministic recommendations:",
      aiError?.message
    );
  }

  // 5. Build final response
  const result = {
    alerts: analysis.alerts,
    recommendations: aiRecommendations,
    insights: analysis.insights,
  };

  // 6. Cache
  setCache(userId, result);

  return result;
};
