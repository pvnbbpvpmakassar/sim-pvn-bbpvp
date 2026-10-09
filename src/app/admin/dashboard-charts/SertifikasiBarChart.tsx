"use client";

import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";
import {
  Award,
  Users,
  TrendingUp,
  Target,
  Info,
} from "lucide-react";

import type { DashboardGroupData } from "@/app/actions/data";
import type { ChartDataItem } from "./chart-types";
import {
  calculateAchievementMetrics,
  combineRowMetrics,
  formatNumber,
  formatPercentage,
} from "./chart-utils";

type SertifikasiBarChartProps = {
  data: DashboardGroupData[];
  search?: string;
  isLoading?: boolean;
};

const CHART_COLORS = {
  target: "#15406A",
  realisasi: "#16A34A",
  grid: "#E2E8F0",
  text: "#64748B",
};

function SertifikasiTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: ChartDataItem }>;
}) {
  if (!active || !payload?.length || !payload[0]?.payload) {
    return null;
  }

  const item = payload[0].payload;
  const metrics = calculateAchievementMetrics(
    item.targetOrang,
    item.realisasiOrang,
  );

  const selisih = item.realisasiOrang - item.targetOrang;

  return (
    <div className="min-w-56 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
      <p className="mb-3 max-w-64 text-sm font-bold leading-snug text-slate-800">
        {item.name}
      </p>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-5 text-sm">
          <span className="flex items-center gap-2 text-slate-500">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#15406A]" />
            Target
          </span>
          <span className="font-semibold tabular-nums text-slate-800">
            {formatNumber(item.targetOrang)} orang
          </span>
        </div>

        <div className="flex items-center justify-between gap-5 text-sm">
          <span className="flex items-center gap-2 text-slate-500">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#16A34A]" />
            Realisasi
          </span>
          <span className="font-semibold tabular-nums text-slate-800">
            {formatNumber(item.realisasiOrang)} orang
          </span>
        </div>

        <div className="border-t border-slate-100 pt-2.5">
          <div className="flex items-center justify-between gap-4 text-xs">
            <span className="text-slate-500">Capaian</span>
            <span className="font-bold text-[#15406A]">
              {formatPercentage(metrics.persentaseCapaian)}
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between gap-4 text-xs">
            <span className="text-slate-500">Selisih</span>
            <span
              className={`font-semibold ${
                selisih >= 0 ? "text-emerald-700" : "text-amber-700"
              }`}
            >
              {selisih > 0 ? "+" : ""}
              {formatNumber(selisih)} orang
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="flex h-[320px] animate-pulse items-end gap-5 px-6 pb-8 pt-12">
      {[45, 70, 55, 85, 62, 76, 48].map((height, index) => (
        <div
          key={index}
          className="flex flex-1 items-end justify-center gap-1"
        >
          <div
            className="w-1/2 rounded-t-md bg-slate-200"
            style={{ height: `${height}%` }}
          />
          <div
            className="w-1/2 rounded-t-md bg-slate-100"
            style={{ height: `${Math.max(height - 15, 15)}%` }}
          />
        </div>
      ))}
    </div>
  );
}

