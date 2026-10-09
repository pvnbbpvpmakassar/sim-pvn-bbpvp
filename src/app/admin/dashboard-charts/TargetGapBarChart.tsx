"use client";

import { useMemo, useState } from "react";

import {
Bar,
BarChart,
CartesianGrid,
Cell,
ReferenceLine,
ResponsiveContainer,
Tooltip,
XAxis,
YAxis,
} from "recharts";

import type { DashboardGroupData } from "@/app/actions/data";
import { combineRowMetrics, formatNumber } from "./chart-utils";

type TargetGapBarChartProps = {
data: DashboardGroupData[];
search?: string;
isLoading?: boolean;
};

type TargetGapItem = {
id: string;
kode: string;
nama: string;
target: number;
realisasi: number;
selisih: number;
kekurangan: number;
surplus: number;
};

type GapTooltipPayload = {
payload?: TargetGapItem;
};

type GapTooltipProps = {
active?: boolean;
payload?: GapTooltipPayload[];
};

const SHORTFALL_COLOR = "#D97706";
const SURPLUS_COLOR = "#16A34A";

function CustomTooltip({ active, payload }: GapTooltipProps) {
if (!active || !payload?.length) return null;

const item = payload[0]?.payload;

if (!item) return null;

return ( <div className="min-w-52 rounded-xl border border-slate-200 bg-white p-4 shadow-xl"> <p className="mb-3 text-sm font-bold text-slate-800">{item.nama}</p>


  <div className="space-y-2 text-sm">
    <div className="flex items-center justify-between gap-5">
      <span className="text-slate-500">Target</span>
      <span className="font-semibold text-[#15406A]">
        {formatNumber(item.target)}
      </span>
    </div>

    <div className="flex items-center justify-between gap-5">
      <span className="text-slate-500">Realisasi</span>
      <span className="font-semibold text-green-700">
        {formatNumber(item.realisasi)}
      </span>
    </div>

    <div className="flex items-center justify-between gap-5 border-t border-slate-100 pt-2">
      <span className="text-slate-500">
        {item.selisih < 0 ? "Kekurangan" : "Surplus"}
      </span>
      <span
        className={`font-bold ${
          item.selisih < 0 ? "text-amber-700" : "text-green-700"
        }`}
      >
        {item.selisih > 0 ? "+" : ""}
        {formatNumber(item.selisih)} orang
      </span>
    </div>
  </div>
</div>


);
}

