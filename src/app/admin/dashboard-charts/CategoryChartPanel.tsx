"use client";

import React, { cloneElement, isValidElement, useMemo, useState } from "react";
import type { DashboardGroupData, DashboardMetrics } from "@/app/actions/data";
import { Layers3, Check } from "lucide-react";

export type CategoryMode = "all" | "abt" | "nonAbt";

type ChartWithDataProps = { data: DashboardGroupData[] };

type CategoryChartPanelProps = {
  data: DashboardGroupData[];
  title: string;
  description?: string;
  children: React.ReactElement<ChartWithDataProps>;
  className?: string;
};

const ZERO: DashboardMetrics = {
  paket: 0,
  orang: 0,
  realisasiPaket: 0,
  realisasiOrang: 0,
  anggaran: 0,
  realisasiAnggaran: 0,
};

function selectRow(row: DashboardGroupData["rows"][number], mode: CategoryMode) {
  if (mode === "all") return row;
  const selected = mode === "abt" ? row.abt : row.nonAbt;
  return {
    ...row,
    // Existing chart utilities combine abt + nonAbt; place the selected
    // category on one side and zero the other to preserve every chart.
    abt: selected,
    nonAbt: ZERO,
    subRows: row.subRows.map((sub) => {
      const subSelected = mode === "abt" ? sub.abt : sub.nonAbt;
      return { ...sub, abt: subSelected, nonAbt: ZERO };
    }),
  };
}

export function selectCategoryData(
  data: DashboardGroupData[],
  mode: CategoryMode,
): DashboardGroupData[] {
  if (mode === "all") return data;
  return data.map((group) => ({
    ...group,
    rows: group.rows.map((row) => selectRow(row, mode)),
  }));
}

export default function CategoryChartPanel({
  data,
  title,
  description,
  children,
  className = "",
}: CategoryChartPanelProps) {
  const [mode, setMode] = useState<CategoryMode>("all");
  const chartData = useMemo(() => selectCategoryData(data, mode), [data, mode]);
  const chart = isValidElement(children)
    ? cloneElement(children, { data: chartData })
    : children;

  const options: { value: CategoryMode; label: string }[] = [
    { value: "all", label: "Gabungan" },
    { value: "abt", label: "ABT" },
    { value: "nonAbt", label: "NON-ABT" },
  ];

  return (
    <section className={`min-w-0 space-y-3 ${className}`}>
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#15406A]">
            <Layers3 size={17} />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-slate-800">{title}</h3>
            {description && <p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p>}
          </div>
        </div>
        <div className="inline-flex w-fit shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1" role="group" aria-label={`Kategori data untuk ${title}`}>
          {options.map((option) => {
            const active = mode === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => setMode(option.value)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#15406A] focus-visible:ring-offset-1 ${active ? "bg-[#15406A] text-white shadow-sm" : "text-slate-600 hover:bg-white hover:text-[#15406A]"}`}
              >
                {active && <Check size={13} />}
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
      {chart}
    </section>
  );
}
