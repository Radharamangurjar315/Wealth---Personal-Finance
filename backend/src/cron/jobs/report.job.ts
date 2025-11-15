import { endOfMonth, format, startOfMonth, subMonths, subDays } from "date-fns";
import cron from "node-cron";
import ReportSettingModel from "../../models/report-setting.model";
import { UserDocument } from "../../models/user.model";
import mongoose from "mongoose";
import { generateReportService } from "../../services/report.service";
import ReportModel, { ReportStatusEnum } from "../../models/report.model";
import { calulateNextReportDate } from "../../utils/helper";
import { sendReportEmail } from "../../mailers/report.mailer";

// 💥 NEW FUNCTION: Scheduled Daily Report Job
export const scheduleDailyReportJob = async () => {
  console.log("🕒 Scheduling Daily Report Job at 11:30 AM...");

  // 💥 This runs every day at 11:30 AM (IST)
  cron.schedule("45 11 * * *", async () => {
    console.log("📆 Running Daily Report Job...");

    const now = new Date();
    let processedCount = 0;
    let failedCount = 0;

    // 💥 For daily report, we take yesterday’s range
    const from = startOfDay(subDays(now, 1)); // yesterday start
    const to = endOfDay(subDays(now, 1));     // yesterday end

    try {
      // Get all users with daily reporting enabled
      const reportSettingCursor = ReportSettingModel.find({
        isEnabled: true,
      })
        .populate<{ userId: UserDocument }>("userId")
        .cursor();

      console.log("📢 Generating and emailing daily reports...");

      // 💥 Process each user’s report
      for await (const setting of reportSettingCursor) {
        const user = setting.userId as UserDocument;
        if (!user) {
          console.log(`⚠️ User not found for setting: ${setting._id}`);
          continue;
        }

        const session = await mongoose.startSession();

        try {
          const report = await generateReportService(user.id, from, to);

          if (!report) {
            console.log(`ℹ️ No transactions for ${user.email} on ${format(from, "PPP")}`);
            continue;
          }

          // 💥 Send report email (Daily)
          let emailSent = false;
          try {
            await sendReportEmail({
              email: user.email!,
              username: user.name!,
              report: {
                period: report.period,
                totalIncome: report.summary.income,
                totalExpenses: report.summary.expenses,
                availableBalance: report.summary.balance,
                savingsRate: report.summary.savingsRate,
                topSpendingCategories: report.summary.topCategories,
                insights: report.insights,
              },
              frequency: "DAILY", // 💥 Changed from monthly
            });
            emailSent = true;
          } catch (error) {
            console.error(`❌ Email failed for ${user.email}:`, error);
          }

          // 💥 Save report record to DB (no nextReportDate logic here)
          await session.withTransaction(async () => {
            await ReportModel.create({
              userId: user.id,
              sentDate: now,
              period: report.period,
              status: emailSent ? ReportStatusEnum.SENT : ReportStatusEnum.FAILED,
              createdAt: now,
              updatedAt: now,
            });
          });

          console.log(`✅ Daily report sent to ${user.email}`);
          processedCount++;
        } catch (error) {
          console.error(`⚠️ Failed to process daily report for ${user.email}`, error);
          failedCount++;
        } finally {
          await session.endSession();
        }
      }

      console.log(`📊 Daily Reports → Sent: ${processedCount}, Failed: ${failedCount}`);
    } catch (error) {
      console.error("🚨 Error processing daily reports:", error);
    }
  });
};
function endOfDay(input: Date | number | string): Date {
  const date = input instanceof Date ? new Date(input.getTime()) : new Date(input);
  date.setHours(23, 59, 59, 999);
  return date;
}
function startOfDay(input: Date | number | string): Date {
  const date = input instanceof Date ? new Date(input.getTime()) : new Date(input);
  date.setHours(0, 0, 0, 0);
  return date;
}

