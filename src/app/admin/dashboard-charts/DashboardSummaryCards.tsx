
"use client";

import React from "react";
import {
  Users,
  UserCheck,
  TrendingUp,
  Target,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

import type { DashboardSummary } from "./chart-types";
import { formatNumber, formatPercentage } from "./chart-utils";

type DashboardSummaryCardsProps = {
  summary: DashboardSummary;
  isLoading?: boolean;
};

type SummaryCardProps = {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  iconBackground: string;
  footer?: React.ReactNode;
};

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
  iconColor,
  iconBackground,
  footer,
}: SummaryCardProps) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
            {value}
          </p>

          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            {description}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBackground} ${iconColor}`}
        >
          <Icon size={21} strokeWidth={2} />
        </div>
      </div>

      {footer && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          {footer}
        </div>
      )}
    </article>
  );
}

function SummaryCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex justify-between">
        <div className="space-y-3">
          <div className="h-3 w-24 rounded bg-slate-200" />
          <div className="h-8 w-32 rounded bg-slate-200" />
          <div className="h-3 w-36 rounded bg-slate-100" />
        </div>
        <div className="h-11 w-11 rounded-xl bg-slate-100" />
      </div>
      <div className="mt-5 h-1.5 rounded-full bg-slate-100" />
    </div>
  );
}

export default function DashboardSummaryCards({
  summary,
  isLoading = false,
}: DashboardSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SummaryCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  const {
    targetOrang,
    realisasiOrang,
    selisihOrang,
    sisaTargetOrang,
    persentaseCapaian,
  } = summary;

  const hasTarget = targetOrang > 0;
  const progressWidth = hasTarget
    ? Math.min(Math.max(persentaseCapaian, 0), 100)
    : 0;

  const isOverTarget = persentaseCapaian > 100;

  return (
    <section
      aria-label="Ringkasan capaian dashboard"
      className="space-y-4"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">
            Ringkasan Capaian
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Ikhtisar target dan realisasi peserta berdasarkan filter aktif.
          </p>
        </div>

        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
          <span className="h-1.5 w-1.5 rounded-full bg-[#15406A]" />
          Data agregat
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Target Orang"
          value={formatNumber(targetOrang)}
          description="Total target peserta pelatihan dan sertifikasi."
          icon={Target}
          iconColor="text-[#15406A]"
          iconBackground="bg-blue-50"
          footer={
            <p className="text-xs text-slate-500">
              Target keseluruhan
            </p>
          }
        />

        <SummaryCard
          title="Realisasi Orang"
          value={formatNumber(realisasiOrang)}
          description="Jumlah peserta yang telah terealisasi."
          icon={UserCheck}
          iconColor="text-emerald-700"
          iconBackground="bg-emerald-50"
          footer={
            <div className="flex items-center gap-1.5 text-xs">
              {selisihOrang >= 0 ? (
                <ArrowUpRight
                  size={15}
                  className="text-emerald-600"
                />
              ) : (
                <ArrowDownRight
                  size={15}
                  className="text-amber-600"
                />
              )}

              <span
                className={
                  selisihOrang >= 0
                    ? "font-semibold text-emerald-700"
                    : "font-semibold text-amber-700"
                }
              >
                {selisihOrang >= 0 ? "+" : ""}
                {formatNumber(selisihOrang)} orang
              </span>

              <span className="text-slate-400">
                dibanding target
              </span>
            </div>
          }
        />

        <SummaryCard
          title="Persentase Capaian"
          value={formatPercentage(persentaseCapaian)}
          description="Perbandingan realisasi dengan target peserta."
          icon={TrendingUp}
          iconColor="text-violet-700"
          iconBackground="bg-violet-50"
          footer={
            <div>
              <div className="mb-2 flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-500">
                  {isOverTarget
                    ? "Target telah terlampaui"
                    : hasTarget
                      ? "Progres pencapaian"
                      : "Belum ada target"}
                </span>

                <span className="font-semibold text-[#15406A]">
                  {hasTarget ? formatPercentage(persentaseCapaian) : "—"}
                </span>
              </div>

              <div
                className="h-1.5 overflow-hidden rounded-full bg-slate-100"
                role="progressbar"
                aria-label="Progres capaian peserta"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressWidth}
              >
                <div
                  className="h-full rounded-full bg-[#15406A] transition-all duration-500"
                  style={{ width: `${progressWidth}%` }}
                />
              </div>
            </div>
          }
        />

        <SummaryCard
          title="Sisa Target"
          value={formatNumber(sisaTargetOrang)}
          description="Peserta tambahan yang diperlukan untuk memenuhi target."
          icon={Users}
          iconColor="text-amber-700"
          iconBackground="bg-amber-50"
          footer={
            <p className="text-xs text-slate-500">
              {sisaTargetOrang === 0
                ? "Target sudah terpenuhi."
                : hasTarget
                  ? `${formatPercentage(
                      (sisaTargetOrang / targetOrang) * 100,
                    )} dari target masih tersisa`
                  : "Target belum ditetapkan."}
            </p>
          }
        />
      </div>
    </section>
  );
}
