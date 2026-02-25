export type ReportType = {
  period: string;
  summary: {
    income: number;
    expenses: number;
    balance: number;
    savingsRate: number;
    healthScore: number;
    topCategories: {
      name: string;
      amount: number;
      percent: number;
    }[];
  };
  insights: string[];
};
