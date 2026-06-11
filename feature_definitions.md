# Wealth — Personal Finance Platform: Feature Definitions

---

## 1. Dashboard (Overview)

The **Dashboard** is the central hub of the platform, providing a real-time financial snapshot at a glance. It consists of:

- **Summary Cards** — Four key financial metrics displayed at the top:
  - **Available Balance** — Current income minus expenses, with % change vs previous period
  - **Total Income** — All earnings recorded in the selected date range
  - **Total Expenses** — All spending recorded in the selected date range
  - **Savings Rate** — Percentage of income saved `((income − expenses) / income × 100)`, along with the expense ratio
- **Spending Threshold Card** — A compact card showing your current budget usage percentage, reward points, and threshold type (daily/weekly/monthly)
- **Income vs Expenses Chart** — An interactive bar/line chart showing day-by-day income and expense trends over the selected date range, with income and expense transaction counts
- **Expense Pie Chart** — A breakdown of spending by category (top 3 + others), showing each category's percentage and total amount spent
- **AI Financial Insights** — An intelligent card with three sections:
  - **Alerts** — Budget overruns, unusual spending spikes, low savings rate warnings, and category-specific growth alerts
  - **Recommendations** — AI-enhanced personalized tips (powered by Groq LLaMA 3.1) like "Reduce Food spending by 20% to save ₹X/month"
  - **Key Metrics** — Savings rate, expense growth %, top spending category, and transaction count
- **Recent Transactions** — A quick list of the latest transactions for fast review

**Date Range Selector** — The dashboard supports flexible date ranges: This Month, Last 30 Days, Last 3 Months, This Year, Last Year, All Time, and Custom date range.

---

## 2. Spending Threshold & Reward System

The **Spending Threshold** is a budget control system that helps users set spending limits and earn reward points for staying within them.

### How It Works
- Users set a **spending limit** (e.g., ₹15,000) with a **period type**: Daily, Weekly, or Monthly
- The system tracks total expenses against this limit in real time
- A **progress bar** shows how much of the budget has been used (green ≤80%, red >80%)

### Reward Points System
- Every time a user adds an expense, the system evaluates their position relative to the threshold:
  - **Under limit** → Earn 1–50 points (the more budget remaining, the higher the points)
  - **Over limit** → Lose points proportionally to how far over the limit
- Points are accumulated on the threshold and displayed on both the Dashboard and Threshold Settings page

### Threshold Settings Page
- Displays four overview cards: Threshold Limit (₹), Period Type, Current Usage (%), and Reward Points
- Shows detailed spending progress with a visual progress bar and spent/limit comparison
- Includes tips for setting appropriate thresholds for each period type (Daily: ₹200–₹1,000, Weekly: ₹1,500–₹7,000, Monthly: ₹5,000–₹30,000)

---

## 3. AI Chatbot

The **AI Chatbot** is a conversational financial assistant powered by **Groq LLaMA 3.1** that provides context-aware financial advice.

### Capabilities
- Answers questions about the user's spending patterns, savings, and budget
- Has full access to the user's financial context:
  - Current month and last month summary (income, expenses, savings rate)
  - 3-month averages (average income, expenses, savings)
  - Category breakdowns and top spending categories
  - Savings rate trends (increasing/decreasing/stable)
  - Most/least expensive months
  - Recent 10 transactions
- Provides **suggested questions** to help users get started
- Handles scenarios where current month has no data by falling back to last month + 3-month averages

### Technical Details
- Financial context is cached for 30 minutes per user for performance
- Cache is automatically invalidated when transactions are added, updated, or deleted
- Responses are temperature: 0.7, max 1024 tokens for natural yet focused answers

---

## 4. Financial Insights (AI-Powered Analysis)

The **Financial Insights** module provides automated financial health analysis using a two-layer approach:

### Layer 1: Deterministic Analysis
A rule-based analyzer that generates alerts and recommendations based on:
- **Budget threshold alerts** — Exceeded or approaching budget limit
- **High expense category alerts** — Any category >35% of total expenses
- **Unusual spending alerts** — Expense growth >25% vs last month
- **Low savings alerts** — Savings rate <10%, or dropping >5% vs last month
- **Category spike alerts** — Any top-5 category growing >40% vs last month
- **Recommendations** — Actionable tips like reducing top-category spending by 20%, improving savings rate to 20%, reviewing subscriptions

### Layer 2: AI Enhancement
The deterministic alerts and recommendations are sent to **Groq LLaMA 3.1** for polishing into more natural, personalized language. If the AI fails, the deterministic recommendations are used as a fallback.

---

## 5. Transactions Management

The **Transactions** module is the core data entry and management system.

### Features
- **Add Transaction** — Title, amount, type (Income/Expense), category, date, payment method (Card, Bank Transfer, Mobile Payment, Auto Debit, Cash, Other), optional description
- **Recurring Transactions** — Set transactions to repeat Daily, Weekly, Monthly, or Yearly. The system automatically processes recurring transactions via a daily cron job
- **Receipt Scanner (OCR)** — Upload a receipt image → Tesseract.js extracts text → auto-fills transaction fields (amount, date, description)
- **Bulk Import** — Import up to 300 transactions at once
- **Bulk Delete** — Select and delete multiple transactions simultaneously
- **Duplicate** — Clone an existing transaction with one click
- **Search & Filter** — Search by title/category keyword, filter by type (Income/Expense), filter by recurring status
- **Pagination** — Configurable page size with page navigation
- **Export CSV** — Download all transactions as a CSV file with columns: Date, Title, Type, Category, Amount, Payment Method, Status, Description

---

## 6. Reports

The **Reports** module provides financial summaries and analysis for custom date ranges.

### Manual Report Generation
- Select a **From** and **To** date to generate a financial report
- Report includes:
  - **Summary** — Total Income, Expenses, Balance, Savings Rate
  - **Financial Health Score** (0–100) — Calculated from savings rate, overspending, spending concentration, and income presence
  - **Top 5 Spending Categories** — With amounts and percentage breakdowns
  - **AI Insights** — 3–5 actionable insights generated by Google Gemini AI
- Option to **email the report** to the user's registered email via Resend
- **Download PDF** — Generate a professionally styled A4 PDF report with header, summary stats, category table, insights, and footer

### Automated Monthly Reports
- Users can enable **scheduled monthly reports** via the Report Settings
- A cron job runs on the 1st of every month at 2:30 AM UTC
- Automatically generates a report for the previous month and emails it to the user
- Report history is saved and viewable with pagination

### Report History
- View a paginated list of all past reports (sent date, period, status)
- Report statuses: SENT, PENDING, FAILED, NO_ACTIVITY

---

## 7. Settings

### Account
- View and manage profile information (name, email, profile picture)

### Appearance
- UI theme preferences (placeholder for future dark mode implementation)

### Billing
- Subscription and billing management section

---

## 8. Authentication

- **Register** — Name, email, and password registration with bcrypt password hashing
- **Login** — Email/password authentication returning a JWT access token
- **Session management** — JWT-based authentication via Passport.js, token sent in Authorization header
- Automatic report settings creation on first registration
