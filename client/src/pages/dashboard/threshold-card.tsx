import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGetThresholdQuery } from "@/features/threshold/thresholdAPI";
import { cn } from "@/lib/utils";
import { Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { PROTECTED_ROUTES } from "@/routes/common/routePath";

const ThresholdCard = () => {
  const { data, isLoading, error } = useGetThresholdQuery(undefined);

  // Backend returns the object directly:
  // { threshold, thresholdType, spent, rewardPoints, percentage }
  const threshold = data;

  return (
    <Card className="!border-none !border-0 !gap-0 !bg-white/5">
      <CardContent className="space-y-5 p-6">
        <h3 className="text-[15px] text-gray-300 font-medium">Spending Threshold</h3>

        {isLoading ? (
          <p className="text-white/50 mt-3">Loading...</p>
        ) : error ? (
          <div className="mt-3">
            <p className="text-red-400 text-sm">Failed to load threshold</p>
            <p className="text-white/60 text-xs mt-1">
              Check your connection and try again
            </p>
          </div>
        ) : !threshold || threshold.threshold === 0 ? (
          <div className="mt-3 space-y-3">
            <div>
              <p className="text-yellow-400 text-sm">No threshold set</p>
              <p className="text-white/60 text-xs mt-1">
                Set up your spending limit to track expenses and earn rewards
              </p>
            </div>
            <Button
              asChild
              size="sm"
              className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
              variant="outline"
            >
              <Link to={PROTECTED_ROUTES.THRESHOLD_SETTINGS}>
                <Settings className="w-4 h-4 mr-2" />
                Set Threshold
              </Link>
            </Button>
          </div>
        ) : (
          <>
            {/* THRESHOLD LIMIT */}
            <div className="text-4xl font-bold text-white">
              ₹{(threshold.threshold ?? 0).toLocaleString()}
            </div>

            <p className="text-sm text-gray-400">
              Type: <span className="text-gray-300 font-medium">{threshold.thresholdType}</span>
            </p>

            {/* SPENT + PERCENTAGE */}
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-300">
                Spent: <span className="text-white font-medium">₹{(threshold.spent ?? 0).toLocaleString()}</span>
              </p>

              <span
                className={cn(
                  "text-sm font-semibold",
                  (threshold.percentage ?? 0) <= 100
                    ? "text-green-400"
                    : "text-red-400"
                )}
              >
                {threshold.percentage ?? 0}% used
              </span>
            </div>

            {/* REWARD POINTS */}
            <div className="p-3 rounded-lg bg-white/10 text-center">
              <p className="text-sm text-gray-300">
                Reward Points:{" "}
                <span
                  className={cn(
                    "font-semibold",
                    (threshold.rewardPoints ?? 0) >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  )}
                >
                  {threshold.rewardPoints ?? 0}
                </span>
              </p>
            </div>

            {/* SETTINGS BUTTON */}
            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Link to={PROTECTED_ROUTES.THRESHOLD_SETTINGS}>
                <Settings className="w-4 h-4 mr-2" />
                Manage Threshold
              </Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ThresholdCard;
