"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Search, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useFilters } from "../context/FilterContext";

function DetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { queryString } = useFilters();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Table States
  const [searchPo, setSearchPo] = useState("");
  const [page, setPage] = useState(1);
  const limit = 100;

  // Extract URL parameters to know what was clicked
  const status = searchParams.get("status");
  const section = searchParams.get("section");
  const group = searchParams.get("group");
  const article = searchParams.get("article");
  const color = searchParams.get("color");
  const attempt = searchParams.get("attempt");
  const reason = searchParams.get("reason");

  // Generate dynamic title based on the clicked parameter
  const getPageTitle = () => {
    if (status) return `${status.charAt(0).toUpperCase() + status.slice(1)} Records`;
    if (section) return `Section: ${section.toUpperCase()} Records`;
    if (group) return `Group: ${group.replace('_', ' ')} Records`;
    if (article) return `Article: ${article.toUpperCase()}`;
    if (color) return `Color: ${color.toUpperCase()}`;
    if (attempt) return `${attempt.charAt(0).toUpperCase() + attempt.slice(1)} Records`;
    if (reason) return `Failure Reason: ${reason}`;
    return "All Records";
  };

  useEffect(() => {
    setLoading(true);
    // Build the specific drill-down parameters
    const drillParams = new URLSearchParams();
    if (status) drillParams.append("status", status);
    if (section) drillParams.append("section", section);
    if (group) drillParams.append("group", group);
    if (article) drillParams.append("article", article);
    if (color) drillParams.append("color", color);
    if (attempt) drillParams.append("attempt", attempt);
    if (reason) drillParams.append("reason", reason);
    if (searchPo) drillParams.append("search", searchPo);
    drillParams.append("page", page.toString());
    drillParams.append("limit", limit.toString());

    // Combine global filters with specific page filters
    const finalQueryString = [queryString, drillParams.toString()].filter(Boolean).join("&");
    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/details-table?${finalQueryString}`;

    fetch(url)
      .then((res) => res.json())
      .then((fetchedData) => {
        setData(fetchedData);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch details data:", err);
        setLoading(false);
      });
  }, [queryString, searchParams, page, searchPo]);

  // Handle Search Input (reset to page 1 on new search)
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchPo(e.target.value);
    setPage(1); 
  };

  // Pass the format (csv or pdf) to the function
  const handleExport = (format: 'csv' | 'pdf') => {
    const drillParams = new URLSearchParams();
    if (status) drillParams.append("status", status);
    if (section) drillParams.append("section", section);
    if (group) drillParams.append("group", group);
    if (article) drillParams.append("article", article);
    if (color) drillParams.append("color", color);
    if (attempt) drillParams.append("attempt", attempt);
    if (reason) drillParams.append("reason", reason);
    if (searchPo) drillParams.append("search", searchPo);

    // Set the format requested
    drillParams.append("format", format);

    // Create a safe filename from the dynamic page title (e.g., "Group_Order_Records")
    const rawTitle = getPageTitle();
    const safeFilename = rawTitle.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_");
    drillParams.append("filename", safeFilename);

    const finalQueryString = [queryString, drillParams.toString()].filter(Boolean).join("&");
    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/export?${finalQueryString}`;
    
    window.open(url, '_blank');
  };

  // Helper to format dates
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toISOString().split("T")[0]; // YYYY-MM-DD
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-[#020617] p-4 md:p-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        
        {/* Top Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <button 
              onClick={() => router.push('/')}
              className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mr-4 group"
            >
              <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium">Back</span>
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {getPageTitle()}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {data ? data.summary.total.toLocaleString() : "..."} records
              </p>
            </div>
          </div>
          
          {/* Export Buttons */}
          <div className="flex gap-2">
            <button 
              onClick={() => handleExport('csv')}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <Download size={16} />
              <span className="hidden sm:inline">CSV</span>
            </button>
            <button 
              onClick={() => handleExport('pdf')}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <Download size={16} />
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        </div>

        {/* 3 Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-[#0b1120] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col items-center justify-center">
            <span className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">Total</span>
            <span className="text-3xl font-bold text-gray-900 dark:text-white">{data ? data.summary.total.toLocaleString() : "..."}</span>
          </div>
          <div className="bg-white dark:bg-[#0b1120] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col items-center justify-center">
            <span className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">Pass</span>
            <span className="text-3xl font-bold text-green-600 dark:text-green-500">{data ? data.summary.pass.toLocaleString() : "..."}</span>
          </div>
          <div className="bg-white dark:bg-[#0b1120] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col items-center justify-center">
            <span className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">Fail</span>
            <span className="text-3xl font-bold text-red-500 dark:text-red-500">{data ? data.summary.fail.toLocaleString() : "..."}</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white dark:bg-[#0b1120] border border-gray-200 dark:border-gray-800 rounded-xl p-4 mb-6 flex items-center shadow-sm">
          <span className="text-gray-500 dark:text-gray-400 text-sm font-medium mr-4">Filters:</span>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="PO Number..." 
              value={searchPo}
              onChange={handleSearch}
              className="w-full bg-gray-50 dark:bg-[#1e293b] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Main Data Table */}
        <div className="bg-white dark:bg-[#0b1120] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
          
          {/* Table Header Row */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-[#0b1120]">
            <h2 className="font-bold text-gray-900 dark:text-white">Records</h2>
            {data && data.summary.total > 0 && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Showing {(page - 1) * limit + 1}–{Math.min(page * limit, data.summary.total)} of {data.summary.total.toLocaleString()}
              </span>
            )}
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#1e293b]/50 text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">Test No.</th>
                  <th className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">Result</th>
                  <th className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">PO Number</th>
                  <th className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">Article</th>
                  <th className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">Brand</th>
                  <th className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">Color</th>
                  <th className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">Group</th>
                  <th className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">Section</th>
                  <th className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 min-w-[100px]">Test Date</th>
                  <th className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 max-w-xs">Comment</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">Loading records...</td>
                  </tr>
                ) : data && data.records.length > 0 ? (
                  data.records.map((record: any, idx: number) => (
                    <tr key={idx} className="border-b border-gray-100 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-[#1e293b]/30 transition-colors text-gray-700 dark:text-gray-300">
                      <td className="px-6 py-3">{record.lt_test_no || "-"}</td>
                      <td className="px-6 py-3">
                        {record.final_result_approve === 'Pass' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-500/10 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-500/20">
                            Pass
                          </span>
                        ) : record.final_result_approve === 'Fail' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-500/10 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-500/20">
                            Fail
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3">{record.salespo || "-"}</td>
                      <td className="px-6 py-3">{record.article_id || "-"}</td>
                      <td className="px-6 py-3">{record.brandid || "-"}</td>
                      <td className="px-6 py-3">{record.color_name || "-"}</td>
                      <td className="px-6 py-3">{record.group_name || "-"}</td>
                      <td className="px-6 py-3">{record.app_section || "-"}</td>
                      <td className="px-6 py-3">{formatDate(record.labtest_date)}</td>
                      <td className="px-6 py-3 max-w-xs truncate" title={record.lt_result_comment || ""}>
                        {record.lt_result_comment || "-"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">No records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && data.pagination.total_pages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-[#0b1120]">
              <button 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1e293b] border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} className="mr-1" /> Previous
              </button>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Page <span className="font-semibold">{page}</span> of <span className="font-semibold">{data.pagination.total_pages}</span>
                </span>
              </div>

              <button 
                disabled={page === data.pagination.total_pages}
                onClick={() => setPage(p => p + 1)}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1e293b] border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next <ChevronRight size={16} className="ml-1" />
              </button>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}

// Suspense wrapper required by Next.js when using useSearchParams()
export default function DetailsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-[#020617] p-8 text-white">Loading details...</div>}>
      <DetailsContent />
    </Suspense>
  );
}