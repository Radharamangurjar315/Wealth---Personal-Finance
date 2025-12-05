import { Document } from "mongoose";
import mongoose from "mongoose";

export enum ReportStatusEnum {
  SENT = "SENT",
  PENDING = "PENDING",
  FAILED = "FAILED",
  NO_ACTIVITY = "NO_ACTIVITY",
}

export interface ReportDocument extends Document {
  userId: mongoose.Types.ObjectId;
  period: string;
  sentDate: Date;
  status: keyof typeof ReportStatusEnum;
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    period: {
      type: String,
      required: true,
    },
    sentDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(ReportStatusEnum),
      default: ReportStatusEnum.PENDING,
    },
  } as mongoose.SchemaDefinition<ReportDocument>,
  {
    timestamps: true,
  }
);

const ReportModel = mongoose.model("Report", reportSchema) as mongoose.Model<ReportDocument>;
export default ReportModel;
