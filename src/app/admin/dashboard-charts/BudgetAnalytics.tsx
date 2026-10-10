"use client";

import { useMemo, type ReactNode } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Banknote, CircleDollarSign, Gauge, Wallet } from "lucide-react";
import type { DashboardGroupData } from "@/app/actions/data";
import CategoryChartPanel from "./CategoryChartPanel";
import { calculateDashboardSummary, combineRowMetrics } from "./chart-utils";

const NAVY = "#15406A";
const GREEN = "#16A34A";
const AMBER = "#D97706";
const VIOLET = "#7C3AED";
const TEAL = "#0F766E";
const COLORS = [NAVY, GREEN, AMBER, VIOLET, TEAL, "#DB2777", "#64748B", "#0891B2"];
const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);
const shortMoney = (value: number) => {
  const n = Number(value) || 0;
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} rb`;
  return money(n);
};

type BudgetDatum = { name: string; anggaran: number; realisasi: number; sisa: number; persentase: number; targetOrang: number; realisasiOrang: number };
function useBudgetData(data: DashboardGroupData[]) {
  return useMemo<BudgetDatum[]>(() => data.map((group) => {
    const summary = calculateDashboardSummary(group.rows);
    const sisa = summary.totalAnggaran - summary.realisasiAnggaran;
    return {
      name: group.groupName,
      anggaran: summary.totalAnggaran,
      realisasi: summary.realisasiAnggaran,
      sisa,
      persentase: summary.totalAnggaran > 0 ? summary.realisasiAnggaran / summary.totalAnggaran * 100 : 0,
      targetOrang: summary.targetOrang,
      realisasiOrang: summary.realisasiOrang,
    };
  }).filter((item) => item.anggaran !== 0 || item.realisasi !== 0), [data]);
}

function Panel({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
    <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Wallet size={20} /></div>
      <div><h3 className="text-base font-bold text-slate-800">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></div>
    </div>
    <div className="p-4 sm:p-5">{children}</div>
  </section>;
}

function BudgetVsRealization({ data }: { data: DashboardGroupData[] }) {
  const rows = useBudgetData(data);
  if (!rows.length) return <EmptyBudget />;
  return <Panel title="Anggaran vs Realisasi per Modul" description="Bandingkan pagu anggaran dengan nilai yang sudah direalisasikan pada setiap modul.">
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <MiniStat label="Total Anggaran" value={shortMoney(rows.reduce((s, r) => s + r.anggaran, 0))} color="text-[#15406A]" />
      <MiniStat label="Realisasi Anggaran" value={shortMoney(rows.reduce((s, r) => s + r.realisasi, 0))} color="text-emerald-700" />
      <MiniStat label="Sisa Anggaran" value={shortMoney(rows.reduce((s, r) => s + r.sisa, 0))} color="text-amber-700" />
    </div>
    <div className="h-[330px] w-full">
      <ResponsiveContainer width="100%" height="100%"><BarChart data={rows} margin={{ top: 8, right: 8, left: 10, bottom: 24 }} barGap={5}>
        <CartesianGrid stroke="#E2E8F0" strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="name" tick={{ fill: "#64748B", fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={58} />
        <YAxis tickFormatter={shortMoney} tick={{ fill: "#64748B", fontSize: 10 }} width={76} />
        <Tooltip formatter={(value) => money(Number(value))} contentStyle={{ borderRadius: 12, borderColor: "#E2E8F0", fontSize: 12 }} />
        <Legend />
        <Bar dataKey="anggaran" name="Anggaran" fill={NAVY} radius={[5, 5, 0, 0]} maxBarSize={32} />
        <Bar dataKey="realisasi" name="Realisasi" fill={GREEN} radius={[5, 5, 0, 0]} maxBarSize={32} />
      </BarChart></ResponsiveContainer>
    </div>
  </Panel>;
}

function RemainingBudget({ data }: { data: DashboardGroupData[] }) {
  const rows = useBudgetData(data).filter((r) => r.anggaran > 0).sort((a, b) => b.sisa - a.sisa);
  if (!rows.length) return <EmptyBudget />;
  return <Panel title="Sisa Anggaran per Modul" description="Menunjukkan ruang anggaran yang belum terserap; nilai negatif berarti realisasi melampaui anggaran yang tercatat.">
    <div className="h-[330px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 12, bottom: 4 }}>
      <CartesianGrid stroke="#E2E8F0" strokeDasharray="4 4" horizontal={false} />
      <XAxis type="number" tickFormatter={shortMoney} tick={{ fill: "#64748B", fontSize: 10 }} />
      <YAxis type="category" dataKey="name" width={112} tick={{ fill: "#475569", fontSize: 11 }} />
      <Tooltip formatter={(value) => money(Number(value))} contentStyle={{ borderRadius: 12, borderColor: "#E2E8F0", fontSize: 12 }} />
      <Bar dataKey="sisa" name="Sisa Anggaran" radius={[0, 5, 5, 0]} maxBarSize={25}>{rows.map((r, i) => <Cell key={r.name} fill={r.sisa < 0 ? "#DC2626" : COLORS[i % COLORS.length]} />)}</Bar>
    </BarChart></ResponsiveContainer></div>
  </Panel>;
}

function AbsorptionRate({ data }: { data: DashboardGroupData[] }) {
  const rows = useBudgetData(data).filter((r) => r.anggaran > 0).sort((a, b) => b.persentase - a.persentase);
  if (!rows.length) return <EmptyBudget />;
  return <Panel title="Persentase Penyerapan Anggaran" description="Persentase dihitung dari realisasi anggaran dibagi total anggaran. Angka di atas 100% perlu ditinjau kembali.">
    <div className="h-[330px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={rows} margin={{ top: 20, right: 12, left: -12, bottom: 25 }}>
      <CartesianGrid stroke="#E2E8F0" strokeDasharray="4 4" vertical={false} />
      <XAxis dataKey="name" tick={{ fill: "#64748B", fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={60} />
      <YAxis tickFormatter={(v) => `${v}%`} tick={{ fill: "#64748B", fontSize: 10 }} />
      <Tooltip formatter={(value) => [`${Number(value).toLocaleString("id-ID", { maximumFractionDigits: 2 })}%`, "Penyerapan"]} contentStyle={{ borderRadius: 12, borderColor: "#E2E8F0", fontSize: 12 }} />
      <Bar dataKey="persentase" name="Penyerapan" radius={[5, 5, 0, 0]} maxBarSize={38}>{rows.map((r) => <Cell key={r.name} fill={r.persentase >= 100 ? GREEN : r.persentase >= 75 ? NAVY : AMBER} />)}</Bar>
    </BarChart></ResponsiveContainer></div>
  </Panel>;
}

function BudgetDistribution({ data }: { data: DashboardGroupData[] }) {
  const rows = useBudgetData(data).filter((r) => r.anggaran > 0);
  if (!rows.length) return <EmptyBudget />;
  const total = rows.reduce((s, r) => s + r.anggaran, 0);
  return <Panel title="Komposisi Alokasi Anggaran" description="Porsi setiap modul terhadap total anggaran dalam kategori yang sedang dipilih.">
    <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-[1fr_1.1fr]">
      <div className="relative h-[260px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={rows} dataKey="anggaran" nameKey="name" innerRadius={65} outerRadius={98} paddingAngle={3} stroke="white" strokeWidth={2}>{rows.map((r, i) => <Cell key={r.name} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip formatter={(value) => money(Number(value))} contentStyle={{ borderRadius: 12, borderColor: "#E2E8F0", fontSize: 12 }} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-xs text-slate-500">Total anggaran</span><strong className="mt-1 max-w-[130px] text-center text-sm font-black text-slate-800">{shortMoney(total)}</strong></div></div>
      <div className="space-y-3">{rows.map((r, i) => <div key={r.name} className="space-y-1"><div className="flex items-center justify-between gap-3 text-xs"><span className="flex min-w-0 items-center gap-2 text-slate-600"><span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} /><span className="truncate">{r.name}</span></span><strong className="shrink-0 text-slate-800">{total ? (r.anggaran / total * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 }) : 0}%</strong></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${total ? r.anggaran / total * 100 : 0}%`, background: COLORS[i % COLORS.length] }} /></div><p className="text-right text-[11px] text-slate-500">{money(r.anggaran)}</p></div>)}</div>
    </div>
  </Panel>;
}

