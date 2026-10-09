
"use client";

import React from "react";
import { Search, SlidersHorizontal, X, RotateCcw } from "lucide-react";

import type { DashboardFilters as DashboardFiltersType } from "./chart-types";

type DashboardFiltersProps = {
  filters: DashboardFiltersType;
  onChange: (filters: DashboardFiltersType) => void;
  resultCount?: number;
};

const MODULE_OPTIONS = [
  { value: "all", label: "Semua Modul" },
  { value: "sertifikasi", label: "Sertifikasi Kompetensi" },
  { value: "uptp", label: "UPTP" },
  { value: "produktivitas", label: "Produktivitas" },
];

export default function DashboardFilters({
  filters,
  onChange,
  resultCount,
}: DashboardFiltersProps) {
  const updateFilter = (
    key: keyof DashboardFiltersType,
    value: string,
  ) => {
    onChange({
      ...filters,
      [key]: value,
    });
  };

  const isFiltered =
    filters.search.trim() !== "" && filters.search !== "" ||
    filters.module !== "all";

  const resetFilters = () => {
    onChange({
      search: "",
      module: "all",
    });
  };

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#15406A]">
              <SlidersHorizontal size={18} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Filter Dashboard
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Sesuaikan data yang ingin ditampilkan.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(220px,1fr)_minmax(200px,0.8fr)] xl:w-[620px]">
          <div className="space-y-1.5">
            <label
              htmlFor="dashboard-search"
              className="text-xs font-semibold text-slate-600"
            >
              Cari Rincian Output
            </label>

            <div className="relative">
              <Search
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                id="dashboard-search"
                type="text"
                value={filters.search}
                onChange={(event) =>
                  updateFilter("search", event.target.value)
                }
                placeholder="Cari kode atau nama RO..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#15406A] focus:ring-4 focus:ring-[#15406A]/10"
              />

              {filters.search && (
                <button
                  type="button"
                  onClick={() => updateFilter("search", "")}
                  aria-label="Hapus pencarian"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="dashboard-module"
              className="text-xs font-semibold text-slate-600"
            >
              Pilih Modul
            </label>

            <select
              id="dashboard-module"
              value={filters.module}
              onChange={(event) =>
                updateFilter("module", event.target.value)
              }
              className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition hover:border-slate-300 focus:border-[#15406A] focus:ring-4 focus:ring-[#15406A]/10"
            >
              {MODULE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">
            Filter aktif:
          </span>

          {filters.module !== "all" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-[#15406A]">
              {MODULE_OPTIONS.find(
                (option) => option.value === filters.module,
              )?.label ?? filters.module}

              <button
                type="button"
                onClick={() => updateFilter("module", "all")}
                aria-label="Hapus filter modul"
                className="rounded-full hover:bg-blue-100"
              >
                <X size={13} />
              </button>
            </span>
          )}

          {filters.search.trim() !== "" && (
            <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
              <Search size={12} />
              <span className="max-w-48 truncate">
                {filters.search}
              </span>

              <button
                type="button"
                onClick={() => updateFilter("search", "")}
                aria-label="Hapus filter pencarian"
                className="rounded-full hover:bg-slate-200"
              >
                <X size={13} />
              </button>
            </span>
          )}

          {!isFiltered && (
            <span className="text-xs font-medium text-slate-400">
              Tidak ada filter tambahan
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          {typeof resultCount === "number" && (
            <span className="text-xs text-slate-500">
              <span className="font-semibold text-slate-700">
                {resultCount}
              </span>{" "}
              data ditampilkan
            </span>
          )}

          {isFiltered && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-[#15406A]"
            >
              <RotateCcw size={13} />
              Reset filter
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
