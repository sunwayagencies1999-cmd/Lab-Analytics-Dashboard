"use client";

import React, { createContext, useContext, useState, useMemo } from "react";

export interface FilterState {
  year: string[]; month: string[]; group: string[]; section: string[]; brand: string[];
  startDate: string; endDate: string; customer: string[]; testNo: string[]; poNumber: string[]; result: string[];
}

const initialFilters: FilterState = {
  year: [], month: [], group: [], section: [], brand: [], startDate: "", 
  endDate: "", customer: [], testNo: [], poNumber: [], result: [],
};

interface FilterContextType {
  filters: FilterState;
  setFilter: (key: keyof FilterState, value: any) => void;
  resetFilters: () => void;
  queryString: string;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  const setFilter = (key: keyof FilterState, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => setFilters(initialFilters);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.year.length > 0) params.append("year", filters.year.join(","));
    if (filters.month.length > 0) params.append("month", filters.month.join(","));
    if (filters.group.length > 0) params.append("group", filters.group.join(","));
    if (filters.section.length > 0) params.append("section", filters.section.join(","));
    if (filters.brand.length > 0) params.append("brand", filters.brand.join(","));
    if (filters.startDate) params.append("start_date", filters.startDate);
    if (filters.endDate) params.append("end_date", filters.endDate);
    if (filters.customer.length > 0) params.append("customer", filters.customer.join(","));
    if (filters.testNo.length > 0) params.append("test_no", filters.testNo.join(","));
    
    // FIX: Changed "poNumber" to "po_number" so the backend recognizes it
    if (filters.poNumber.length > 0) params.append("po_number", filters.poNumber.join(",")); 
    
    if (filters.result.length > 0) params.append("result", filters.result.join(","));
    return params.toString();
  }, [filters]);

  // THIS WAS MISSING! We need to return the provider to wrap the app.
  return (
    <FilterContext.Provider value={{ filters, setFilter, resetFilters, queryString }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (!context) throw new Error("useFilters must be used within a FilterProvider");
  return context;
}