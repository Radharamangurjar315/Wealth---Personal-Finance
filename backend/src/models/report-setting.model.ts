
import mongoose, {Document, Schema} from "mongoose";


export enum ReportFrequencyEnum {
  MONTHLY = "MONTHLY",
}

export interface ReportSettingDocument extends Document {
  userId: mongoose.Types.ObjectId;
  frequency: keyof typeof ReportFrequencyEnum;
  isEnabled: boolean;
  nextReportDate?: Date;
  lastSentDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const reportSettingSchema = new Schema<ReportSettingDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    frequency: {
      type: String,
      enum: Object.values(ReportFrequencyEnum),
      default: ReportFrequencyEnum.MONTHLY,
    },
    isEnabled: {
      type: Boolean,
      default: false,
    },
    nextReportDate: {
      type: Date,
    },
    lastSentDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const ReportSettingModel = mongoose.model("ReportSetting", reportSettingSchema) as mongoose.Model<ReportSettingDocument>;

export default ReportSettingModel;
