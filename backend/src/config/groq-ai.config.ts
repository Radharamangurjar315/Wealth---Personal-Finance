/**
 * Groq AI Configuration
 * ----------------------
 * Initialises the Groq client used by the chatbot service.
 * Model: llama-3.1-8b-instant (free tier, high rate-limit)
 */

import Groq from "groq-sdk";
import { Env } from "./env.config";

if (!Env.GROQ_API_KEY) {
  console.warn("⚠️  Missing GROQ_API_KEY in .env file — chatbot will not work.");
}

export const groqClient = new Groq({
  apiKey: Env.GROQ_API_KEY,
});

export const GROQ_CHATBOT_MODEL = "llama-3.1-8b-instant";
