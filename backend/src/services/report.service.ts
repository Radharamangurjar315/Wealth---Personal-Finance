import mongoose from "mongoose";
import ReportSettingModel from "../models/report-setting.model";
import ReportModel from "../models/report.model";
import TransactionModel, {
  TransactionTypeEnum,
} from "../models/transaction.model";
import { NotFoundException } from "../utils/app-error";
import { calulateNextReportDate } from "../utils/helper";
import { UpdateReportSettingType } from "../validators/report.validator";
import { convertToRupees } from "../utils/format-currency";

import { format } from "date-fns";
// import { genAI, genAIModel } from "../config/google-ai.config";
import { geminiAxios, GEMINI_MODEL } from "../config/google-ai.config";
// import { createUserContent } from "@google/genai";
import { receiptPrompt } from "../utils/prompt";

export const getAllReportsService = async (
  userId: string,
  pagination: {
    pageSize: number;
    pageNumber: number;
  }
) => {
  const query: Record<string, any> = { userId };

  const { pageSize, pageNumber } = pagination;
  const skip = (pageNumber - 1) * pageSize;

  const [reports, totalCount] = await Promise.all([
    ReportModel.find(query).skip(skip).limit(pageSize).sort({ createdAt: -1 }),
    ReportModel.countDocuments(query),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    reports,
    pagination: {
      pageSize,
      pageNumber,
      totalCount,
      totalPages,
      skip,
    },
  };
};

export const updateReportSettingService = async (
  userId: string,
  body: UpdateReportSettingType
) => {
  const { isEnabled } = body;
  let nextReportDate: Date | null = null;

  const existingReportSetting = await ReportSettingModel.findOne({
    userId,
  });
  if (!existingReportSetting)
    throw new NotFoundException("Report setting not found");

  //   const frequency =
  //     existingReportSetting.frequency || ReportFrequencyEnum.MONTHLY;

  if (isEnabled) {
    const currentNextReportDate = existingReportSetting.nextReportDate;
    const now = new Date();
    if (!currentNextReportDate || currentNextReportDate <= now) {
      nextReportDate = calulateNextReportDate(
        existingReportSetting.lastSentDate
      );
    } else {
      nextReportDate = currentNextReportDate;
    }
  }

  console.log(nextReportDate, "nextReportDate");

  existingReportSetting.set({
    ...body,
    nextReportDate,
  });

  await existingReportSetting.save();
};

export const generateReportService = async (
  userId: string,
  fromDate: Date,
  toDate: Date
) => {
  // ✅ Fix: Normalize date range (IMPORTANT)
  const start = new Date(fromDate);
const end = new Date(toDate);
end.setDate(end.getDate() + 1);

const results = await TransactionModel.aggregate([
  {
    $match: {
      userId: new mongoose.Types.ObjectId(userId),
      date: { $gte: start, $lt: end },
    },
  },
    {
      $facet: {
        summary: [
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
            },
          },
        ],
        categories: [
          { $match: { type: TransactionTypeEnum.EXPENSE } },
          {
            $group: {
              _id: "$category",
              total: { $sum: { $abs: "$amount" } },
            },
          },
          { $sort: { total: -1 } },
          { $limit: 5 },
        ],
      },
    },
    {
      $project: {
        totalIncome: { $arrayElemAt: ["$summary.totalIncome", 0] },
        totalExpenses: { $arrayElemAt: ["$summary.totalExpenses", 0] },
        categories: 1,
      },
    },
  ]);

  const {
    totalIncome = 0,
    totalExpenses = 0,
    categories = [],
  } = results[0] || {};

  const availableBalance = totalIncome - totalExpenses;
  const savingsRate = calculateSavingRate(totalIncome, totalExpenses);
  
  const byCategory = categories.reduce(
  (acc: any, { _id, total }: any) => {
    acc[_id] = {
      amount: convertToRupees(total),
      percentage:
        totalExpenses > 0
          ? Math.round((total / totalExpenses) * 100)
          : 0,
    };
    return acc;
  },
  {} as Record<string, { amount: number; percentage: number }>
);

// ✅ NOW calculate health score
const healthScore = calculateHealthScore(
  totalIncome,
  totalExpenses,
  savingsRate,
  byCategory
);



  const periodLabel = `${format(start, "MMMM d")} - ${format(
    end,
    "d, yyyy"
  )}`;

  // ✅ Handle empty data gracefully (no null return)
  if (totalIncome === 0 && totalExpenses === 0) {
    return {
      period: periodLabel,
      summary: {
        income: 0,
        expenses: 0,
        balance: 0,
        savingsRate: 0,
        healthScore,
        topCategories: [],
      },
      insights: [
        "No financial activity recorded during this period.",
        "Try selecting a wider date range to analyze spending trends.",
      ],
    };
  }


  let insights: string[] = [];

  try {
    insights = await generateInsightsAI({
      totalIncome,
      totalExpenses,
      availableBalance,
      savingsRate,
      categories: byCategory,
      periodLabel,
    });
  } catch {
    insights = [];
  }

  return {
    period: periodLabel,
    summary: {
      income: convertToRupees(totalIncome),
      expenses: convertToRupees(totalExpenses),
      balance: convertToRupees(availableBalance),
      savingsRate: Number(savingsRate.toFixed(1)),
      healthScore,
      topCategories: Object.entries(byCategory).map(
        ([name, cat]: any) => ({
          name,
          amount: cat.amount,
          percent: cat.percentage,
        })
      ),
    },
    insights:
      insights.length > 0
        ? insights
        : ["Your financial summary has been generated successfully."],
  };
};



