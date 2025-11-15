// client/src/pages/ManualReport.tsx
import  { useState } from "react";
import { generateManualReport } from "../../api/report";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export default function ManualReport() {
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [email, setEmail] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any | null>(null);

  const handleGenerate = async () => {
    if (!from || !to) {
      toast.error("Select both from and to dates");
      return;
    }
    setLoading(true);
    setReport(null);
    try {
      const payload = { from, to, email };
      const res = await generateManualReport(payload);
      setReport(res.data);
      toast.success(res.message || "Report generated");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Generate Manual Report</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">From</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">To</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>

        <div className="flex flex-col justify-end">
          <div className="flex items-center justify-between">
            <span className="text-sm">Send to Email?</span>
            <Switch checked={email} onCheckedChange={setEmail} />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={handleGenerate} disabled={loading} className="px-6">
          {loading ? "Generating..." : "Generate Report"}
        </Button>
        <Button variant="ghost" onClick={() => { setFrom(""); setTo(""); setReport(null); setEmail(false); }}>
          Reset
        </Button>
      </div>

      {report && (
        <div className="border rounded p-4 bg-white shadow-sm">
          <h2 className="text-lg font-semibold mb-2">Report Preview</h2>
          <p className="text-sm text-muted-foreground mb-2"><strong>Period:</strong> {report.period}</p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="p-3 bg-gray-50 rounded">
              <div className="text-sm text-muted-foreground">Income</div>
              <div className="text-xl font-bold">₹ {report.summary.income}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <div className="text-sm text-muted-foreground">Expenses</div>
              <div className="text-xl font-bold">₹ {report.summary.expenses}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <div className="text-sm text-muted-foreground">Balance</div>
              <div className="text-xl font-bold">₹ {report.summary.balance}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <div className="text-sm text-muted-foreground">Savings Rate</div>
              <div className="text-xl font-bold">{report.summary.savingsRate}%</div>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="font-medium">Top Categories</h3>
            <ul className="list-disc ml-5">
              {report.summary.topCategories?.length ? (
                report.summary.topCategories.map((c: any) => (
                  <li key={c.name}>
                    {c.name} — ₹{c.amount} ({c.percent}%)
                  </li>
                ))
              ) : (
                <li>No top categories</li>
              )}
            </ul>
          </div>

          <div className="mt-4">
            <h3 className="font-medium">Insights</h3>
            <ul className="list-disc ml-5">
              {report.insights?.length ? report.insights.map((i: string, idx: number) => <li key={idx}>{i}</li>) : <li>No insights</li>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
