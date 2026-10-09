"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { DashboardGroupData } from "@/app/actions/data";
import { buildModuleAchievementData, formatNumber, formatPercentage } from "./chart-utils";

type CapaianModulBarChartProps = {
  data: DashboardGroupData[];
  isLoading?: boolean;
};

const PRIMARY_COLOR = "#15406A";
const SUCCESS_COLOR = "#16A34A";
const WARNING_COLOR = "#D97706";

const getAchievementColor = (percentage: number): string => {
  if (percentage >= 100) return SUCCESS_COLOR;
  if (percentage >= 75) return PRIMARY_COLOR;
  return WARNING_COLOR;
};

type TooltipPayloadItem = {
  name?: string;
  value?: number | string;
  color?: string;
  payload?: {
    name?: string;
    targetOrang?: number;
    realisasiOrang?: number;
    persentaseCapaian?: number;
  };
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: TooltipPayloadItem[];
};

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const item = payload[0]?.payload;

  if (!item) return null;

  const target = item.targetOrang ?? 0;
  const realisasi = item.realisasiOrang ?? 0;
  const percentage = item.persentaseCapaian ?? 0;
  const selisih = realisasi - target;

  return (
    <div className="min-w-52 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
      {" "}
      <p className="mb-3 text-sm font-bold text-slate-800">{item.name ?? "Modul"} </p>
      
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between gap-5">
          <span className="text-slate-500">Target orang</span>
          <span className="font-semibold text-[#15406A]">{formatNumber(target)}</span>
        </div>

        <div className="flex items-center justify-between gap-5">
          <span className="text-slate-500">Realisasi orang</span>
          <span className="font-semibold text-green-600">{formatNumber(realisasi)}</span>
        </div>

        <div className="flex items-center justify-between gap-5">
          <span className="text-slate-500">Capaian</span>
          <span className="font-bold" style={{ color: getAchievementColor(percentage) }}>
            {formatPercentage(percentage)}
          </span>
        </div>

        <div className="mt-2 border-t border-slate-100 pt-2">
          <div className="flex items-center justify-between gap-5">
            <span className="text-slate-500">{selisih >= 0 ? "Surplus" : "Kekurangan"}</span>
            <span className={`font-semibold ${selisih >= 0 ? "text-green-600" : "text-amber-600"}`}>
              {selisih >= 0 ? "+" : ""}
              {formatNumber(selisih)} orang
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CapaianModulBarChart({ data, isLoading = false }: CapaianModulBarChartProps) {
  const chartData = buildModuleAchievementData(data);

  const totalTarget = chartData.reduce((total, item) => total + item.targetOrang, 0);

  const totalRealisasi = chartData.reduce((total, item) => total + item.realisasiOrang, 0);

  const totalCapaian = totalTarget > 0 ? (totalRealisasi / totalTarget) * 100 : 0;

  const highestModule = [...chartData].sort((a, b) => b.persentaseCapaian - a.persentaseCapaian)[0];

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        {" "}
        <div className="mb-6 space-y-2">
          {" "}
          <div className="h-5 w-52 animate-pulse rounded bg-slate-200" /> <div className="h-4 w-72 max-w-full animate-pulse rounded bg-slate-100" />{" "}
        </div>
        <div className="space-y-5">
          {[1, 2, 3].map((item) => (
            <div key={item} className="space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
              <div className="h-8 w-full animate-pulse rounded-lg bg-slate-100" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md sm:p-6">
      {" "}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {" "}
        <div>
          {" "}
          <h2 className="text-base font-bold text-slate-900 sm:text-lg">Capaian Antar Modul </h2> <p className="mt-1 text-sm leading-5 text-slate-500">Perbandingan target dan realisasi peserta pada setiap modul. </p>{" "}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#15406A]" />
            Target
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-green-600" />
            Realisasi
          </div>
        </div>
      </div>
      {chartData.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 px-5 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
              <path d="M4 19V5m0 14h16M8 15v-4m4 4V7m4 8V9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-700">Belum ada data capaian modul</p>
          <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">Data akan ditampilkan setelah tersedia pada dashboard.</p>
        </div>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">Total Target</p>
              <p className="mt-1 text-xl font-bold text-[#15406A]">{formatNumber(totalTarget)}</p>
              <p className="mt-1 text-xs text-slate-500">orang</p>
            </div>

            <div className="rounded-xl bg-green-50 p-4">
              <p className="text-xs font-medium text-green-700">Total Realisasi</p>
              <p className="mt-1 text-xl font-bold text-green-700">{formatNumber(totalRealisasi)}</p>
              <p className="mt-1 text-xs text-green-700">orang</p>
            </div>

            <div className="rounded-xl bg-blue-50 p-4">
              <p className="text-xs font-medium text-blue-700">Capaian Keseluruhan</p>
              <p className="mt-1 text-xl font-bold text-blue-800">{formatPercentage(totalCapaian)}</p>
              <p className="mt-1 text-xs text-blue-700">{chartData.length} modul</p>
            </div>
          </div>

          <div className="h-[280px] w-full sm:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 22, right: 12, left: -16, bottom: 8 }} barGap={5} barCategoryGap="25%">
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="4 4" vertical={false} />

                <XAxis dataKey="name" tick={{ fill: "#64748B", fontSize: 11 }} axisLine={{ stroke: "#CBD5E1" }} tickLine={false} tickMargin={10} interval={0} />

                <YAxis allowDecimals={false} tick={{ fill: "#64748B", fontSize: 11 }} axisLine={false} tickLine={false} width={48} />

                <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F1F5F9", opacity: 0.7 }} />

                <Bar dataKey="targetOrang" name="Target" fill={PRIMARY_COLOR} radius={[5, 5, 0, 0]} maxBarSize={34} />

                <Bar dataKey="realisasiOrang" name="Realisasi" radius={[5, 5, 0, 0]} maxBarSize={34}>
                  {chartData.map((item) => (
                    <Cell key={item.name} fill={getAchievementColor(item.persentaseCapaian)} />
                  ))}
                  <LabelList
                    dataKey="realisasiOrang"
                    position="top"
                    formatter={(value) => formatNumber(Number(value ?? 0))}
                    style={{
                      fill: "#475569",
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-slate-500">Warna realisasi: hijau untuk capaian minimal 100%, biru untuk 75–99,99%, dan kuning untuk di bawah 75%.</p>

            {highestModule && (
              <p className="shrink-0 text-xs font-semibold text-slate-700">
                Capaian tertinggi:{" "}
                <span className="text-green-700">
                  {highestModule.name} ({formatPercentage(highestModule.persentaseCapaian)})
                </span>
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
