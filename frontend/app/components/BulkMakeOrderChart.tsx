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

export function BulkMakeOrderChart() {
  const [data, setData] = useState<ChartData[]>([]);
  const router = useRouter();

  // 1. Call it inside the component to get the active query string
  const { queryString } = useFilters();

  useEffect(() => {
    // 2a. Dynamically append the query string to the API URL
    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/charts/bulk-make-order${queryString ? `?${queryString}` : ""}`;
    
    fetch(url)
      .then((res) => res.json())
      .then((data) => setData(data))
      .catch((err) => console.error("Failed to fetch bulk make vs order data:", err));
      
  // 2b. Add queryString to the dependency array
  }, [queryString]);

  const handleSliceClick = (entry: any) => {
    if (entry && entry.name) {
      // Removed .toLowerCase() so it generates "Bulk_Make" instead of "bulk_make"
      const groupParam = entry.name.replace(' ', '_');
      router.push(`/details?group=${encodeURIComponent(groupParam)}`);
    }
  };

  return (
    <div className="bg-white dark:bg-[#0b1120] border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm h-72 flex flex-col">
      <h2 className="text-gray-900 dark:text-white text-sm font-bold mb-4">Bulk Make Vs Bulk Order</h2>
      
      <div className="flex-1 flex items-center justify-between">
        {/* Solid Pie Chart */}
        <div className="w-1/2 h-full cursor-pointer relative left-[-10px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                outerRadius={80}
                dataKey="value"
                stroke="none" // Changed to none for light/dark mode compatibility
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

        {/* Stacked Legend */}
        <div className="w-1/2 flex flex-col gap-5 pl-4 mt-2">
          {data.map((item) => (
            <div 
              key={item.name} 
              onClick={() => handleSliceClick(item)}
              className="flex flex-col cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }}></div>
                <span className="text-gray-600 dark:text-gray-400 text-sm group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{item.name}</span>
              </div>
              <div className="ml-5 mt-1">
                <div className="font-bold text-xl leading-none" style={{ color: item.fill }}>
                  {item.value.toLocaleString()}
                </div>
                <div className="text-gray-500 text-xs mt-1">{item.percentage}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}