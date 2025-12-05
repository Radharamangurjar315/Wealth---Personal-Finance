import mongoose from "mongoose";

export enum ThresholdTypeEnum {
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",
}

const thresholdSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    thresholdType: {
      type: String,
      enum: Object.values(ThresholdTypeEnum),
      default: ThresholdTypeEnum.MONTHLY,
    },
    amount: { type: Number, required: true },
    rewardPoints: { type: Number, default: 0 },
    lastReset: { type: Date, default: new Date() },
  },
  { timestamps: true }
);

export default mongoose.model("ThresholdSetting", thresholdSchema);