async function generateInsightsAI({
  totalIncome,
  totalExpenses,
  availableBalance,
  savingsRate,
  categories,
  periodLabel,
}: {
  totalIncome: number;
  totalExpenses: number;
  availableBalance: number;
  savingsRate: number;
  categories: Record<string, { amount: number; percentage: number }>;
  periodLabel: string;
}) {
  try {
    //  Build AI prompt (we’ll fix your prompt to use reportInsightPrompt)
    const prompt = reportInsightPrompt({
      totalIncome,
      totalExpenses,
      availableBalance,
      savingsRate,
      categories,
      periodLabel,
    });

    console.log(" Sending financial summary to Gemini...");

    //  REST API request to Gemini (same as transaction service)
    const { data } = await geminiAxios.post(
      `/${GEMINI_MODEL}:generateContent`,
      {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0,
          topP: 1,
          responseMimeType: "application/json",
        },
      }
    );

    //  Extract raw response text
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    console.log("🔍 Gemini Insights raw response:", rawText);

    if (!rawText) return [];

    // Clean markdown formatting if Gemini wrapped response in code fences
    const cleaned = rawText.replace(/```(?:json)?\n?/g, "").trim();

    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) return parsed;
      return [];
    } catch (e) {
      console.error("Failed to parse Gemini insights:", cleaned);
      return [];
    }
  } catch (error: any) {
  console.error("Gemini Insights Error:", error.response?.data || error.message);

  // Fallback to local smart insights
  return generateLocalInsights(
    totalIncome,
    totalExpenses,
    availableBalance,
    savingsRate,
    categories
  );
}
}

function generateLocalInsights(
  income: number,
  expenses: number,
  balance: number,
  savingsRate: number,
  categories: Record<string, { amount: number; percentage: number }>
) {
  const insights: string[] = [];

  if (income > 0 && savingsRate >= 50) {
    insights.push("Excellent savings performance this period.");
  }

  if (expenses > income) {
    insights.push("Your expenses exceeded your income.");
  }

  if (balance > 0) {
    insights.push("You maintained a positive financial balance.");
  }

  const topCategory = Object.entries(categories)[0];

  if (topCategory) {
    const [name, data] = topCategory;
    if (data.percentage > 40) {
      insights.push(
        `A significant portion of spending (${data.percentage}%) is on ${name}.`
      );
    }
  }

  return insights.length
    ? insights
    : ["Your financial summary has been successfully generated."];
}


function calculateSavingRate(totalIncome: number, totalExpenses: number) {
  if (totalIncome <= 0) return 0;
  const savingRate = ((totalIncome - totalExpenses) / totalIncome) * 100;
  return parseFloat(savingRate.toFixed(2));
}
function createPartFromBase64(
  base64String: string,
  mimetype: string
): import("@google/genai").PartUnion {
  // Strip data URL prefix if present
  const matches = base64String.match(/^data:(.*?);base64,(.*)$/);
  const b64 = matches ? matches[2] : base64String;

  const buffer = Buffer.from(b64, "base64");

  // The concrete shape of PartUnion can vary between versions of @google/genai.
  // Return a reasonable "file part" shape and cast to PartUnion so TypeScript accepts it.
  // This object contains the binary data, mime type and a filename.
  return {
    type: "file",
    filename: "attachment",
    mimeType: mimetype,
    data: buffer,
  } as unknown as import("@google/genai").PartUnion;
}

function reportInsightPrompt({
  totalIncome,
  totalExpenses,
  availableBalance,
  savingsRate,
  categories,
  periodLabel,
}: {
  totalIncome: number;
  totalExpenses: number;
  availableBalance: number;
  savingsRate: number;
  categories: Record<string, { amount: number; percentage: number }>;
  periodLabel: string;
}) {
  return `
You are a financial analyst AI.

Analyze the following financial summary for the period: ${periodLabel}.

Total Income: ₹${totalIncome}
Total Expenses: ₹${totalExpenses}
Available Balance: ₹${availableBalance}
Savings Rate: ${savingsRate}%

Top Spending Categories:
${Object.entries(categories)
  .map(
    ([name, cat]) =>
      `- ${name}: ₹${cat.amount} (${cat.percentage}%)`
  )
  .join("\n")}

Generate 3-5 short, actionable financial insights.

IMPORTANT:
- Respond ONLY in valid JSON array format.
- Example format:
[
  "Insight 1",
  "Insight 2",
  "Insight 3"
]
`;
}

function calculateHealthScore(
  income: number,
  expenses: number,
  savingsRate: number,
  categories: Record<string, { amount: number; percentage: number }>
) {
  let score = 100;

  // 1️⃣ Savings strength
  if (income > 0) {
    if (savingsRate < 10) score -= 40;
    else if (savingsRate < 30) score -= 20;
  }

  // 2️⃣ Overspending penalty
  if (expenses > income) score -= 30;

  // 3️⃣ Spending concentration
  const topCategory = Object.values(categories)[0];
  if (topCategory && topCategory.percentage > 60) {
    score -= 20;
  }

  // 4️⃣ No income but expenses
  if (income === 0 && expenses > 0) score -= 30;

  return Math.max(score, 0);
}

