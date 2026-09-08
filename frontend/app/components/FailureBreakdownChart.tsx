"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useRouter } from "next/navigation";
import { useFilters } from "../context/FilterContext"; // 1. Imported useFilters

interface ChartData {
  name: string;
  value: number;
  percentage: number;
  fill: string;
}

export function FailureBreakdownChart() {
  const [data, setData] = useState<ChartData[]>([]);
  const router = useRouter();

  // 2. Call it inside the component to get the active query string
  const { queryString } = useFilters();

  useEffect(() => {
    // 3a. Dynamically append the query string to the API URL
    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/charts/failure-breakdown${queryString ? `?${queryString}` : ""}`;

    fetch(url)
      .then((res) => res.json())
      .then((fetchedData: ChartData[]) => {
        
        // 1. Sanitize Data: Force all blanks, "None", "NaN", and "null" to equal "Unknown"
        const cleanedData = fetchedData.map((d: ChartData) => {
          const rawName = String(d.name).trim();
          const isInvalid = !rawName || rawName === "None" || rawName === "NaN" || rawName === "null" || rawName === "";
          return { ...d, name: isInvalid ? "Unknown" : rawName };
        });

        // 2. Aggregate Duplicates (merging the sanitized Unknowns together)
        const aggregated = cleanedData.reduce((acc: ChartData[], curr: ChartData) => {
          const existing = acc.find((item: ChartData) => item.name === curr.name);
          if (existing) {
            existing.value += curr.value;
            existing.percentage = Number((existing.percentage + curr.percentage).toFixed(1));
          } else {
            acc.push(curr);
          }
          return acc;
        }, []);
        
        // 3. Sort by highest value and assign colors properly
        const colors = ["#6366f1", "#2dd4bf", "#f59e0b", "#ec4899", "#8b5cf6", "#3b82f6", "#14b8a6"];
        const finalData = aggregated
          .sort((a: ChartData, b: ChartData) => b.value - a.value)
          .map((item: ChartData, index: number) => ({
            ...item,
            fill: colors[index % colors.length]
          }));
        
        setData(finalData);
      })
      .catch((err) => console.error("Failed to fetch chart data:", err));
      
  // 3b. Add queryString to the dependency array
  }, [queryString]);

  const handleSliceClick = (entry: any) => {
    if (entry && entry.name) {
      router.push(`/details?reason=${encodeURIComponent(entry.name.toLowerCase())}`);
    }
  };

  return (
    <div className="bg-white dark:bg-[#0b1120] border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm h-64 flex flex-col">
      <h2 className="text-gray-900 dark:text-white text-sm font-bold mb-4">Failure Breakdown</h2>
      
      <div className="flex-1 flex items-center justify-between overflow-hidden">
        {/* The Donut Chart */}
        <div className="w-5/12 h-full cursor-pointer flex items-center justify-center relative left-[-10px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={65}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
                onClick={handleSliceClick}
              >
                {data.map((entry: ChartData, index: number) => (
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
        <div className="w-7/12 flex flex-col gap-2 pl-4 h-full overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
          {data.map((item: ChartData) => (
            <div 
              key={item.name} 
              onClick={() => handleSliceClick(item)}
              className="flex items-center justify-between cursor-pointer group text-xs"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.fill }}></div>
                <span className="text-gray-600 dark:text-[#94a3b8] group-hover:text-gray-900 dark:group-hover:text-white transition-colors truncate text-[13px]" title={item.name}>
                  {item.name}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-gray-900 dark:text-white font-bold text-[13px] w-8 text-right tracking-wide">{item.value}</span>
                <span className="text-gray-500 dark:text-[#64748b] w-12 text-right">({item.percentage}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}