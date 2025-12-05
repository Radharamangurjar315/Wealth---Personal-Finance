import { useSummaryAnalyticsQuery } from "@/features/analytics/analyticsAPI";
import SummaryCard from "./summary-card";
import ThresholdCard from "../threshold-card"; // ⬅ IMPORT ADDED
import { DateRangeType } from "@/components/date-range-select";

const DashboardStats = ({ dateRange }: { dateRange?: DateRangeType }) => {
  const { data, isFetching } = useSummaryAnalyticsQuery(
    { preset: dateRange?.value },
    { skip: !dateRange }
  );

  const summaryData = data?.data;

  return (
    <div className="flex flex-row items-center">
      <div className="flex-1 lg:flex-[1] grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* AVAILABLE BALANCE */}
        <SummaryCard
          title="Available Balance"
          value={summaryData?.availableBalance}
          dateRange={dateRange}
          percentageChange={summaryData?.percentageChange?.balance}
          isLoading={isFetching}
          cardType="balance"
        />

        {/* TOTAL INCOME */}
        <SummaryCard
          title="Total Income"
          value={summaryData?.totalIncome}
          percentageChange={summaryData?.percentageChange?.income}
          dateRange={dateRange}
          isLoading={isFetching}
          cardType="income"
        />

        {/* TOTAL EXPENSES */}
        <SummaryCard
          title="Total Expenses"
          value={summaryData?.totalExpenses}
          dateRange={dateRange}
          percentageChange={summaryData?.percentageChange?.expenses}
          isLoading={isFetching}
          cardType="expenses"
        />

        {/* SAVINGS RATE */}
        <SummaryCard
          title="Savings Rate"
          value={summaryData?.savingRate?.percentage}
          expenseRatio={summaryData?.savingRate?.expenseRatio}
          isPercentageValue
          dateRange={dateRange}
          isLoading={isFetching}
          cardType="savings"
        />

        {/* SPENDING THRESHOLD CARD (NEW) */}
        <div className="col-span-1">
          <ThresholdCard />
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;