export default function SertifikasiBarChart({
  data,
  search = "",
  isLoading = false,
}: SertifikasiBarChartProps) {
  const chartData = useMemo(() => {
    const group = data.find((item) => {
      const name = item.groupName.toLowerCase();

      return (
        name.includes("sertifikasi") ||
        name.includes("sertifikasi kompetensi")
      );
    });

    if (!group) return [];

    const keyword = search.trim().toLowerCase();

    return group.rows
      .map((row) => {
        const metrics = combineRowMetrics(row);

        return {
          id: row.id,
          kode: row.kode,
          name: row.ro,
          targetOrang: metrics.orang,
          realisasiOrang: metrics.realisasiOrang,
          targetPaket: metrics.paket,
          realisasiPaket: metrics.realisasiPaket,
        };
      })
      .filter((item) => {
        if (!keyword) return true;

        return (
          item.name.toLowerCase().includes(keyword) ||
          item.kode.toLowerCase().includes(keyword)
        );
      });
  }, [data, search]);

  const summary = useMemo(() => {
    return chartData.reduce(
      (total, item) => ({
        target: total.target + item.targetOrang,
        realisasi: total.realisasi + item.realisasiOrang,
      }),
      { target: 0, realisasi: 0 },
    );
  }, [chartData]);

  const achievement = calculateAchievementMetrics(
    summary.target,
    summary.realisasi,
  );

  const hasData = chartData.length > 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#15406A]">
            <Award size={22} />
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-800">
              Capaian Sertifikasi Kompetensi
            </h3>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-500">
              Perbandingan target dan realisasi peserta pada setiap rincian
              output sertifikasi.
            </p>
          </div>
        </div>

        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-[#15406A]">
          <TrendingUp size={14} />
          Target vs Realisasi
        </span>
      </div>

      <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="p-5">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Target size={16} className="text-[#15406A]" />
            Total Target
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-800">
            {isLoading ? "—" : formatNumber(summary.target)}
          </p>
          <p className="mt-1 text-xs text-slate-400">Orang</p>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Users size={16} className="text-emerald-600" />
            Total Realisasi
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-800">
            {isLoading ? "—" : formatNumber(summary.realisasi)}
          </p>
          <p className="mt-1 text-xs text-slate-400">Orang</p>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <TrendingUp size={16} className="text-violet-600" />
            Persentase Capaian
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-[#15406A]">
            {isLoading ? "—" : formatPercentage(achievement.persentaseCapaian)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Agregat seluruh rincian output
          </p>
        </div>
      </div>

      <div className="border-t border-slate-100 px-3 pb-5 pt-4 sm:px-5">
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-slate-50 p-3">
          <Info size={16} className="mt-0.5 shrink-0 text-slate-400" />
          <p className="text-xs leading-relaxed text-slate-500">
            Arahkan kursor ke batang untuk melihat target, realisasi, selisih,
            dan persentase capaian setiap rincian output.
          </p>
        </div>

        {isLoading ? (
          <ChartSkeleton />
        ) : !hasData ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center px-5 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Award size={26} />
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-700">
              Data sertifikasi belum tersedia
            </p>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-400">
              Data akan ditampilkan ketika rincian output sertifikasi tersedia
              atau pencarian diperbarui.
            </p>
          </div>
        ) : (
          <div className="h-[360px] w-full sm:h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{
                  top: 20,
                  right: 12,
                  left: 0,
                  bottom: 10,
                }}
                barGap={5}
                barCategoryGap="25%"
              >
                <CartesianGrid
                  stroke={CHART_COLORS.grid}
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  dataKey="kode"
                  tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: CHART_COLORS.grid }}
                  tickMargin={10}
                  interval={0}
                />

                <YAxis
                  tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value: number) => formatNumber(value)}
                  width={65}
                  allowDecimals={false}
                />

                <Tooltip
                  content={<SertifikasiTooltip />}
                  cursor={{ fill: "#F1F5F9", opacity: 0.75 }}
                />

                <Legend
                  verticalAlign="top"
                  align="right"
                  height={38}
                  iconType="circle"
                  wrapperStyle={{
                    fontSize: "12px",
                    color: CHART_COLORS.text,
                  }}
                />

                <Bar
                  dataKey="targetOrang"
                  name="Target Orang"
                  fill={CHART_COLORS.target}
                  radius={[5, 5, 0, 0]}
                  maxBarSize={38}
                >
                  {chartData.map((item) => (
                    <Cell key={`target-${item.id}`} />
                  ))}
                </Bar>

                <Bar
                  dataKey="realisasiOrang"
                  name="Realisasi Orang"
                  fill={CHART_COLORS.realisasi}
                  radius={[5, 5, 0, 0]}
                  maxBarSize={38}
                >
                  {chartData.map((item) => (
                    <Cell key={`realisasi-${item.id}`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {!isLoading && hasData && (
          <p className="mt-3 text-center text-xs text-slate-400">
            Sumbu horizontal menampilkan kode RO. Angka pada sumbu vertikal
            menunjukkan jumlah peserta.
          </p>
        )}
      </div>
    </section>
  );
}
