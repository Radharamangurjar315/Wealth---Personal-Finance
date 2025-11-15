import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middlerware";
import { generateReportService } from "../services/report.service";
import ReportModel from "../models/report.model";
import { sendReportEmail } from "../mailers/report.mailer";

export const generateManualReportController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const { from, to, email } = req.body;

    const fromDate = new Date(from);
    const toDate = new Date(to);

    const report = await generateReportService(userId, fromDate, toDate);

    if (!report)
      return res
        .status(200)
        .json({ message: "No transactions found", data: null });

    await ReportModel.create({
      userId,
      sentDate: new Date(),
      period: report.period,
      status: "SENT",
    });

    if (email) {
      await sendReportEmail({
        email: req.user?.email!,
        username: req.user?.name!,
        report: {
          period: report.period,
          totalIncome: report.summary.income,
          totalExpenses: report.summary.expenses,
          availableBalance: report.summary.balance,
          savingsRate: report.summary.savingsRate,
          topSpendingCategories: report.summary.topCategories,
          insights: report.insights,
        },
        frequency: "MANUAL",
      });
    }

    res.status(200).json({
      message: "Report generated",
      data: report,
    });
  }
);
