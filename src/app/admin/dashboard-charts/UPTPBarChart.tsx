"use client";

import React, { useMemo } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from "recharts";
import { Building2, Users, TrendingUp, Target, Info, MapPin, GraduationCap, BriefcaseBusiness, Layers3 } from "lucide-react";

import type { DashboardGroupData, DashboardRow } from "@/app/actions/data";
import type { UPTPCategory } from "./chart-types";
import { calculateAchievementMetrics, combineRowMetrics, formatNumber, formatPercentage } from "./chart-utils";

type UPTPBarChartProps = {
  data: DashboardGroupData[];
  search?: string;
  isLoading?: boolean;
};

type UPTPChartItem = {
  id: string;
  kode: string;
  name: string;
  kategori: UPTPCategory;
  targetOrang: number;
  realisasiOrang: number;
};

const COLORS: Record<UPTPCategory, string> = {
  Satpel: "#0F766E",
  UPTD: "#7C3AED",
  PFLK: "#D97706",
  "Non-Batch": "#64748B",
};

const CATEGORY_META: Record<UPTPCategory, { label: string; icon: React.ElementType }> = {
  Satpel: { label: "Satuan Pelayanan", icon: MapPin },
  UPTD: { label: "UPTD", icon: Building2 },
  PFLK: { label: "Produktivitas / PFLK", icon: GraduationCap },
  "Non-Batch": { label: "Non-Batch", icon: Layers3 },
};

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

/**
 * Mengidentifikasi kategori UPTP berdasarkan kode dan nama RO.
 * Nama kategori dipakai sebagai fallback jika data berasal dari
 * modul yang belum memiliki kode atau nama RO.
 */
function getUPTPCategory(row: DashboardRow): UPTPCategory | null {
  const moduleText = normalizeText(row.id);
  const kode = normalizeText(row.kode);
  const name = normalizeText(row.ro);

  const text = `${moduleText} ${kode} ${name}`;

  if (text.includes("nonbatch")) return "Non-Batch";
  if (text.includes("pflk")) return "PFLK";
  if (text.includes("uptd")) return "UPTD";
  if (text.includes("satpel")) return "Satpel";

  return null;
}

function getUPTPGroup(data: DashboardGroupData[]) {
  return data.find((group) => normalizeText(group.groupName) === "uptp");
}

function UPTPTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: UPTPChartItem }> }) {
  if (!active || !payload?.length || !payload[0]?.payload) {
    return null;
  }

  const item = payload[0].payload;

  const metrics = calculateAchievementMetrics(item.targetOrang, item.realisasiOrang);

  const difference = item.realisasiOrang - item.targetOrang;

  return (
    <div className="min-w-60 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
      <div className="mb-3 flex items-start gap-2">
        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLORS[item.kategori] }} />
        <div>
          <p className="text-xs font-medium text-slate-400">{item.kategori}</p>
          <p className="mt-0.5 max-w-64 text-sm font-bold leading-snug text-slate-800">{item.name}</p>
        </div>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-slate-500">Target orang</span>
          <span className="font-semibold tabular-nums text-slate-800">{formatNumber(item.targetOrang)}</span>
        </div>

        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-slate-500">Realisasi orang</span>
          <span className="font-semibold tabular-nums text-slate-800">{formatNumber(item.realisasiOrang)}</span>
        </div>

        <div className="border-t border-slate-100 pt-2.5">
          <div className="flex items-center justify-between gap-4 text-xs">
            <span className="text-slate-500">Capaian</span>
            <span className="font-bold text-[#15406A]">{formatPercentage(metrics.persentaseCapaian)}</span>
          </div>

          <div className="mt-2 flex items-center justify-between gap-4 text-xs">
            <span className="text-slate-500">Selisih</span>
            <span className={`font-semibold ${difference >= 0 ? "text-emerald-700" : "text-amber-700"}`}>
              {difference > 0 ? "+" : ""}
              {formatNumber(difference)} orang
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
      {[52, 75, 60, 86, 67].map((height, index) => (
        <div key={index} className="flex flex-1 items-end justify-center gap-1">
          <div className="w-1/2 rounded-t-md bg-slate-200" style={{ height: `${height}%` }} />
          <div className="w-1/2 rounded-t-md bg-slate-100" style={{ height: `${Math.max(height - 18, 15)}%` }} />
        </div>
      ))}
    </div>
  );
}

