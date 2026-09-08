"use client";

import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { useFilters } from "../context/FilterContext"; // 1. Imported useFilters

interface DurationData {
  stats: {
    avg: number;
    median: number;
    min: number;
    max: number;
    total_records: number;
  };
  chart_data: {
    name: string;
    duration: number;
  }[];
}

export function TestDurationChart() {
  const [data, setData] = useState<DurationData | null>(null);

  // 2. Call it inside the component to get the active query string
  const { queryString } = useFilters();

  useEffect(() => {
    // 3a. Dynamically append the query string to the API URL
    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/charts/test-duration${queryString ? `?${queryString}` : ""}`;

    fetch(url)
      .then((res) => res.json())
      .then((fetchedData) => setData(fetchedData))
      .catch((err) => console.error("Failed to fetch test duration data:", err));
      
  // 3b. Add queryString to the dependency array
  }, [queryString]);

  if (!data) {
    return (
      <div className="bg-white dark:bg-[#0b1120] border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm h-80 flex items-center justify-center text-gray-500 dark:text-gray-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#0b1120] border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm h-80 flex flex-col">
      <h2 className="text-gray-900 dark:text-white text-sm font-bold mb-4">Test Duration</h2>
      
      {/* 4 Stats Boxes */}
      <div className="flex gap-4 mb-4">
        <div className="flex-1 bg-gray-50 dark:bg-[#1e293b] rounded-lg p-3 text-center border border-gray-200 dark:border-gray-800 shadow-inner">
          <p className="text-gray-500 dark:text-[#94a3b8] text-xs mb-1">Avg</p>
          <p className="text-gray-900 dark:text-white font-bold">{data.stats.avg}d</p>
        </div>
        <div className="flex-1 bg-gray-50 dark:bg-[#1e293b] rounded-lg p-3 text-center border border-gray-200 dark:border-gray-800 shadow-inner">
          <p className="text-gray-500 dark:text-[#94a3b8] text-xs mb-1">Median</p>
          <p className="text-gray-900 dark:text-white font-bold">{data.stats.median}d</p>
        </div>
        <div className="flex-1 bg-gray-50 dark:bg-[#1e293b] rounded-lg p-3 text-center border border-gray-200 dark:border-gray-800 shadow-inner">
          <p className="text-gray-500 dark:text-[#94a3b8] text-xs mb-1">Min</p>
          <p className="text-gray-900 dark:text-white font-bold">{data.stats.min}d</p>
        </div>
        <div className="flex-1 bg-gray-50 dark:bg-[#1e293b] rounded-lg p-3 text-center border border-gray-200 dark:border-gray-800 shadow-inner">
          <p className="text-gray-500 dark:text-[#94a3b8] text-xs mb-1">Max</p>
          <p className="text-gray-900 dark:text-white font-bold">{data.stats.max}d</p>
        </div>
      </div>

      {/* Area Chart */}
      <div className="flex-1 w-full h-full relative left-[-15px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.chart_data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorDuration" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="name" 
              axisLine={{ stroke: '#334155' }} 
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 10 }}
              minTickGap={30} // Prevents X-axis labels from overlapping on dense charts
            />
            <YAxis 
              axisLine={{ stroke: '#334155' }} 
              tickLine={{ stroke: '#334155' }}
              tick={{ fill: '#64748b', fontSize: 11 }}
              label={{ value: 'No. of Days', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '8px' }}
              itemStyle={{ color: '#fff' }}
              labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
            />
            
            {/* The dashed orange 2-day target line */}
            <ReferenceLine 
              y={2} 
              stroke="#f97316" 
              strokeDasharray="4 4" 
              label={{ position: 'insideBottomRight', value: 'Testing lead time (2 Days)', fill: '#f97316', fontSize: 10 }} 
            />
            
            <Area 
              type="monotone" 
              dataKey="duration" 
              stroke="#6366f1" 
              fillOpacity={1} 
              fill="url(#colorDuration)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      {/* Footer text */}
      <div className="text-center mt-3">
        <p className="text-gray-500 dark:text-[#64748b] text-xs font-medium">{data.stats.total_records} records with valid date range</p>
      </div>
    </div>
  );
}