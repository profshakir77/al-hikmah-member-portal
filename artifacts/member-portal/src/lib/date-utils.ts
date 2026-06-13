import { useMemo } from "react";

export const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export function useCurrentDate() {
  return useMemo(() => {
    const d = new Date();
    return {
      month: d.getMonth() + 1,
      year: d.getFullYear(),
    };
  }, []);
}

export function generateYearOptions(range: number = 5) {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: range * 2 + 1 }, (_, i) => currentYear - range + i).sort((a, b) => b - a);
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(amount);
}

export function monthLabel(m: number): string {
  return MONTHS.find((x) => x.value === m)?.label ?? String(m);
}
