import { Router } from "express";
import {
  generateReportController,
  getAllReportsController,
  updateReportSettingController,
} from "../controllers/report.controller";
import { generateManualReportController } from "../controllers/manual-report.controller";
import { passportAuthenticateJwt } from "../config/passport.config";


const reportRoutes = Router();

reportRoutes.get("/all", getAllReportsController);
reportRoutes.get("/generate", generateReportController);
reportRoutes.put("/update-setting", updateReportSettingController);


reportRoutes.post("/manual", passportAuthenticateJwt, generateManualReportController);

export default reportRoutes;
