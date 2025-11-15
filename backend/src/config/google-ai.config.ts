import axios from "axios";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("❌ Missing GEMINI_API_KEY in .env file");
}

// Base Gemini endpoint
export const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
export const GEMINI_MODEL = "gemini-1.5-flash";
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Axios instance (reusable)
export const geminiAxios = axios.create({
  baseURL: GEMINI_API_URL,
  params: { key: GEMINI_API_KEY },
  headers: { "Content-Type": "application/json" },
});
