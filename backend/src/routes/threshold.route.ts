import { Router } from "express";
import {
  setThresholdController,
  getThresholdProgress,
} from "../controllers/threshold.controller";
import { passportAuthenticateJwt } from "../config/passport.config";

const router = Router();

router.post("/set", passportAuthenticateJwt, setThresholdController);
router.get("/progress", passportAuthenticateJwt, getThresholdProgress);

export default router;
