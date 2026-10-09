"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { DashboardGroupData } from "@/app/actions/data";
import { calculateDashboardSummary, formatNumber, formatPercentage } from "./chart-utils";

type RealisasiDonutChartProps = {
  data: DashboardGroupData[];
  isLoading?: boolean;
};

const PRIMARY_COLOR = "#15406A";
const SUCCESS_COLOR = "#16A34A";
const REMAINING_COLOR = "#E2E8F0";
const WARNING_COLOR = "#D97706";

type DonutTooltipPayload = {
  name?: string;
  value?: number;
  payload?: {
    name?: string;
    value?: number;
    color?: string;
  };
};

type DonutTooltipProps = {
  active?: boolean;
  payload?: DonutTooltipPayload[];
};

function CustomTooltip({ active, payload }: DonutTooltipProps) {
  if (!active || !payload?.length) return null;

  const item = payload[0]?.payload;

  if (!item) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
      {" "}
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color ?? PRIMARY_COLOR }} /> <span className="text-sm text-slate-600">{item.name}</span>{" "}
      </div>{" "}
      <p className="mt-1 pl-[18px] text-base font-bold text-slate-900">{formatNumber(Number(item.value ?? 0))} orang </p>{" "}
    </div>
  );
}

export default function RealisasiDonutChart({ data, isLoading = false }: RealisasiDonutChartProps) {
  const summary = calculateDashboardSummary(data.flatMap((group) => group.rows));

  const target = summary.targetOrang;
  const realisasi = summary.realisasiOrang;
  const sisaTarget = Math.max(target - realisasi, 0);
  const surplus = Math.max(realisasi - target, 0);
  const capaian = target > 0 ? (realisasi / target) * 100 : 0;

  const achievementColor = capaian >= 100 ? SUCCESS_COLOR : capaian >= 75 ? PRIMARY_COLOR : WARNING_COLOR;

  // Surplus ditampilkan sebagai metrik tersendiri, bukan sebagai
  // bagian donat tambahan, agar proporsi target tetap akurat.
  const donutData =
    target > 0
      ? [
          {
            name: "Realisasi dalam target",
            value: Math.min(realisasi, target),
            color: SUCCESS_COLOR,
          },
          {
            name: "Sisa target",
            value: sisaTarget,
            color: REMAINING_COLOR,
          },
        ].filter((item) => item.value > 0)
      : [];

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        {" "}
        <div className="mb-5 space-y-2">
          {" "}
          <div className="h-5 w-48 animate-pulse rounded bg-slate-200" /> <div className="h-4 w-64 max-w-full animate-pulse rounded bg-slate-100" />{" "}
        </div>
        <div className="flex flex-col items-center gap-5 sm:flex-row">
          <div className="h-48 w-48 animate-pulse rounded-full border-[22px] border-slate-100" />
          <div className="w-full flex-1 space-y-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className="space-y-2">
                <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
                <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md sm:p-6">
      {" "}
      <div className="mb-5">
        {" "}
        <h2 className="text-base font-bold text-slate-900 sm:text-lg">Realisasi terhadap Target </h2> <p className="mt-1 text-sm leading-5 text-slate-500">Ringkasan progres realisasi orang dibandingkan target yang ditetapkan. </p>{" "}
      </div>
      {target <= 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 px-5 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-700">Target belum tersedia</p>
          <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">Grafik akan ditampilkan setelah target orang tersedia pada data dashboard.</p>

          {realisasi > 0 && <p className="mt-3 text-sm font-semibold text-green-700">Realisasi saat ini: {formatNumber(realisasi)} orang</p>}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
            <div className="relative mx-auto h-[220px] w-full max-w-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="72%" outerRadius="90%" paddingAngle={donutData.length > 1 ? 3 : 0} startAngle={90} endAngle={-270} stroke="none" isAnimationActive>
                    {donutData.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>

                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold tracking-tight" style={{ color: achievementColor }}>
                  {formatPercentage(capaian)}
                </span>
                <span className="mt-1 text-xs font-medium text-slate-500">Capaian</span>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm bg-[#15406A]" />
                  <p className="text-sm font-medium text-slate-500">Target Orang</p>
                </div>
                <p className="mt-1 text-2xl font-bold text-[#15406A]">{formatNumber(target)}</p>
                <p className="mt-1 text-xs text-slate-500">Target yang ditetapkan</p>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm bg-green-600" />
                  <p className="text-sm font-medium text-slate-500">Realisasi Orang</p>
                </div>
                <p className="mt-1 text-2xl font-bold text-green-700">{formatNumber(realisasi)}</p>
                <p className="mt-1 text-xs text-slate-500">{formatPercentage(capaian)} dari target</p>
              </div>

              <div className="border-t border-slate-100 pt-4">
                {surplus > 0 ? (
                  <>
                    <p className="text-xs font-medium text-green-700">Kelebihan dari target</p>
                    <p className="mt-1 text-lg font-bold text-green-700">+{formatNumber(surplus)} orang</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-medium text-amber-700">Sisa target</p>
                    <p className="mt-1 text-lg font-bold text-amber-700">{formatNumber(sisaTarget)} orang</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <div className="mb-2 flex items-center justify-between gap-3 text-xs">
              <span className="font-medium text-slate-500">Progres terhadap target</span>
              <span className="font-bold text-slate-700">{formatNumber(Math.min(capaian, 100))}%</span>
            </div>

            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="Progres realisasi terhadap target" aria-valuenow={Math.min(capaian, 100)} aria-valuemin={0} aria-valuemax={100}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(capaian, 100)}%`,
                  backgroundColor: achievementColor,
                }}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-600" />
                Realisasi dalam target
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-slate-300" />
                Sisa target
              </span>
              {surplus > 0 && (
                <span className="flex items-center gap-1.5 text-green-700">
                  <span className="h-2 w-2 rounded-full bg-green-600" />
                  Surplus {formatNumber(surplus)} orang
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