export default function TargetGapBarChart({
data,
search = "",
isLoading = false,
}: TargetGapBarChartProps) {
const [keyword, setKeyword] = useState("");
const [showSurplus, setShowSurplus] = useState(true);

const rows = useMemo<TargetGapItem[]>(() => {
const group = data.find(
(item) => item.groupName.trim().toLowerCase() === "produktivitas",
);


if (!group) return [];

const normalizedSearch = `${search} ${keyword}`.trim().toLowerCase();

return group.rows
  .map((row) => {
    const metrics = combineRowMetrics(row);
    const target = metrics.orang;
    const realisasi = metrics.realisasiOrang;
    const selisih = realisasi - target;

    return {
      id: row.id,
      kode: row.kode,
      nama: row.ro,
      target,
      realisasi,
      selisih,
      kekurangan: Math.max(target - realisasi, 0),
      surplus: Math.max(realisasi - target, 0),
    };
  })
  .filter((row) => {
    if (!normalizedSearch) return true;

    return (
      row.nama.toLowerCase().includes(normalizedSearch) ||
      row.kode.toLowerCase().includes(normalizedSearch)
    );
  })
  .filter((row) => showSurplus || row.selisih < 0)
  .sort((a, b) => b.kekurangan - a.kekurangan);


}, [data, search, keyword, showSurplus]);

const summary = useMemo(() => {
return rows.reduce(
(total, row) => ({
target: total.target + row.target,
realisasi: total.realisasi + row.realisasi,
kekurangan: total.kekurangan + row.kekurangan,
surplus: total.surplus + row.surplus,
roBelumTercapai:
total.roBelumTercapai + (row.kekurangan > 0 ? 1 : 0),
roTercapai: total.roTercapai + (row.kekurangan === 0 ? 1 : 0),
}),
{
target: 0,
realisasi: 0,
kekurangan: 0,
surplus: 0,
roBelumTercapai: 0,
roTercapai: 0,
},
);
}, [rows]);

const chartData = rows.map((row) => ({
...row,
gap: row.selisih,
}));

if (isLoading) {
return ( <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"> <div className="mb-6 space-y-2"> <div className="h-5 w-56 animate-pulse rounded bg-slate-200" /> <div className="h-4 w-72 max-w-full animate-pulse rounded bg-slate-100" /> </div>


    <div className="space-y-4">
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className="flex items-center gap-4">
          <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
          <div className="h-7 flex-1 animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </div>
  </section>
);


}

return ( <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md sm:p-6"> <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"> <div> <h2 className="text-base font-bold text-slate-900 sm:text-lg">
Analisis Kekurangan Target per RO </h2> <p className="mt-1 text-sm leading-5 text-slate-500">
Selisih realisasi terhadap target orang pada setiap RO
Produktivitas. </p> </div>


    <label className="flex cursor-pointer items-center gap-2 self-start rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600">
      <input
        type="checkbox"
        checked={showSurplus}
        onChange={(event) => setShowSurplus(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300 accent-[#15406A]"
      />
      Tampilkan RO yang melampaui target
    </label>
  </div>

  <div className="mb-5">
    <div className="relative w-full sm:max-w-sm">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      >
        <circle cx="10.8" cy="10.8" r="6.8" />
        <path d="m16 16 4 4" strokeLinecap="round" />
      </svg>

      <input
        type="search"
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
        placeholder="Cari nama atau kode RO..."
        aria-label="Cari RO untuk analisis target"
        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-[#15406A] focus:bg-white focus:ring-2 focus:ring-blue-100"
      />
    </div>
  </div>

  <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
    <div className="rounded-xl bg-amber-50 p-4">
      <p className="text-xs font-medium text-amber-700">
        Total Kekurangan
      </p>
      <p className="mt-1 text-xl font-bold text-amber-700">
        {formatNumber(summary.kekurangan)}
      </p>
      <p className="mt-1 text-xs text-amber-700">
        {summary.roBelumTercapai} RO belum mencapai target
      </p>
    </div>

    <div className="rounded-xl bg-green-50 p-4">
      <p className="text-xs font-medium text-green-700">
        Total Surplus
      </p>
      <p className="mt-1 text-xl font-bold text-green-700">
        {formatNumber(summary.surplus)}
      </p>
      <p className="mt-1 text-xs text-green-700">
        Akumulasi realisasi di atas target
      </p>
    </div>

    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-medium text-slate-500">
        RO Mencapai Target
      </p>
      <p className="mt-1 text-xl font-bold text-[#15406A]">
        {summary.roTercapai}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Dari {rows.length} RO yang ditampilkan
      </p>
    </div>
  </div>

  {chartData.length === 0 ? (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 px-5 text-center">
      <p className="text-sm font-semibold text-slate-700">
        Tidak ada data yang sesuai
      </p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
        Coba ubah kata kunci pencarian atau aktifkan kembali tampilan RO
        yang telah melampaui target.
      </p>
    </div>
  ) : (
    <>
      <div
        className="w-full"
        style={{
          height: Math.max(260, chartData.length * 54 + 45),
          maxHeight: 620,
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 8, right: 24, left: 12, bottom: 8 }}
            barCategoryGap="28%"
          >
            <CartesianGrid
              stroke="#E2E8F0"
              strokeDasharray="4 4"
              horizontal={false}
            />

            <XAxis
              type="number"
              tick={{ fill: "#64748B", fontSize: 11 }}
              axisLine={{ stroke: "#CBD5E1" }}
              tickLine={false}
              tickFormatter={(value: number) => formatNumber(value)}
            />

            <YAxis
              type="category"
              dataKey="nama"
              width={125}
              tick={{ fill: "#475569", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickMargin={8}
            />

            <ReferenceLine x={0} stroke="#94A3B8" />

            <Tooltip content={<CustomTooltip />} />

            <Bar
              dataKey="gap"
              name="Selisih"
              radius={[0, 5, 5, 0]}
              maxBarSize={28}
              minPointSize={3}
            >
              {chartData.map((item) => (
                <Cell
                  key={item.id}
                  fill={
                    item.selisih < 0 ? SHORTFALL_COLOR : SURPLUS_COLOR
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-600" />
          Kekurangan target
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-green-600" />
          Surplus target
        </span>
        <span className="text-slate-400">
          Batang ke kiri berarti target belum tercapai.
        </span>
      </div>
    </>
  )}
</section>


);
}
