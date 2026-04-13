/**
 * Insights Analyzer
 * ------------------
 * Pure deterministic financial analysis — no AI calls.
 * Takes raw financial numbers and produces structured alerts, insights,
 * and draft recommendations that can optionally be polished by an LLM.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CategorySpending {
  name: string;
  amount: number;           // in rupees
  percentage: number;       // % of total expenses
}

export interface FinancialData {
  totalIncome: number;
  totalExpenses: number;
  availableBalance: number;
  savingsRate: number;      // %
  expenseRatio: number;     // %
  transactionCount: number;
  categoryBreakdown: CategorySpending[];
  // Previous-month equivalents (for comparison)
  prevTotalIncome: number;
  prevTotalExpenses: number;
  prevSavingsRate: number;
  prevCategoryBreakdown: CategorySpending[];
  // Budget threshold (if set)
  budgetThreshold: number | null;
}

export interface InsightsAnalysisResult {
  alerts: string[];
  recommendations: string[];
  insights: {
    totalIncome: number;
    totalExpenses: number;
    availableBalance: number;
    savingsRate: number;
    topCategory: string;
    topCategoryPercentage: number;
    expenseGrowth: number;       // % change vs last month
    incomeGrowth: number;        // % change vs last month
    transactionCount: number;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const pctChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
};

// ─── Analyzer ─────────────────────────────────────────────────────────────────

export const analyzeFinancialData = (data: FinancialData): InsightsAnalysisResult => {
  const alerts: string[] = [];
  const recommendations: string[] = [];

  const {
    totalIncome,
    totalExpenses,
    availableBalance,
    savingsRate,
    categoryBreakdown,
    prevTotalIncome,
    prevTotalExpenses,
    prevSavingsRate,
    prevCategoryBreakdown,
    budgetThreshold,
    transactionCount,
  } = data;

  const expenseGrowth = pctChange(totalExpenses, prevTotalExpenses);
  const incomeGrowth  = pctChange(totalIncome, prevTotalIncome);

  // Determine top category
  const topCat = categoryBreakdown.length > 0
    ? categoryBreakdown[0]
    : { name: "N/A", amount: 0, percentage: 0 };

  // ── 1. Budget Threshold Alerts ──────────────────────────────────────────────

  if (budgetThreshold && budgetThreshold > 0) {
    const usagePercent = (totalExpenses / budgetThreshold) * 100;

    if (usagePercent > 100) {
      alerts.push(
        `You have exceeded your monthly budget of ${fmt(budgetThreshold)} by ${fmt(totalExpenses - budgetThreshold)}.`
      );
    } else if (usagePercent >= 80) {
      alerts.push(
        `You have used ${usagePercent.toFixed(0)}% of your monthly budget (${fmt(budgetThreshold)}). Consider slowing down spending.`
      );
    }
  }

  // ── 2. High Expense Category Alert ──────────────────────────────────────────

  if (topCat.percentage >= 35) {
    alerts.push(
      `${topCat.name} accounts for ${topCat.percentage.toFixed(0)}% of your total expenses this month (${fmt(topCat.amount)}).`
    );
  }

  // ── 3. Unusual Spending Alert (expense growth) ─────────────────────────────

  if (expenseGrowth > 25 && prevTotalExpenses > 0) {
    alerts.push(
      `Your expenses increased by ${expenseGrowth}% compared to last month.`
    );
  }

  // ── 4. Low Savings Alert ────────────────────────────────────────────────────

  if (totalIncome > 0 && savingsRate < 10) {
    alerts.push(
      `Your savings rate is only ${savingsRate.toFixed(1)}%. Aim for at least 20% for financial stability.`
    );
  }

  if (prevSavingsRate > 0 && savingsRate < prevSavingsRate) {
    const drop = Number((prevSavingsRate - savingsRate).toFixed(1));
    if (drop >= 5) {
      alerts.push(
        `Your savings rate dropped by ${drop}% compared to last month (${prevSavingsRate.toFixed(1)}% → ${savingsRate.toFixed(1)}%).`
      );
    }
  }

  // ── 5. Category-specific spike alerts ───────────────────────────────────────

  const prevCatMap = new Map(prevCategoryBreakdown.map((c) => [c.name, c.amount]));
  for (const cat of categoryBreakdown.slice(0, 5)) {
    const prev = prevCatMap.get(cat.name) ?? 0;
    if (prev > 0) {
      const catGrowth = pctChange(cat.amount, prev);
      if (catGrowth >= 40) {
        alerts.push(
          `${cat.name} spending jumped ${catGrowth}% vs last month (${fmt(prev)} → ${fmt(cat.amount)}).`
        );
      }
    }
  }

  // ── Recommendations ─────────────────────────────────────────────────────────

  // a) Top-category reduction
  if (topCat.percentage >= 25 && topCat.amount > 0) {
    const reduction20 = topCat.amount * 0.2;
    recommendations.push(
      `Reducing ${topCat.name} spending by 20% could save you ~${fmt(reduction20)} per month.`
    );
  }

  // b) Savings rate improvement
  if (totalIncome > 0 && savingsRate < 20) {
    const target = 20;
    const extraSavingsNeeded = (target / 100) * totalIncome - (savingsRate / 100) * totalIncome;
    if (extraSavingsNeeded > 0) {
      recommendations.push(
        `Increasing your savings rate from ${savingsRate.toFixed(0)}% to ${target}% means saving an extra ${fmt(extraSavingsNeeded)} monthly.`
      );
    }
  }

  // c) Expense growth warning
  if (expenseGrowth > 15 && prevTotalExpenses > 0) {
    recommendations.push(
      `Your expenses grew ${expenseGrowth}% this month. Review recurring subscriptions and discretionary purchases.`
    );
  }

  // d) Income-based advice
  if (incomeGrowth < 0 && prevTotalIncome > 0) {
    recommendations.push(
      `Your income decreased by ${Math.abs(incomeGrowth)}% this month. Consider tightening non-essential spending.`
    );
  }

  // e) Category-specific tips (second-biggest category)
  if (categoryBreakdown.length >= 2) {
    const second = categoryBreakdown[1];
    if (second.percentage >= 15) {
      recommendations.push(
        `${second.name} is your second-largest expense at ${second.percentage.toFixed(0)}%. Small cutbacks here can compound over time.`
      );
    }
  }

  // Ensure at least one recommendation
  if (recommendations.length === 0 && totalIncome > 0) {
    recommendations.push(
      `You're managing your finances well! Keep maintaining your current savings rate of ${savingsRate.toFixed(0)}%.`
    );
  }

  return {
    alerts,
    recommendations,
    insights: {
      totalIncome,
      totalExpenses,
      availableBalance,
      savingsRate: Number(savingsRate.toFixed(1)),
      topCategory: topCat.name,
      topCategoryPercentage: Number(topCat.percentage.toFixed(1)),
      expenseGrowth,
      incomeGrowth,
      transactionCount,
    },
  };
};
