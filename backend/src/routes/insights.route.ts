/**
 * Insights Routes
 * ----------------
 * GET / — financial alerts, recommendations, and insights
 */

import { Router } from "express";
import { getInsightsController } from "../controllers/insights.controller";

const insightsRoutes = Router();

insightsRoutes.get("/", getInsightsController);

export default insightsRoutes;
