"use client";

import { useEffect, useState, useRef } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Layers, CheckCircle2, FlaskConical, TrendingUp, Hourglass } from "lucide-react";
import { useRouter } from "next/navigation";
import { GlobalFilters } from "./components/GlobalFilters";
import { BulkSubmissionChart } from "./components/BulkSubmissionChart";
import { FailureBreakdownChart } from "./components/FailureBreakdownChart";
import { AppSectionChart } from "./components/AppSectionChart";
import { GroupBreakdownChart } from "./components/GroupBreakdownChart";
import { BulkMakeOrderChart } from "./components/BulkMakeOrderChart";
import { SubmissionStatusChart } from "./components/SubmissionStatusChart";
import { ArticleBreakdownChart } from "./components/ArticleBreakdownChart";
import { ColorBreakdownChart } from "./components/ColorBreakdownChart";
import { CorrectionAttemptsChart } from "./components/CorrectionAttemptsChart";
import { TestDurationChart } from "./components/TestDurationChart";
import { useFilters } from "./context/FilterContext";

interface KpiData {
  total_submissions: number;
  passed: number;
  failed: number;
  rft_rate: string;
  pending: number;
}

interface LabRecord {
  id: number;
  lt_test_no: string;
  group_name: string;
  receive_date: string;
  final_result_approve: string;
  ordertype: string;
}

export default function Home() {
  // 1. Get the dynamic query string from our global filter context
  const { queryString } = useFilters(); 

  const [kpis, setKpis] = useState<KpiData>({
    total_submissions: 0,
    passed: 0,
    failed: 0,
    rft_rate: "--%",
    pending: 0,
  });
  
  const [records, setRecords] = useState<LabRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchDashboardData = () => {
    setLoading(true);
    
    // 2. Append the query string to our backend API calls dynamically
    const kpiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/kpis${queryString ? `?${queryString}` : ""}`;
    const recordsUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/records?limit=7${queryString ? `&${queryString}` : ""}`;

    Promise.all([
      fetch(kpiUrl).then(res => res.json()),
      fetch(recordsUrl).then(res => res.json())
    ])
    .then(([kpiData, recordData]) => {
      setKpis(kpiData);
      setRecords(recordData);
      setLoading(false);
    })
    .catch(err => {
      console.error("Failed to fetch dashboard data:", err);
      setLoading(false);
    });
  };

  // 3. Re-run this effect whenever the queryString changes (i.e., a user clicks a filter)
  useEffect(() => {
    fetchDashboardData();
  }, [queryString]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        alert("Data uploaded successfully!");
        fetchDashboardData(); 
      } else {
        const errorData = await response.json();
        alert(`Upload failed: ${errorData.detail}`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("An error occurred during upload.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-slate-950 p-4 md:p-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            Lab Test Analytics
          </h1>
          
          <div className="flex items-center gap-4">
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 rounded-md text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-slate-800 transition-colors"
                aria-label="Toggle Dark Mode"
              >
                {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            )}

            <input 
              type="file" 
              accept=".xlsx, .xls" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className={`text-white px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isUploading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isUploading ? "Uploading..." : "Upload Data"}
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <GlobalFilters />

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div onClick={() => router.push('/details?status=all')} className="bg-white dark:bg-[#0b1120] p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 transition-colors relative overflow-hidden group">
            <h2 className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">Total Submissions</h2>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{loading ? "..." : kpis.total_submissions?.toLocaleString()}</p>
            <div className="absolute top-5 right-5 p-2 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg text-indigo-600 dark:text-indigo-400"><Layers size={20} /></div>
          </div>

          <div onClick={() => router.push('/details?status=passed')} className="bg-white dark:bg-[#0b1120] p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 cursor-pointer hover:border-teal-500 dark:hover:border-teal-500 transition-colors relative overflow-hidden group">
            <h2 className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">Passed</h2>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">{loading ? "..." : kpis.passed?.toLocaleString()}</p>
            <div className="absolute top-5 right-5 p-2 bg-teal-50 dark:bg-teal-950/50 rounded-lg text-teal-600 dark:text-teal-400"><CheckCircle2 size={20} /></div>
          </div>

          <div onClick={() => router.push('/details?status=failed')} className="bg-white dark:bg-[#0b1120] p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 cursor-pointer hover:border-pink-500 dark:hover:border-pink-500 transition-colors relative overflow-hidden group">
            <h2 className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">Failed</h2>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">{loading ? "..." : kpis.failed?.toLocaleString()}</p>
            <div className="absolute top-5 right-5 p-2 bg-pink-50 dark:bg-pink-950/50 rounded-lg text-pink-600 dark:text-pink-400"><FlaskConical size={20} /></div>
          </div>

          <div onClick={() => router.push('/details?status=rft')} className="bg-white dark:bg-[#0b1120] p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 cursor-pointer hover:border-orange-500 dark:hover:border-orange-500 transition-colors relative overflow-hidden group">
            <h2 className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">RFT Rate</h2>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">{loading ? "..." : kpis.rft_rate}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Right First Time</p>
            <div className="absolute top-5 right-5 p-2 bg-orange-50 dark:bg-orange-950/50 rounded-lg text-orange-600 dark:text-orange-400"><TrendingUp size={20} /></div>
          </div>

          <div onClick={() => router.push('/details?status=pending')} className="bg-white dark:bg-[#0b1120] p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 cursor-pointer hover:border-purple-500 dark:hover:border-purple-500 transition-colors relative overflow-hidden group">
            <h2 className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">Pending</h2>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{loading ? "..." : kpis.pending?.toLocaleString()}</p>
            <div className="absolute top-5 right-5 p-2 bg-purple-50 dark:bg-purple-950/50 rounded-lg text-purple-600 dark:text-purple-400"><Hourglass size={20} /></div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <BulkSubmissionChart />
          <FailureBreakdownChart />
          <AppSectionChart />
        </div>
        
        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <GroupBreakdownChart />
          <BulkMakeOrderChart />
          <SubmissionStatusChart />
        </div>
        
        {/* Charts Row 3 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ArticleBreakdownChart />
          <ColorBreakdownChart />
        </div>
        
        {/* Charts Row 4 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <CorrectionAttemptsChart />
          <TestDurationChart />
        </div>

      </div>
    </main>
  );
}