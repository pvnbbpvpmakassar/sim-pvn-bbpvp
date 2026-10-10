"use client";

import { useMemo, useState } from "react";

import type { DashboardGroupData } from "@/app/actions/data";

import {
calculateDashboardSummary,
} from "./chart-utils";

import type {
DashboardFilters as DashboardFiltersState,
} from "./chart-types";

import DashboardSummaryCards from "./DashboardSummaryCards";
import DashboardFilters from "./DashboardFilters";
import CapaianModulBarChart from "./CapaianModulBarChart";
import RealisasiDonutChart from "./RealisasiDonutChart";
import SertifikasiBarChart from "./SertifikasiBarChart";
import UPTPBarChart from "./UPTPBarChart";
import ProduktivitasBarChart from "./ProduktivitasBarChart";
import ROPerformanceTable from "./ROPerformanceTable";
import TargetGapBarChart from "./TargetGapBarChart";
import CategoryChartPanel from "./CategoryChartPanel";
import BudgetAnalytics from "./BudgetAnalytics";

type DashboardChartsProps = {
data: DashboardGroupData[];
isLoading?: boolean;
};

const normalize = (value: string | undefined) =>
(value ?? "").trim().toLowerCase();

function getModuleKey(groupName: string): string {
const name = normalize(groupName);

if (name.includes("sertifikasi")) return "sertifikasi";
if (name === "uptp") return "uptp";
if (name === "produktivitas") return "produktivitas";

return name;
}

export default function DashboardCharts({
data,
isLoading = false,
}: DashboardChartsProps) {
const [filters, setFilters] = useState<DashboardFiltersState>({
search: "",
module: "all",
});

const visibleGroups = useMemo(() => {
const keyword = normalize(filters.search);


return data
  .filter((group) => {
    if (filters.module === "all") return true;

    return getModuleKey(group.groupName) === filters.module;
  })
  .map((group) => ({
    ...group,
    rows: group.rows.filter((row) => {
      if (!keyword) return true;

      return (
        normalize(row.ro).includes(keyword) ||
        normalize(row.kode).includes(keyword)
      );
    }),
  }))
  .filter((group) => group.rows.length > 0);


}, [data, filters]);

const summary = useMemo(
() =>
calculateDashboardSummary(
visibleGroups.flatMap((group) => group.rows),
),
[visibleGroups],
);

const resultCount = useMemo(
() =>
visibleGroups.reduce(
(total, group) => total + group.rows.length,
0,
),
[visibleGroups],
);

const produktivitasGroup = useMemo(
() =>
visibleGroups.find(
(group) => getModuleKey(group.groupName) === "produktivitas",
),
[visibleGroups],
);

const produktivitasRO = useMemo(() => {
if (!produktivitasGroup) return [];


const uniqueRO = new Map<
  string,
  { kode: string; nama: string }
>();

for (const row of produktivitasGroup.rows) {
  const kode = row.kode.trim();

  if (!kode || uniqueRO.has(normalize(kode))) continue;

  uniqueRO.set(normalize(kode), {
    kode,
    nama: row.ro,
  });
}

return Array.from(uniqueRO.values()).slice(0, 3);


}, [produktivitasGroup]);

const showSertifikasi =
filters.module === "all" || filters.module === "sertifikasi";

const showUPTP =
filters.module === "all" || filters.module === "uptp";

const showProduktivitas =
filters.module === "all" || filters.module === "produktivitas";

return ( <div className="space-y-6"> <DashboardSummaryCards
     summary={summary}
     isLoading={isLoading}
   />


  <DashboardFilters
    filters={filters}
    onChange={setFilters}
    resultCount={resultCount}
  />

  {isLoading ? (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      {[1, 2].map((item) => (
        <div
          key={item}
          className="h-[360px] animate-pulse rounded-2xl border border-slate-200 bg-white"
        />
      ))}
    </div>
  ) : visibleGroups.length === 0 ? (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.7}
          className="h-6 w-6"
          aria-hidden="true"
        >
          <circle cx="10.8" cy="10.8" r="6.8" />
          <path
            d="m16 16 4 4"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <h2 className="text-base font-bold text-slate-800">
        Data tidak ditemukan
      </h2>

      <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
        Tidak ada data yang sesuai dengan modul atau kata kunci
        pencarian. Coba ubah filter untuk melihat data lainnya.
      </p>

      <button
        type="button"
        onClick={() =>
          setFilters({
            search: "",
            module: "all",
          })
        }
        className="mt-4 rounded-xl bg-[#15406A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#103453]"
      >
        Reset filter
      </button>
    </div>
  ) : (
    <>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <CategoryChartPanel data={visibleGroups} title="Kategori data — Capaian Modul" description="Pilih gabungan, ABT, atau NON-ABT untuk membandingkan target dan realisasi.">
          <CapaianModulBarChart data={visibleGroups} />
        </CategoryChartPanel>
        <CategoryChartPanel data={visibleGroups} title="Kategori data — Proporsi Realisasi" description="Lihat komposisi realisasi peserta berdasarkan kategori anggaran.">
          <RealisasiDonutChart data={visibleGroups} />
        </CategoryChartPanel>
      </div>

      {showSertifikasi && (
        <CategoryChartPanel data={visibleGroups} title="Kategori data — Sertifikasi Kompetensi" description="Switch kategori memengaruhi seluruh angka pada chart sertifikasi ini.">
          <SertifikasiBarChart data={visibleGroups} />
        </CategoryChartPanel>
      )}

      {showUPTP && (
        <CategoryChartPanel data={visibleGroups} title="Kategori data — UPTP" description="Analisis target dan realisasi UPTP berdasarkan ABT, NON-ABT, atau gabungan.">
          <UPTPBarChart data={visibleGroups} />
        </CategoryChartPanel>
      )}

      {showProduktivitas && (
        <section className="space-y-6">
          {produktivitasRO.length > 0 ? (
            <>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Analisis Produktivitas per RO
                </h2>
                <p className="mt-1 text-sm leading-5 text-slate-500">
                  Perbandingan target dan realisasi orang untuk setiap
                  RO yang tersedia pada data Produktivitas.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 2xl:grid-cols-3">
                {produktivitasRO.map((ro) => (
                  <CategoryChartPanel key={ro.kode} data={visibleGroups} title={`Kategori data — ${ro.nama}`} description="Pilih kategori yang ingin dianalisis untuk RO ini.">
                    <ProduktivitasBarChart
                      data={visibleGroups}
                      kodeRO={ro.kode}
                      title={ro.nama}
                    />
                  </CategoryChartPanel>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
              <p className="text-sm font-semibold text-slate-700">
                Data RO Produktivitas belum tersedia
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Grafik akan muncul setelah data RO dengan kode yang
                valid tersedia.
              </p>
            </div>
          )}

          <ROPerformanceTable data={visibleGroups} />

          <CategoryChartPanel data={visibleGroups} title="Kategori data — Kesenjangan Target" description="Bandingkan kekurangan atau surplus realisasi terhadap target pada kategori terpilih.">
            <TargetGapBarChart data={visibleGroups} />
          </CategoryChartPanel>
        </section>
      )}

      <BudgetAnalytics data={visibleGroups} />
    </>
  )}
</div>


);
}
