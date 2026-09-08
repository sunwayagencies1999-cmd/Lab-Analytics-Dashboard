"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useRouter } from "next/navigation";
import { useFilters } from "../context/FilterContext"; // 1. Imported useFilters

interface ChartData {
  name: string;
  value: number;
  fill: string;
}

export function ColorBreakdownChart() {
  const [data, setData] = useState<ChartData[]>([]);
  const router = useRouter();

  // 2. Call it inside the component to get the active query string
  const { queryString } = useFilters();

  useEffect(() => {
    // 3a. Dynamically append the query string to the API URL
    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/charts/color-breakdown${queryString ? `?${queryString}` : ""}`;
    
    fetch(url)
      .then((res) => res.json())
      .then((data) => setData(data))
      .catch((err) => console.error("Failed to fetch color breakdown data:", err));
      
  // 3b. Add queryString to the dependency array
  }, [queryString]);

  const handleBarClick = (entry: any) => {
    if (entry && entry.name) {
      router.push(`/details?color=${encodeURIComponent(entry.name.toLowerCase())}`);
    }
  };

  return (
    <div className="bg-white dark:bg-[#0b1120] border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm h-80 flex flex-col">
      <h2 className="text-gray-900 dark:text-white text-sm font-bold mb-4">Color Breakdown</h2>
      
      <div className="flex-1 w-full h-full cursor-pointer relative left-[-15px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            layout="vertical" 
            margin={{ top: 0, right: 20, left: 20, bottom: 0 }}
          >
            <XAxis 
              type="number" 
              axisLine={{ stroke: '#334155' }} 
              tickLine={{ stroke: '#334155' }}
              tick={{ fill: '#64748b', fontSize: 11 }} 
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={110} // Adjusted width to fit longer color names perfectly
              axisLine={{ stroke: '#334155' }} 
              tickLine={{ stroke: '#334155' }}
              tick={{ fill: '#64748b', fontSize: 11 }}
              interval={0} // Forces every label to render
            />
            <Tooltip 
              cursor={{ fill: '#1e293b', opacity: 0.4 }}
              contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '8px' }}
              itemStyle={{ color: '#fff' }}
            />
            <Bar dataKey="value" onClick={handleBarClick} radius={[0, 4, 4, 0]} barSize={16}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} className="hover:opacity-80 transition-opacity outline-none" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}