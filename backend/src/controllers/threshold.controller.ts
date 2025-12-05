import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middlerware";
import ThresholdModel from "../models/threshold.model";
import TransactionModel from "../models/transaction.model";

export const setThresholdController = asyncHandler(
  async (req: Request, res: Response) => {
    const user = req.user!;
    const userId = user._id;

    const { thresholdType, amount } = req.body;

    const threshold = await ThresholdModel.findOneAndUpdate(
      { userId },
      { thresholdType, amount },
      { upsert: true, new: true }
    );

    return res.json({ message: "Threshold updated", data: threshold });
  }
);

export const getThresholdProgress = asyncHandler(
  async (req: Request, res: Response) => {
    const user = req.user!;
    const userId = user._id;

    const threshold = await ThresholdModel.findOne({ userId });
    if (!threshold)
      return res.json({
        threshold: 0,
        thresholdType: "MONTHLY",
        spent: 0,
        rewardPoints: 0,
        percentage: 0,
      });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalSpentAgg = await TransactionModel.aggregate([
      {
        $match: {
          userId,
          type: "EXPENSE",
          date: { $gte: monthStart, $lte: now },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    // Aggregation returns sum of stored amounts (paise). Convert to rupees.
    const totalSpentPaise = totalSpentAgg?.[0]?.total || 0;
    const totalSpent = Number((totalSpentPaise / 100).toFixed(2));

    const percentage = (totalSpent / threshold.amount) * 100;

    res.json({
      threshold: threshold.amount,
      thresholdType: threshold.thresholdType,
      spent: totalSpent,
      rewardPoints: threshold.rewardPoints,
      percentage: Number(percentage.toFixed(2)),
    });
  }
);
