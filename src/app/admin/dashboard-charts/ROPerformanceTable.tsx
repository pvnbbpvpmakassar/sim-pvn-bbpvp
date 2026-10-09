"use client";

import { useMemo, useState } from "react";

import type { DashboardGroupData } from "@/app/actions/data";
import { combineRowMetrics, formatNumber, formatPercentage } from "./chart-utils";

type ROPerformanceTableProps = {
  data: DashboardGroupData[];
  search?: string;
  isLoading?: boolean;
};

type ROPerformanceItem = {
  id: string;
  kode: string;
  nama: string;
  target: number;
  realisasi: number;
  selisih: number;
  capaian: number;
};

type SortKey = "nama" | "target" | "realisasi" | "selisih" | "capaian";

type SortDirection = "asc" | "desc";

const getAchievementColor = (percentage: number) => {
  if (percentage >= 100) {
    return {
      text: "text-green-700",
      bar: "bg-green-600",
      badge: "bg-green-50",
    };
  }

  if (percentage >= 75) {
    return {
      text: "text-blue-700",
      bar: "bg-[#15406A]",
      badge: "bg-blue-50",
    };
  }

  return {
    text: "text-amber-700",
    bar: "bg-amber-500",
    badge: "bg-amber-50",
  };
};

type SortButtonProps = {
  label: string;
  column: SortKey;
  activeColumn: SortKey;
  direction: SortDirection;
  onSort: (column: SortKey) => void;
  align?: "left" | "right";
};

function SortButton({ label, column, activeColumn, direction, onSort, align = "right" }: SortButtonProps) {
  const isActive = activeColumn === column;

  return (
    <button type="button" onClick={() => onSort(column)} className={`inline-flex items-center gap-1.5 font-semibold transition-colors hover:text-[#15406A] ${align === "left" ? "text-left" : "text-right"}`}>
      {label}
      <span className={isActive ? "text-[#15406A]" : "text-slate-300"} aria-hidden="true">
        {isActive ? (direction === "asc" ? "↑" : "↓") : "↕"}{" "}
      </span>{" "}
    </button>
  );
}

