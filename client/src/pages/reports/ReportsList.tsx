// client/src/pages/ReportsList.tsx
import  { useEffect, useState } from "react";
import { getReports, resendReportEmail, ReportItem } from "../../api/report";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ReportsList() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);

  const fetchReports = async (p = 1) => {
    setLoading(true);
    try {
      const res = await getReports(p, pageSize);
      setReports(res.reports || []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err: any) {
      toast.error("Failed to fetch reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleResend = async (id?: string) => {
    if (!id) return;
    try {
      await resendReportEmail(id);
      toast.success("Email re-sent");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to resend");
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Saved Reports</h1>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <div className="space-y-4">
            {reports.length === 0 ? (
              <div className="text-sm text-muted-foreground">No reports found</div>
            ) : (
              reports.map((r) => (
                <div key={r._id} className="border rounded p-4 bg-white shadow-sm flex justify-between items-start">
                  <div>
                    <div className="font-medium">{r.period}</div>
                    <div className="text-sm text-muted-foreground">Status: {r.status}</div>
                    <div className="text-sm mt-2">
                      Income: ₹{r.summary?.income ?? 0} • Expenses: ₹{r.summary?.expenses ?? 0}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleResend(r._id)}>Resend Email</Button>
                    <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(JSON.stringify(r))}>
                      Copy JSON
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-between items-center mt-4">
            <div>
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button disabled={page === 1} onClick={() => setPage((s) => Math.max(1, s - 1))}>Prev</Button>
              <Button disabled={page >= totalPages} onClick={() => setPage((s) => Math.min(totalPages, s + 1))}>Next</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
