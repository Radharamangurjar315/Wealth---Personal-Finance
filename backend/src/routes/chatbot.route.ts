/**
 * Chatbot Routes
 * ---------------
 * POST /message   — send a user message, get AI reply
 * GET  /suggestions — get suggested quick questions
 */

import { Router } from "express";
import {
  chatbotMessageController,
  chatbotSuggestionsController,
} from "../controllers/chatbot.controller";

const chatbotRoutes = Router();

chatbotRoutes.post("/message", chatbotMessageController);
chatbotRoutes.get("/suggestions", chatbotSuggestionsController);

export default chatbotRoutes;
