"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useRouter } from "next/navigation";
import { useFilters } from "../context/FilterContext"; // Imported useFilters

interface ChartData {
  name: string;
  value: number;
  percentage: number;
  fill: string;
}

export function BulkSubmissionChart() {
  const [data, setData] = useState<ChartData[]>([]);
  const router = useRouter();

  // 1. Call it inside the component to get the active query string
  const { queryString } = useFilters();

  useEffect(() => {
    // 2a. Dynamically append the query string to the API URL
    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/charts/bulk-status${queryString ? `?${queryString}` : ""}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => setData(data))
      .catch((err) => console.error("Failed to fetch chart data:", err));
      
  // 2b. Add queryString to the dependency array
  }, [queryString]);

  // FIX 1: We changed 'entry: ChartData' to 'entry: any' to satisfy Recharts' complex event typing
  const handleSliceClick = (entry: any) => {
    if (entry && entry.name) {
      router.push(`/details?status=${entry.name.toLowerCase()}`);
    }
  };

  return (
    // FIX 2: Changed h-[250px] to Tailwind's built-in h-64 (which is 256px) to clear the yellow warning
    <div className="bg-white dark:bg-[#0b1120] border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm h-64 flex flex-col">
      <h2 className="text-gray-900 dark:text-white text-sm font-bold mb-4">Bulk Submission Status</h2>
      
      <div className="flex-1 flex items-center justify-between">
        {/* The Donut Chart */}
        <div className="w-1/2 h-full cursor-pointer">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                outerRadius={80}
                dataKey="value"
                stroke="none"
                onClick={handleSliceClick}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} className="hover:opacity-80 transition-opacity outline-none" />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '8px' }}
                itemStyle={{ color: '#fff' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* The Custom Clickable Legend */}
        <div className="w-1/2 flex flex-col gap-4 pl-4">
          {data.map((item) => (
            <div 
              key={item.name} 
              onClick={() => handleSliceClick(item)}
              className="flex flex-col cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }}></div>
                <span className="text-gray-600 dark:text-gray-400 text-xs group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{item.name}</span>
              </div>
              <div className="ml-5">
                <div className="font-bold text-lg" style={{ color: item.fill }}>{item.value}</div>
                <div className="text-gray-500 text-xs">{item.percentage}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}