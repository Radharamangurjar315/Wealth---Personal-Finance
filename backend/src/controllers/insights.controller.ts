/**
 * Insights Controller
 * --------------------
 * GET /api/insights — returns alerts, recommendations, and financial insights
 *                     for the authenticated user.
 */

import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middlerware";
import { HTTPSTATUS } from "../config/http.config";
import { getInsightsService } from "../services/insights.service";

export const getInsightsController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const data = await getInsightsService(userId);

    return res.status(HTTPSTATUS.OK).json({
      message: "Financial insights generated successfully",
      data,
    });
  }
);