function ROPudgetRanking({ data }: { data: DashboardGroupData[] }) {
  const rows = useMemo(() => data.flatMap((group) => group.rows.map((row) => {
    const metrics = combineRowMetrics(row);
    return { name: row.ro || row.kode, kode: row.kode, anggaran: metrics.anggaran, realisasi: metrics.realisasiAnggaran, sisa: metrics.anggaran - metrics.realisasiAnggaran };
  })).filter((r) => r.anggaran !== 0 || r.realisasi !== 0).sort((a, b) => b.anggaran - a.anggaran).slice(0, 10), [data]);
  if (!rows.length) return <EmptyBudget />;
  return <Panel title="10 RO dengan Anggaran Terbesar" description="Identifikasi rincian output dengan alokasi terbesar beserta realisasi anggarannya.">
    <div className="mb-3 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600">Menampilkan {rows.length} RO teratas berdasarkan nilai anggaran pada kategori aktif.</div>
    <div className="h-[350px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={rows} layout="vertical" margin={{ top: 4, right: 12, left: 12, bottom: 4 }} barGap={3}>
      <CartesianGrid stroke="#E2E8F0" strokeDasharray="4 4" horizontal={false} />
      <XAxis type="number" tickFormatter={shortMoney} tick={{ fill: "#64748B", fontSize: 10 }} />
      <YAxis type="category" dataKey="name" width={145} tick={{ fill: "#475569", fontSize: 10 }} />
      <Tooltip formatter={(value) => money(Number(value))} contentStyle={{ borderRadius: 12, borderColor: "#E2E8F0", fontSize: 12 }} />
      <Legend /><Bar dataKey="anggaran" name="Anggaran" fill={NAVY} radius={[0, 4, 4, 0]} maxBarSize={18} /><Bar dataKey="realisasi" name="Realisasi" fill={GREEN} radius={[0, 4, 4, 0]} maxBarSize={18} />
    </BarChart></ResponsiveContainer></div>
  </Panel>;
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3"><p className="text-[11px] font-medium text-slate-500">{label}</p><p className={`mt-1 text-lg font-black tracking-tight ${color}`}>{value}</p></div>;
}
function EmptyBudget() { return <div className="flex h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center"><CircleDollarSign size={26} className="text-slate-300" /><p className="mt-2 text-sm font-semibold text-slate-600">Data anggaran belum tersedia</p><p className="mt-1 text-xs text-slate-400">Pastikan anggaran dan realisasi anggaran sudah tercatat.</p></div>; }

