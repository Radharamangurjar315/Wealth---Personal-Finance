/**
 * Chatbot RTK Query API
 * ----------------------
 * Endpoints for the AI chatbot assistant.
 */

import { apiClient } from "@/app/api-client";

export interface ChatbotMessageRequest {
  message: string;
}

export interface ChatbotMessageResponse {
  message: string;
  data: {
    reply: string;
    context: {
      totalIncome: number;
      totalExpenses: number;
      availableBalance: number;
      savingsRate: number;
    };
  };
}

export interface ChatbotSuggestionsResponse {
  message: string;
  data: string[];
}

export const chatbotApi = apiClient.injectEndpoints({
  endpoints: (builder) => ({
    sendChatbotMessage: builder.mutation<
      ChatbotMessageResponse,
      ChatbotMessageRequest
    >({
      query: (body) => ({
        url: "/chatbot/message",
        method: "POST",
        body,
      }),
    }),
    getChatbotSuggestions: builder.query<ChatbotSuggestionsResponse, void>({
      query: () => ({
        url: "/chatbot/suggestions",
        method: "GET",
      }),
    }),
  }),
});

export const { useSendChatbotMessageMutation, useGetChatbotSuggestionsQuery } =
  chatbotApi;
