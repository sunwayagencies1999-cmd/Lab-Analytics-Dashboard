"use client";

import { useEffect, useState, useRef } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { useFilters } from "../context/FilterContext";

// --- Custom Multi-Select Component ---
function MultiSelect({ label, options, selected, onChange }: { label: string, options: any[], selected: string[], onChange: (val: string[]) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectAll = () => {
    if (selected.length === options.length) onChange([]);
    else onChange(options.map((o) => o.value || o));
  };

  const handleToggle = (val: string) => {
    if (selected.includes(val)) onChange(selected.filter((item) => item !== val));
    else onChange([...selected, val]);
  };

  const displayValue = selected.length === 0 ? label : selected.length === 1 ? (options.find((o) => (o.value || o) === selected[0])?.label || selected[0]) : `${selected.length} selected`;

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-36 px-4 py-2 text-sm text-left bg-white dark:bg-[#0b1120] border border-gray-300 dark:border-gray-700 rounded-full cursor-pointer hover:border-teal-500 dark:hover:border-teal-500 transition-colors shadow-sm dark:shadow-none"
      >
        <span className="truncate text-gray-700 dark:text-gray-200">{displayValue}</span>
        <ChevronDown size={14} className="text-gray-500 dark:text-gray-400 ml-2 shrink-0" />
      </div>
      
      {isOpen && (
        <div className="absolute z-50 w-48 mt-2 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-60 overflow-y-auto p-2 scrollbar-thin">
          <label className="flex items-center gap-3 px-2 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <input type="checkbox" checked={selected.length === options.length && options.length > 0} onChange={handleSelectAll} className="accent-teal-500 w-4 h-4 cursor-pointer" />
            <span className="text-sm text-gray-900 dark:text-white font-medium">Select All</span>
          </label>
          <div className="h-px bg-gray-200 dark:bg-gray-700 my-1 mx-2"></div>
          {options.map((opt) => {
            const val = String(opt.value || opt);
            const lbl = String(opt.label || opt);
            return (
              <label key={val} className="flex items-center gap-3 px-2 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                <input type="checkbox" checked={selected.includes(val)} onChange={() => handleToggle(val)} className="accent-teal-500 w-4 h-4 cursor-pointer" />
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{lbl}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- Main Filter Bar ---
export function GlobalFilters() {
  const { filters, setFilter, resetFilters } = useFilters();
  const [options, setOptions] = useState<any>({ years: [], months: [], groups: [], sections: [], brands: [], customers: [], test_nos: [], po_numbers: [], results: [] });

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/filter-options`)
      .then((res) => res.json())
      .then((data) => setOptions(data))
      .catch((err) => console.error("Failed to load filter options:", err));
  }, []);

  return (
    <div className="bg-white dark:bg-[#0b1120] border border-gray-200 dark:border-gray-800 rounded-xl p-4 mb-8 flex flex-wrap items-center gap-3 shadow-sm">
      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mr-2">
        <Calendar size={18} />
        <span className="text-sm font-medium">Filters</span>
      </div>

      <MultiSelect label="All Years" options={options.years} selected={filters.year} onChange={(val) => setFilter("year", val)} />
      <MultiSelect label="All Months" options={options.months} selected={filters.month} onChange={(val) => setFilter("month", val)} />
      <MultiSelect label="All Groups" options={options.groups} selected={filters.group} onChange={(val) => setFilter("group", val)} />
      <MultiSelect label="All Sections" options={options.sections} selected={filters.section} onChange={(val) => setFilter("section", val)} />
      
      <input type="date" value={filters.startDate} onChange={(e) => setFilter("startDate", e.target.value)} className="bg-white dark:bg-[#0b1120] border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm rounded-full px-4 py-2 focus:outline-none focus:border-teal-500 hover:border-teal-500 transition-colors cursor-pointer dark:[color-scheme:dark] shadow-sm dark:shadow-none" />
      <input type="date" value={filters.endDate} onChange={(e) => setFilter("endDate", e.target.value)} className="bg-white dark:bg-[#0b1120] border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm rounded-full px-4 py-2 focus:outline-none focus:border-teal-500 hover:border-teal-500 transition-colors cursor-pointer dark:[color-scheme:dark] shadow-sm dark:shadow-none" />
      
      <MultiSelect label="All Brands" options={options.brands} selected={filters.brand} onChange={(val) => setFilter("brand", val)} />
      <MultiSelect label="All Customers" options={options.customers} selected={filters.customer} onChange={(val) => setFilter("customer", val)} />
      
      {/* 🚀 THE 3 MISSING DROPDOWNS HAVE BEEN ADDED BACK HERE */}
      <MultiSelect label="All Test Nos" options={options.test_nos} selected={filters.testNo} onChange={(val) => setFilter("testNo", val)} />
      <MultiSelect label="All PO Number" options={options.po_numbers} selected={filters.poNumber} onChange={(val) => setFilter("poNumber", val)} />
      <MultiSelect label="All Result" options={options.results} selected={filters.result} onChange={(val) => setFilter("result", val)} />
      
      <button type="button" onClick={resetFilters} className="text-gray-500 dark:text-gray-400 text-sm hover:text-gray-900 dark:hover:text-white transition-colors ml-2 cursor-pointer font-medium">
        Reset
      </button>
    </div>
  );
}