export default function UPTPBarChart({ data, search = "", isLoading = false }: UPTPBarChartProps) {
  const chartData = useMemo(() => {
    const group = getUPTPGroup(data);

    if (!group) return [];

    const keyword = search.trim().toLowerCase();
    const result: UPTPChartItem[] = [];

    for (const row of group.rows) {
      /*
       * Data utama UPTP dapat memiliki subRows yang merupakan rincian
       * dari baris induknya. Karena itu, subRows tidak ditambahkan lagi.
       *
       * UPTD, PFLK, dan Non-Batch pada struktur dashboard Anda
       * disimpan sebagai baris mandiri dengan subRows kosong.
       */
      const category = getUPTPCategory(row);

      const isStandaloneCategory = category === "UPTD" || category === "PFLK" || category === "Non-Batch";

      if (!category && !isStandaloneCategory) {
        continue;
      }

      const metrics = combineRowMetrics(row);

      const item: UPTPChartItem = {
        id: row.id,
        kode: row.kode,
        name: row.ro || category || "Rincian Output",
        kategori: category ?? "Satpel",
        targetOrang: metrics.orang,
        realisasiOrang: metrics.realisasiOrang,
      };

      if (keyword && !item.name.toLowerCase().includes(keyword) && !item.kode.toLowerCase().includes(keyword) && !item.kategori.toLowerCase().includes(keyword)) {
        continue;
      }

      result.push(item);
    }

    return result;
  }, [data, search]);

  const summary = useMemo(
    () =>
      chartData.reduce(
        (total, item) => ({
          target: total.target + item.targetOrang,
          realisasi: total.realisasi + item.realisasiOrang,
        }),
        { target: 0, realisasi: 0 },
      ),
    [chartData],
  );

  const achievement = calculateAchievementMetrics(summary.target, summary.realisasi);

  const categoryCounts = useMemo(() => {
    const counts: Record<UPTPCategory, number> = {
      Satpel: 0,
      UPTD: 0,
      PFLK: 0,
      "Non-Batch": 0,
    };

    chartData.forEach((item) => {
      counts[item.kategori] += 1;
    });

    return counts;
  }, [chartData]);

  const hasData = chartData.length > 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#15406A]">
            <Building2 size={22} />
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-800">Capaian Modul UPTP</h3>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-500">Perbandingan target dan realisasi peserta dari UPTP, Satpel, UPTD, PFLK, dan Non-Batch.</p>
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
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-800">{isLoading ? "—" : formatNumber(summary.target)}</p>
          <p className="mt-1 text-xs text-slate-400">Orang</p>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Users size={16} className="text-emerald-600" />
            Total Realisasi
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-800">{isLoading ? "—" : formatNumber(summary.realisasi)}</p>
          <p className="mt-1 text-xs text-slate-400">Orang</p>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <TrendingUp size={16} className="text-violet-600" />
            Persentase Capaian
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-[#15406A]">{isLoading ? "—" : formatPercentage(achievement.persentaseCapaian)}</p>
          <p className="mt-1 text-xs text-slate-400">Agregat seluruh kategori</p>
        </div>
      </div>

      <div className="border-t border-slate-100 px-3 pb-5 pt-4 sm:px-5">
        <div className="mb-4 flex flex-wrap gap-2">
          {(Object.keys(CATEGORY_META) as UPTPCategory[]).map((category) => {
            const Icon = CATEGORY_META[category].icon;

            return (
              <div key={category} className="inline-flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2">
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-md"
                  style={{
                    color: COLORS[category],
                    backgroundColor: `${COLORS[category]}12`,
                  }}
                >
                  <Icon size={15} />
                </span>

                <div>
                  <p className="text-xs font-semibold text-slate-700">{category}</p>
                  <p className="text-[11px] text-slate-400">{categoryCounts[category]} rincian</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mb-4 flex items-start gap-2 rounded-xl bg-slate-50 p-3">
          <Info size={16} className="mt-0.5 shrink-0 text-slate-400" />
          <p className="text-xs leading-relaxed text-slate-500">Arahkan kursor ke batang untuk melihat target, realisasi, selisih, dan persentase capaian. Baris induk tidak dijumlahkan kembali dengan subbarisnya.</p>
        </div>

        {isLoading ? (
          <ChartSkeleton />
        ) : !hasData ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center px-5 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <BriefcaseBusiness size={26} />
            </div>

            <p className="mt-4 text-sm font-semibold text-slate-700">Data UPTP belum tersedia</p>

            <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-400">Pastikan grup UPTP sudah tersedia pada hasil getDashboardRekapan().</p>
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
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />

                <XAxis dataKey="kode" tick={{ fill: "#64748B", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#E2E8F0" }} tickMargin={10} interval="preserveStartEnd" />

                <YAxis tick={{ fill: "#64748B", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(value: number) => formatNumber(value)} width={65} allowDecimals={false} />

                <Tooltip content={<UPTPTooltip />} cursor={{ fill: "#F1F5F9", opacity: 0.75 }} />

                <Legend
                  verticalAlign="top"
                  align="right"
                  height={38}
                  iconType="circle"
                  wrapperStyle={{
                    fontSize: "12px",
                    color: "#64748B",
                  }}
                />

                <Bar dataKey="targetOrang" name="Target Orang" fill="#15406A" radius={[5, 5, 0, 0]} maxBarSize={38}>
                  {chartData.map((item) => (
                    <Cell key={`target-${item.id}`} />
                  ))}
                </Bar>

                <Bar dataKey="realisasiOrang" name="Realisasi Orang" fill="#16A34A" radius={[5, 5, 0, 0]} maxBarSize={38}>
                  {chartData.map((item) => (
                    <Cell key={`realisasi-${item.id}`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {!isLoading && hasData && <p className="mt-3 text-center text-xs text-slate-400">Sumbu horizontal menampilkan kode RO. Angka pada sumbu vertikal menunjukkan jumlah peserta.</p>}
      </div>
    </section>
  );
}
