/**
 * Insights RTK Query API
 * -----------------------
 * GET /insights — financial alerts, recommendations, and insights
 */

import { apiClient } from "@/app/api-client";

export interface InsightsData {
  alerts: string[];
  recommendations: string[];
  insights: {
    totalIncome: number;
    totalExpenses: number;
    availableBalance: number;
    savingsRate: number;
    topCategory: string;
    topCategoryPercentage: number;
    expenseGrowth: number;
    incomeGrowth: number;
    transactionCount: number;
  };
}

export interface InsightsResponse {
  message: string;
  data: InsightsData;
}

export const insightsApi = apiClient.injectEndpoints({
  endpoints: (builder) => ({
    getInsights: builder.query<InsightsResponse, void>({
      query: () => ({
        url: "/insights",
        method: "GET",
      }),
    }),
  }),
});

export const { useGetInsightsQuery } = insightsApi;