export default function ROPerformanceTable({ data, search = "", isLoading = false }: ROPerformanceTableProps) {
  const [keyword, setKeyword] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("capaian");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const rows = useMemo<ROPerformanceItem[]>(() => {
    const group = data.find((item) => item.groupName.trim().toLowerCase() === "produktivitas");

    if (!group) return [];

    const normalizedSearch = `${search} ${keyword}`.trim().toLowerCase();

    return group.rows
      .map((row) => {
        const metrics = combineRowMetrics(row);
        const target = metrics.orang;
        const realisasi = metrics.realisasiOrang;

        return {
          id: row.id,
          kode: row.kode,
          nama: row.ro,
          target,
          realisasi,
          selisih: realisasi - target,
          capaian: target > 0 ? (realisasi / target) * 100 : 0,
        };
      })
      .filter((row) => {
        if (!normalizedSearch) return true;

        return row.nama.toLowerCase().includes(normalizedSearch) || row.kode.toLowerCase().includes(normalizedSearch);
      });
  }, [data, search, keyword]);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      let result = 0;

      switch (sortKey) {
        case "nama":
          result = a.nama.localeCompare(b.nama, "id");
          break;
        case "target":
          result = a.target - b.target;
          break;
        case "realisasi":
          result = a.realisasi - b.realisasi;
          break;
        case "selisih":
          result = a.selisih - b.selisih;
          break;
        case "capaian":
          result = a.capaian - b.capaian;
          break;
      }

      return sortDirection === "asc" ? result : -result;
    });
  }, [rows, sortKey, sortDirection]);

  const totals = useMemo(() => {
    return rows.reduce(
      (result, row) => ({
        target: result.target + row.target,
        realisasi: result.realisasi + row.realisasi,
      }),
      { target: 0, realisasi: 0 },
    );
  }, [rows]);

  const totalAchievement = totals.target > 0 ? (totals.realisasi / totals.target) * 100 : 0;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection(key === "nama" ? "asc" : "desc");
  };

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        {" "}
        <div className="mb-5 space-y-2">
          {" "}
          <div className="h-5 w-48 animate-pulse rounded bg-slate-200" /> <div className="h-4 w-64 max-w-full animate-pulse rounded bg-slate-100" />{" "}
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-12 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md">
      {" "}
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        {" "}
        <div>
          {" "}
          <h2 className="text-base font-bold text-slate-900 sm:text-lg">Performa Realisasi per RO </h2>{" "}
          <p className="mt-1 text-sm leading-5 text-slate-500">Perbandingan target, realisasi, dan persentase capaian setiap RO Produktivitas. </p>{" "}
        </div>
        <div className="relative w-full sm:max-w-xs">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true">
            <circle cx="10.8" cy="10.8" r="6.8" />
            <path d="m16 16 4 4" strokeLinecap="round" />
          </svg>

          <input
            type="search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Cari nama atau kode RO..."
            aria-label="Cari nama atau kode RO"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-[#15406A] focus:bg-white focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-3 sm:p-6">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-medium text-slate-500">Total Target</p>
          <p className="mt-1 text-xl font-bold text-[#15406A]">{formatNumber(totals.target)}</p>
          <p className="mt-1 text-xs text-slate-500">orang</p>
        </div>

        <div className="rounded-xl bg-green-50 p-4">
          <p className="text-xs font-medium text-green-700">Total Realisasi</p>
          <p className="mt-1 text-xl font-bold text-green-700">{formatNumber(totals.realisasi)}</p>
          <p className="mt-1 text-xs text-green-700">orang</p>
        </div>

        <div className="rounded-xl bg-blue-50 p-4">
          <p className="text-xs font-medium text-blue-700">Capaian Keseluruhan</p>
          <p className="mt-1 text-xl font-bold text-blue-800">{formatPercentage(totalAchievement)}</p>
          <p className="mt-1 text-xs text-blue-700">{rows.length} RO ditampilkan</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] border-collapse text-sm">
          <thead>
            <tr className="border-y border-slate-100 bg-slate-50/80 text-xs text-slate-500">
              <th className="w-12 px-5 py-3.5 text-center font-semibold">No.</th>
              <th className="px-4 py-3.5 text-left font-semibold">
                <SortButton label="Nama RO" column="nama" activeColumn={sortKey} direction={sortDirection} onSort={handleSort} align="left" />
              </th>

              <th className="px-4 py-3.5 text-right font-semibold">
                <SortButton label="Target" column="target" activeColumn={sortKey} direction={sortDirection} onSort={handleSort} />
              </th>

              <th className="px-4 py-3.5 text-right font-semibold">
                <SortButton label="Realisasi" column="realisasi" activeColumn={sortKey} direction={sortDirection} onSort={handleSort} />
              </th>

              <th className="px-4 py-3.5 text-right font-semibold">
                <SortButton label="Selisih" column="selisih" activeColumn={sortKey} direction={sortDirection} onSort={handleSort} />
              </th>

              <th className="px-5 py-3.5 text-left font-semibold">
                <SortButton label="Capaian" column="capaian" activeColumn={sortKey} direction={sortDirection} onSort={handleSort} align="left" />
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {sortedRows.map((row, index) => {
              const colors = getAchievementColor(row.capaian);

              return (
                <tr key={row.id} className="transition-colors hover:bg-slate-50/80">
                  <td className="px-5 py-4 text-center text-xs text-slate-400">{index + 1}</td>

                  <td className="px-4 py-4">
                    <div className="font-semibold text-slate-800">{row.nama}</div>
                    <div className="mt-1 text-xs text-slate-400">{row.kode}</div>
                  </td>

                  <td className="px-4 py-4 text-right font-medium tabular-nums text-slate-700">{formatNumber(row.target)}</td>

                  <td className="px-4 py-4 text-right font-semibold tabular-nums text-green-700">{formatNumber(row.realisasi)}</td>

                  <td className={`px-4 py-4 text-right font-semibold tabular-nums ${row.selisih >= 0 ? "text-green-700" : "text-amber-700"}`}>
                    {row.selisih > 0 ? "+" : ""}
                    {formatNumber(row.selisih)}
                  </td>

                  <td className="px-5 py-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className={`inline-flex rounded-md px-2 py-1 text-xs font-bold ${colors.badge} ${colors.text}`}>{formatPercentage(row.capaian)}</span>
                    </div>

                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={`Capaian ${row.nama}`} aria-valuenow={Math.min(row.capaian, 100)} aria-valuemin={0} aria-valuemax={100}>
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${colors.bar}`}
                        style={{
                          width: `${Math.min(row.capaian, 100)}%`,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}

            {sortedRows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-14 text-center">
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-5 w-5" aria-hidden="true">
                      <circle cx="10.8" cy="10.8" r="6.8" />
                      <path d="m16 16 4 4" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-slate-700">Data RO tidak ditemukan</p>
                  <p className="mt-1 text-xs text-slate-500">Coba gunakan kata kunci lain atau pastikan data Produktivitas tersedia.</p>
                </td>
              </tr>
            )}
          </tbody>

          {sortedRows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <td colSpan={2} className="px-5 py-4 font-bold text-slate-800">
                  Total
                </td>
                <td className="px-4 py-4 text-right font-bold tabular-nums text-[#15406A]">{formatNumber(totals.target)}</td>
                <td className="px-4 py-4 text-right font-bold tabular-nums text-green-700">{formatNumber(totals.realisasi)}</td>
                <td className={`px-4 py-4 text-right font-bold tabular-nums ${totals.realisasi >= totals.target ? "text-green-700" : "text-amber-700"}`}>
                  {totals.realisasi - totals.target > 0 ? "+" : ""}
                  {formatNumber(totals.realisasi - totals.target)}
                </td>
                <td className="px-5 py-4">
                  <span className={`font-bold ${totalAchievement >= 100 ? "text-green-700" : totalAchievement >= 75 ? "text-blue-700" : "text-amber-700"}`}>{formatPercentage(totalAchievement)}</span>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="flex flex-col gap-2 border-t border-slate-100 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span>
          Menampilkan {sortedRows.length} dari {rows.length} RO.
        </span>
        <span>Klik judul kolom untuk mengurutkan data.</span>
      </div>
    </section>
  );
}
