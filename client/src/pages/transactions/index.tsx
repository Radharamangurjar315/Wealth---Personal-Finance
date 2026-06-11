import { useState } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import PageLayout from "@/components/page-layout";
import AddTransactionDrawer from "@/components/transaction/add-transaction-drawer";
import TransactionTable from "@/components/transaction/transaction-table";
import ImportTransactionModal from "@/components/transaction/import-transaction-modal";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

function getAuthToken() {
  const persistRoot = localStorage.getItem("persist:root");
  if (!persistRoot) return null;
  const parsedRoot = JSON.parse(persistRoot);
  if (!parsedRoot.auth) return null;
  const authData = JSON.parse(parsedRoot.auth);
  return authData?.accessToken || null;
}

export default function Transactions() {
  const [csvLoading, setCsvLoading] = useState(false);

  const handleExportCsv = async () => {
    setCsvLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`${API}/transaction/export-csv`, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        throw new Error("Failed to export CSV");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transactions_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("CSV exported successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to export CSV");
    } finally {
      setCsvLoading(false);
    }
  };

  return (
    <PageLayout
      title="All Transactions"
      subtitle="Showing all transactions"
      addMarginTop
      rightAction={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={csvLoading}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {csvLoading ? "Exporting..." : "Export CSV"}
          </Button>
          <ImportTransactionModal />
          <AddTransactionDrawer />
        </div>
      }
    >
      <Card className="border-0 shadow-none">
        <CardContent className="pt-2">
          <TransactionTable pageSize={20} />
        </CardContent>
      </Card>
    </PageLayout>
  );
}
