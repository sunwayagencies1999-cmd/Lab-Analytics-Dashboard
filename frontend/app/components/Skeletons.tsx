"use client";

// Skeleton for the Bar, Pie, and Area Charts
export function ChartSkeleton({ heightClass = "h-72" }: { heightClass?: string }) {
  return (
    <div className={`bg-white dark:bg-[#0b1120] border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm ${heightClass} flex flex-col animate-pulse`}>
      {/* Title Placeholder */}
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
      {/* Chart Body Placeholder */}
      <div className="flex-1 w-full bg-gray-50 dark:bg-[#1e293b]/50 rounded-lg"></div>
    </div>
  );
}

// Skeleton for the KPI Summary Cards
export function KpiSkeleton() {
  return (
    <div className="bg-white dark:bg-[#0b1120] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col items-center justify-center animate-pulse">
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-12 mb-3"></div>
      <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
    </div>
  );
}