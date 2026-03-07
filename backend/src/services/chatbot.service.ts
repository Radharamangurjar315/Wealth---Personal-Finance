/**
 * Chatbot Service
 * ----------------
 * Gathers the logged-in user's financial context and calls Groq (LLaMA 3.1) for a response.
 */

import mongoose, { PipelineStage } from "mongoose";
import TransactionModel, {
  TransactionTypeEnum,
} from "../models/transaction.model";
import { convertToRupees } from "../utils/format-currency";
import {
  buildChatbotSystemPrompt,
  buildChatbotUserPrompt,
  ChatbotFinancialContext,
  suggestedQuestions,
} from "../utils/chatbot.prompts";
import { groqClient, GROQ_CHATBOT_MODEL } from "../config/groq-ai.config";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { BadRequestException, InternalServerException } from "../utils/app-error";

// ─── Gather financial context for the current month ───────────────────────────

const getFinancialContext = async (
  userId: string,
  userName: string
): Promise<ChatbotFinancialContext> => {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const objectId = new mongoose.Types.ObjectId(userId);

  // 1) Summary aggregation (income, expenses, counts)
  const summaryPipeline: PipelineStage[] = [
    {
      $match: {
        userId: objectId,
        date: { $gte: monthStart, $lte: monthEnd },
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

  // 2) Category breakdown (expenses only)
  const categoryPipeline: PipelineStage[] = [
    {
      $match: {
        userId: objectId,
        type: TransactionTypeEnum.EXPENSE,
        date: { $gte: monthStart, $lte: monthEnd },
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

  // 3) Recent transactions
  const recentTransactions = await TransactionModel.find({ userId: objectId })
    .sort({ date: -1 })
    .limit(10)
    .lean();

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
  const availableBalance = totalIncome - totalExpenses;
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

  const formattedRecent = recentTransactions.map((t: any) => ({
    title: t.title || "Untitled",
    amount: convertToRupees(t.amount),
    type: t.type,
    category: t.category || "N/A",
    date: format(new Date(t.date), "dd MMM yyyy"),
  }));

  return {
    userName,
    totalIncome,
    totalExpenses,
    availableBalance,
    savingsRate,
    expenseRatio,
    transactionCount: summary.transactionCount,
    categoryBreakdown,
    recentTransactions: formattedRecent,
  };
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

  // 1. Build financial context
  const context = await getFinancialContext(userId, userName);

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

    return {
      reply: aiText,
      context: {
        totalIncome: context.totalIncome,
        totalExpenses: context.totalExpenses,
        availableBalance: context.availableBalance,
        savingsRate: Number(context.savingsRate.toFixed(1)),
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
