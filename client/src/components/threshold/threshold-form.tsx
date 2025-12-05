import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateThresholdMutation, useGetThresholdQuery } from "@/features/threshold/thresholdAPI";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// Threshold types from backend
const ThresholdTypeEnum = {
  DAILY: "DAILY",
  WEEKLY: "WEEKLY", 
  MONTHLY: "MONTHLY",
} as const;

type ThresholdType = keyof typeof ThresholdTypeEnum;

// Form validation schema
const thresholdSchema = z.object({
  thresholdType: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
  amount: z.number().min(1, "Amount must be greater than 0"),
});

type ThresholdFormData = z.infer<typeof thresholdSchema>;

interface ThresholdFormProps {
  onSuccess?: () => void;
}

const ThresholdForm = ({ onSuccess }: ThresholdFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Get current threshold data
  const { data: currentThreshold } = useGetThresholdQuery(undefined);
  
  // Update threshold mutation
  const [updateThreshold] = useUpdateThresholdMutation();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<ThresholdFormData>({
    resolver: zodResolver(thresholdSchema),
    defaultValues: {
      thresholdType: currentThreshold?.thresholdType || "MONTHLY",
      amount: currentThreshold?.threshold || 0,
    },
  });

  const selectedThresholdType = watch("thresholdType");

  const onSubmit = async (data: ThresholdFormData) => {
    setIsSubmitting(true);
    
    try {
      await updateThreshold({
        thresholdType: data.thresholdType,
        amount: data.amount,
      }).unwrap();
      
      toast.success("Threshold updated successfully!");
      onSuccess?.();
    } catch (error) {
      console.error("Failed to update threshold:", error);
      toast.error("Failed to update threshold. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getThresholdDescription = (type: ThresholdType) => {
    switch (type) {
      case "DAILY":
        return "Set your daily spending limit";
      case "WEEKLY":
        return "Set your weekly spending limit";
      case "MONTHLY":
        return "Set your monthly spending limit";
      default:
        return "";
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-center">
          Set Spending Threshold
        </CardTitle>
        <p className="text-sm text-gray-600 text-center">
          {getThresholdDescription(selectedThresholdType)}
        </p>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Threshold Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="thresholdType">Threshold Period</Label>
            <Select
              value={selectedThresholdType}
              onValueChange={(value: ThresholdType) => setValue("thresholdType", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select threshold period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DAILY">Daily</SelectItem>
                <SelectItem value="WEEKLY">Weekly</SelectItem>
                <SelectItem value="MONTHLY">Monthly</SelectItem>
              </SelectContent>
            </Select>
            {errors.thresholdType && (
              <p className="text-sm text-red-500">{errors.thresholdType.message}</p>
            )}
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="1"
              placeholder="Enter threshold amount"
              {...register("amount", { 
                valueAsNumber: true,
                required: "Amount is required",
              })}
            />
            {errors.amount && (
              <p className="text-sm text-red-500">{errors.amount.message}</p>
            )}
          </div>

          {/* Current Threshold Info */}
          {currentThreshold && currentThreshold.threshold > 0 && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700">
                <span className="font-medium">Current:</span> ₹{currentThreshold.threshold.toLocaleString()} 
                <span className="ml-2 text-blue-600">({currentThreshold.thresholdType})</span>
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => reset()}
              disabled={isSubmitting}
            >
              Reset
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Threshold"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ThresholdForm;