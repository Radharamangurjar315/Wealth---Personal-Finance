import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Settings, Target, TrendingUp, Award } from "lucide-react";
import ThresholdForm from "@/components/threshold/threshold-form";
import { useGetThresholdQuery } from "@/features/threshold/thresholdAPI";

const ThresholdSettings = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: threshold, isLoading } = useGetThresholdQuery(undefined);

  const handleFormSuccess = () => {
    setIsDialogOpen(false);
  };

  const getThresholdStatusColor = () => {
    if (!threshold || threshold.threshold === 0) return "text-gray-500";
    
    const percentage = threshold.percentage || 0;
    if (percentage <= 50) return "text-green-500";
    if (percentage <= 80) return "text-yellow-500";
    return "text-red-500";
  };

  const getRewardPointsColor = () => {
    const points = threshold?.rewardPoints || 0;
    return points >= 0 ? "text-green-600" : "text-red-600";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Target className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold">Threshold Settings</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Threshold Settings</h1>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              {threshold && threshold.threshold > 0 ? "Update Threshold" : "Set Threshold"}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <ThresholdForm onSuccess={handleFormSuccess} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Current Threshold Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Threshold Amount */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Threshold Limit</p>
                <p className="text-lg font-semibold">
                  {threshold && threshold.threshold > 0 
                    ? `₹${threshold.threshold.toLocaleString()}` 
                    : "Not Set"
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Period Type */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Period</p>
                <p className="text-lg font-semibold">
                  {threshold?.thresholdType || "Not Set"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Usage */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Usage</p>
                <p className={`text-lg font-semibold ${getThresholdStatusColor()}`}>
                  {threshold && threshold.threshold > 0 
                    ? `${threshold.percentage || 0}%` 
                    : "0%"
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reward Points */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Award className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Reward Points</p>
                <p className={`text-lg font-semibold ${getRewardPointsColor()}`}>
                  {threshold?.rewardPoints || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Threshold Details */}
      {threshold && threshold.threshold > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Threshold Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Spending Progress</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Spent: ₹{(threshold.spent || 0).toLocaleString()}</span>
                    <span>Limit: ₹{threshold.threshold.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        (threshold.percentage || 0) <= 80 ? 'bg-green-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(threshold.percentage || 0, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-600">
                    {threshold.percentage || 0}% of your {threshold.thresholdType.toLowerCase()} limit used
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-2">Rewards System</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Current Points:</span>
                    <span className={`font-medium ${getRewardPointsColor()}`}>
                      {threshold.rewardPoints || 0}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>• Stay under limit: Earn up to 50 points</p>
                    <p>• Overspend: Lose points proportionally</p>
                    <p>• Points reset with each period</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Threshold Set</h3>
            <p className="text-gray-600 mb-6">
              Set up your spending threshold to track expenses and earn reward points
            </p>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Settings className="w-4 h-4 mr-2" />
                  Set Your First Threshold
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <ThresholdForm onSuccess={handleFormSuccess} />
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}

      {/* Tips Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tips for Setting Thresholds</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium text-blue-600">Daily Thresholds</h4>
              <p className="text-gray-600">
                Best for strict daily budget control. Recommended: ₹200-₹1,000
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-purple-600">Weekly Thresholds</h4>
              <p className="text-gray-600">
                Good for flexible spending with weekly reviews. Recommended: ₹1,500-₹7,000
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-green-600">Monthly Thresholds</h4>
              <p className="text-gray-600">
                Ideal for overall monthly budget planning. Recommended: ₹5,000-₹30,000
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ThresholdSettings;