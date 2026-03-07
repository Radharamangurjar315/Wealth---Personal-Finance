/**
 * Chatbot Controller
 * -------------------
 * Handles chatbot HTTP requests.
 */

import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middlerware";
import { HTTPSTATUS } from "../config/http.config";
import {
  chatbotService,
  getSuggestedQuestionsService,
} from "../services/chatbot.service";

/**
 * POST /api/chatbot/message
 * Body: { message: string }
 */
export const chatbotMessageController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const userName = req.user?.name || "User";
    const { message } = req.body;

    const result = await chatbotService(userId, userName, message);

    return res.status(HTTPSTATUS.OK).json({
      message: "Chatbot response generated successfully",
      data: result,
    });
  }
);

/**
 * GET /api/chatbot/suggestions
 * Returns a list of suggested quick questions.
 */
export const chatbotSuggestionsController = asyncHandler(
  async (_req: Request, res: Response) => {
    const suggestions = getSuggestedQuestionsService();

    return res.status(HTTPSTATUS.OK).json({
      message: "Suggested questions fetched successfully",
      data: suggestions,
    });
  }
);