export default function BudgetAnalytics({ data }: { data: DashboardGroupData[] }) {
  return <section className="space-y-4">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2"><Banknote className="text-emerald-700" size={23} /><h2 className="text-xl font-black tracking-tight text-slate-900">Analisis Anggaran</h2></div><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">Lima sudut pandang untuk memantau pagu, realisasi, sisa, komposisi, dan penyerapan anggaran. Setiap chart memiliki switch Gabungan, ABT, dan NON-ABT secara mandiri.</p></div><div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800"><Gauge size={14} /> 5 visualisasi anggaran</div></div>
    <div className="grid grid-cols-1 gap-5 2xl:grid-cols-2">
      <CategoryChartPanel data={data} title="Kategori data — Anggaran vs Realisasi"><BudgetVsRealization data={data} /></CategoryChartPanel>
      <CategoryChartPanel data={data} title="Kategori data — Sisa Anggaran"><RemainingBudget data={data} /></CategoryChartPanel>
      <CategoryChartPanel data={data} title="Kategori data — Penyerapan Anggaran"><AbsorptionRate data={data} /></CategoryChartPanel>
      <CategoryChartPanel data={data} title="Kategori data — Komposisi Anggaran"><BudgetDistribution data={data} /></CategoryChartPanel>
      <CategoryChartPanel data={data} title="Kategori data — Ranking Anggaran RO" className="2xl:col-span-2"><ROPudgetRanking data={data} /></CategoryChartPanel>
    </div>
  </section>;
}
