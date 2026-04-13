/**
 * Financial Insights Card
 * ------------------------
 * Dashboard component that displays AI-powered alerts, recommendations,
 * and key financial insights.
 */

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetInsightsQuery } from "@/features/insights/insightsAPI";
import {
  AlertTriangle,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  BarChart3,
  ShieldAlert,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Sub-components ───────────────────────────────────────────────────────────

const AlertItem = ({ text }: { text: string }) => (
  <div className="flex items-start gap-2.5 rounded-lg bg-destructive/8 dark:bg-destructive/15 px-3 py-2.5">
    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
    <p className="text-sm leading-snug text-foreground/90">{text}</p>
  </div>
);

const RecommendationItem = ({ text }: { text: string }) => (
  <div className="flex items-start gap-2.5 rounded-lg bg-primary/8 dark:bg-primary/15 px-3 py-2.5">
    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
    <p className="text-sm leading-snug text-foreground/90">{text}</p>
  </div>
);

const InsightBadge = ({
  label,
  value,
  icon: Icon,
  variant = "default",
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  variant?: "default" | "positive" | "negative";
}) => {
  const colors = {
    default: "bg-muted text-muted-foreground",
    positive: "bg-primary/10 text-primary dark:bg-primary/20",
    negative: "bg-destructive/10 text-destructive dark:bg-destructive/20",
  };
  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-3 py-2 ${colors[variant]}`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide opacity-70">
          {label}
        </p>
        <p className="text-sm font-semibold truncate">{value}</p>
      </div>
    </div>
  );
};

// ─── Loading skeleton ─────────────────────────────────────────────────────────

const InsightsSkeleton = () => (
  <Card className="!shadow-none border border-gray-100 dark:border-border">
    <CardHeader>
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-1 h-3.5 w-56" />
    </CardHeader>
    <CardContent className="space-y-3">
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-10 w-full rounded-lg" />
      <div className="grid grid-cols-2 gap-2 pt-2">
        <Skeleton className="h-14 rounded-lg" />
        <Skeleton className="h-14 rounded-lg" />
        <Skeleton className="h-14 rounded-lg" />
        <Skeleton className="h-14 rounded-lg" />
      </div>
    </CardContent>
  </Card>
);

// ─── Main component ───────────────────────────────────────────────────────────

const FinancialInsights = () => {
  const { data, isFetching, refetch } = useGetInsightsQuery(undefined);

  if (isFetching) return <InsightsSkeleton />;

  const alerts = data?.data?.alerts ?? [];
  const recommendations = data?.data?.recommendations ?? [];
  const insights = data?.data?.insights;

  // If there's absolutely no data, show a minimal prompt
  if (!insights || insights.transactionCount === 0) {
    return (
      <Card className="!shadow-none border border-gray-100 dark:border-border">
        <CardHeader>
          <CardTitle className="text-base">Financial Insights</CardTitle>
          <CardDescription>
            Start adding transactions to unlock AI-powered financial insights.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const savingsVariant: "positive" | "negative" | "default" =
    insights.savingsRate >= 20
      ? "positive"
      : insights.savingsRate < 10
        ? "negative"
        : "default";

  const growthVariant: "positive" | "negative" | "default" =
    insights.expenseGrowth <= 0
      ? "positive"
      : insights.expenseGrowth > 25
        ? "negative"
        : "default";

  return (
    <Card className="!shadow-none border border-gray-100 dark:border-border">
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Financial Insights
          </CardTitle>
          <CardDescription className="mt-1">
            AI-powered alerts &amp; personalized recommendations
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => refetch()}
          className="h-8 w-8"
          title="Refresh insights"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* ── Alerts ─────────────────────────────────────────────── */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5" />
              Alerts
            </h4>
            <div className="space-y-1.5">
              {alerts.map((alert, i) => (
                <AlertItem key={i} text={alert} />
              ))}
            </div>
          </div>
        )}

        {/* ── Recommendations ────────────────────────────────────── */}
        {recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Lightbulb className="h-3.5 w-3.5" />
              Recommendations
            </h4>
            <div className="space-y-1.5">
              {recommendations.map((rec, i) => (
                <RecommendationItem key={i} text={rec} />
              ))}
            </div>
          </div>
        )}

        {/* ── Key Metrics ────────────────────────────────────────── */}
        <div className="space-y-2">
          <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <BarChart3 className="h-3.5 w-3.5" />
            Key Metrics
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <InsightBadge
              label="Savings Rate"
              value={`${insights.savingsRate}%`}
              icon={PiggyBank}
              variant={savingsVariant}
            />
            <InsightBadge
              label="Expense Growth"
              value={`${insights.expenseGrowth > 0 ? "+" : ""}${insights.expenseGrowth}%`}
              icon={
                insights.expenseGrowth > 0 ? TrendingUp : TrendingDown
              }
              variant={growthVariant}
            />
            <InsightBadge
              label="Top Category"
              value={`${insights.topCategory} (${insights.topCategoryPercentage}%)`}
              icon={BarChart3}
            />
            <InsightBadge
              label="Transactions"
              value={`${insights.transactionCount}`}
              icon={BarChart3}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FinancialInsights;
