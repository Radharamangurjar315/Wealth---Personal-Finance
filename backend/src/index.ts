import "dotenv/config";
import "./config/passport.config";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import passport from "passport";
import { Env } from "./config/env.config";
import { HTTPSTATUS } from "./config/http.config";
import { errorHandler } from "./middlewares/errorHandler.middleware";
import { asyncHandler } from "./middlewares/asyncHandler.middlerware";
import connctDatabase from "./config/database.config";
import authRoutes from "./routes/auth.route";
import { passportAuthenticateJwt } from "./config/passport.config";
import userRoutes from "./routes/user.route";
import transactionRoutes from "./routes/transaction.route";
import { initializeCrons } from "./cron";
import reportRoutes from "./routes/report.route";
import analyticsRoutes from "./routes/analytics.route";
import thresholdRoutes from "./routes/threshold.route";
import chatbotRoutes from "./routes/chatbot.route";
import insightsRoutes from "./routes/insights.route";

console.log(
  "GEMINI_API_KEY:",
  process.env.GEMINI_API_KEY ? "Loaded " : " Missing"
);

const app = express();
const BASE_PATH = Env.BASE_PATH;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(passport.initialize());

app.use(
  cors({
    origin: Env.FRONTEND_ORIGIN,
    credentials: true,
  })
);
 


app.get("/", (_req: Request, res: Response) => {
  res.status(HTTPSTATUS.OK).json({
    message: "Wealth Personal Finance API is running ",
    version: "1.0.0",
  });
});

/**
 * Health check route for Render / load balancers
 */
app.get("/health", (_req: Request, res: Response) => {
  res.status(HTTPSTATUS.OK).json({ status: "ok" });
});

app.use(`${BASE_PATH}/auth`, authRoutes);
app.use(`${BASE_PATH}/user`, passportAuthenticateJwt, userRoutes);
app.use(`${BASE_PATH}/transaction`, passportAuthenticateJwt, transactionRoutes);
app.use(`${BASE_PATH}/report`, passportAuthenticateJwt, reportRoutes);
app.use(`${BASE_PATH}/analytics`, passportAuthenticateJwt, analyticsRoutes);
app.use(`${BASE_PATH}/threshold`, passportAuthenticateJwt, thresholdRoutes);
app.use(`${BASE_PATH}/chatbot`, passportAuthenticateJwt, chatbotRoutes);
app.use(`${BASE_PATH}/insights`, passportAuthenticateJwt, insightsRoutes);

app.use(errorHandler);

app.listen(Env.PORT, async () => {
  await connctDatabase();

  if (Env.NODE_ENV === "development") {
    await initializeCrons();
  }

  console.log(
    `Server is running on port ${Env.PORT} in ${Env.NODE_ENV} mode`
  );
  console.log(
    " Gemini Key (from process.env):",
    process.env.GEMINI_API_KEY ? "Loaded " : " Missing"
  );
});
