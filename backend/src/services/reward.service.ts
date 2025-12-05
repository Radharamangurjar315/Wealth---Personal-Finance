import ThresholdModel, { ThresholdTypeEnum } from "../models/threshold.model";
import TransactionModel from "../models/transaction.model";
import { startOfDay, startOfWeek, startOfMonth } from "date-fns";

interface RewardResult {
    spent: number;
    points: number;
}

interface ThresholdSettings {
    userId: string;
    thresholdType: ThresholdTypeEnum;
    amount: number;
    rewardPoints: number;
    save: () => Promise<this>;
}

interface AggResult {
    _id: null;
    total: number;
}

export const evaluateRewards = async (
    userId: string,
    amount: number,
    date: Date
): Promise<RewardResult | void> => {
    const settings = (await ThresholdModel.findOne({ userId })) as ThresholdSettings | null;
    if (!settings) return; // threshold not set → no reward logic

    let start = new Date();
    if (settings.thresholdType === ThresholdTypeEnum.DAILY) start = startOfDay(start);
    if (settings.thresholdType === ThresholdTypeEnum.WEEKLY) start = startOfWeek(start, { weekStartsOn: 1 });
    if (settings.thresholdType === ThresholdTypeEnum.MONTHLY) start = startOfMonth(start);

    const agg: AggResult[] = await TransactionModel.aggregate([
        { $match: { userId, type: "EXPENSE", date: { $gte: start } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    // Aggregation sum is in paise (stored value). Convert to rupees.
    const spentPaise = agg[0]?.total || 0;
    const spent = Number((spentPaise / 100).toFixed(2));
    const limit = settings.amount;

    let points = 0;

    // Defensive: if limit is invalid, don't assign points
    if (!limit || limit <= 0) {
        points = 0;
    } else {
        const MAX_POINTS = 50;

        // `amount` is the current transaction amount (in rupees) passed by caller.
        // Compute previous spent before this transaction so we can base reward
        // on how this particular expense affects closeness to the threshold.
        const previousSpent = Math.max(0, Number((spent - amount).toFixed(2)));

        // If overall spent (after this tx) is within limit → award positive points
        if (spent <= limit) {
            // The closer the spent is to 0 (i.e., the more remaining budget),
            // the higher the points. Use spent/limit ratio to scale.
            const ratio = spent / limit; // 0..1
            points = Math.max(1, Math.round(MAX_POINTS * (1 - ratio)));
        } else {
            // Overspent: apply penalty proportional to how far over the limit.
            const overRatio = (spent - limit) / limit; // e.g. 0.1 = 10% over
            points = -Math.min(MAX_POINTS, Math.round(MAX_POINTS * overRatio));
        }
    }

    settings.rewardPoints += points;
    await settings.save();

    return { spent, points };
};
