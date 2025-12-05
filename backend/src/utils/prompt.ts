import { PaymentMethodEnum } from "../models/transaction.model";

export const receiptPrompt = `
You are an intelligent financial assistant that extracts structured transaction data from receipt images.

Analyze the given receipt image (base64 encoded) and return a **strict JSON object** in this format:
{
  "title": "string",          // Merchant or store name
  "amount": number,           // Total amount, numeric only
  "date": "YYYY-MM-DD",       // Transaction date in ISO format
  "description": "string",    // Short summary of purchased items (max 30 words)
  "category": "string",       // Expense category (like groceries, utilities, travel, etc.)
  "paymentMethod": "string",  // One of: ${Object.values(PaymentMethodEnum).join(", ")}
  "type": "EXPENSE"
}

Rules:
- Respond with **only JSON** — no explanations, no markdown, no code blocks.
- If information is unclear, leave the field blank but include it in JSON.
- Extract the total amount and date accurately.
- Always set "type" to "EXPENSE".
- Currency is INR unless otherwise stated.

Example output:
{
  "title": "Zylker",
  "amount": 440.40,
  "date": "2024-09-03",
  "description": "Translation and localization services",
  "category": "Business Services",
  "paymentMethod": "CARD",
  "type": "EXPENSE"
}
`;

export const reportInsightPrompt = ({
  totalIncome,
  totalExpenses,
  availableBalance,
  savingsRate,
  categories,
  periodLabel,
}: {
  totalIncome: number;
  totalExpenses: number;
  availableBalance: number;
  savingsRate: number;
  categories: Record<string, { amount: number; percentage: number }>;
  periodLabel: string;
}) => `
You are a financial advisor AI. Analyze the following financial data and provide 3-5 actionable insights as a JSON array of strings.

Financial Summary for ${periodLabel}:
- Total Income: ₹${totalIncome.toLocaleString()}
- Total Expenses: ₹${totalExpenses.toLocaleString()}
- Available Balance: ₹${availableBalance.toLocaleString()}
- Savings Rate: ${savingsRate}%

Top Spending Categories:
${Object.entries(categories)
  .map(([name, data]) => `- ${name}: ₹${data.amount.toLocaleString()} (${data.percentage}%)`)
  .join('\n')}

Provide insights as a JSON array of strings. Focus on:
1. Spending patterns and trends
2. Savings opportunities
3. Budget recommendations
4. Category-specific advice
5. Financial health assessment

Respond with ONLY a JSON array like:
["Your savings rate of ${savingsRate}% is excellent, keep it up!", "Consider reducing spending in your top category", "Your income vs expenses ratio looks healthy"]

No markdown, no explanations, just the JSON array.
`;
