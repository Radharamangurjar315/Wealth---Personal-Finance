// client/src/api/report.ts

import axios from "axios";
const API = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

function authHeader() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type ManualReportRequest = {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
  email?: boolean;
};

export const generateManualReport = async (payload: ManualReportRequest) => {
  const res = await axios.post(`${API}/report/manual`, payload, {
    headers: { "Content-Type": "application/json", ...authHeader() },
  });
  return res.data;
};

export type ReportItem = {
  _id?: string;
  userId?: string;
  sentDate?: string;
  period: string;
  status?: "SENT" | "FAILED" | "NO_ACTIVITY";
  summary?: {
    income: number;
    expenses: number;
    balance: number;
    savingsRate: number;
    topCategories?: { name: string; amount: number; percent: number }[];
  };
  insights?: string[];
};

export const getReports = async (page = 1, pageSize = 10) => {
  const res = await axios.get(`${API}/report/all?page=${page}&pageSize=${pageSize}`, {
    headers: { ...authHeader() },
  });
  return res.data; // assume { reports: ReportItem[], pagination: {...} }
};

export const resendReportEmail = async (reportId: string) => {
  // If backend exposes resend endpoint for a saved report; else implement client-side
  const res = await axios.post(
    `${API}/report/${reportId}/resend`,
    {},
    { headers: { ...authHeader() } }
  );
  return res.data;
};
