"use client";

import React, { useState, useEffect } from "react";
import { BarChart3, Table as TableIcon } from "lucide-react";
import { getDashboardRekapan, type DashboardGroupData } from "@/app/actions/data";
import RekapanTable from "./dashboard-charts/RekapanTable";
import DashboardCharts from "./dashboard-charts/DashboardCharts";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<"CHART" | "REKAPAN">("REKAPAN");
  const [dashboardData, setDashboardData] = useState<DashboardGroupData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const res = await getDashboardRekapan();

        if (!isMounted) return;

        if (res.success && res.data) {
          setDashboardData(res.data as DashboardGroupData[]);
        } else {
          setDashboardData([]);
          setErrorMessage("Data dashboard gagal dimuat. Silakan coba kembali.");
        }
      } catch (error) {
        console.error("Gagal mengambil data dashboard:", error);

        if (isMounted) {
          setDashboardData([]);
          setErrorMessage("Terjadi kesalahan saat mengambil data dari database.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Dashboard */}{" "}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        {" "}
        <div>
          {" "}
          <h1 className="text-2xl font-bold text-[#15406A]">Dashboard Utama </h1> <p className="mt-1 text-sm text-gray-500">Pantau grafik capaian dan rekapitulasi data secara menyeluruh. </p>{" "}
        </div>{" "}
      </div>
      {/* Navigasi Tab */}
      <div className="flex w-fit rounded-xl bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => setActiveTab("CHART")}
          aria-pressed={activeTab === "CHART"}
          className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-bold transition-all ${activeTab === "CHART" ? "bg-white text-[#15406A] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          <BarChart3 className="h-4 w-4" />
          Lihat Chart
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("REKAPAN")}
          aria-pressed={activeTab === "REKAPAN"}
          className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-bold transition-all ${activeTab === "REKAPAN" ? "bg-white text-[#15406A] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          <TableIcon className="h-4 w-4" />
          Lihat Rekapan
        </button>
      </div>
      {/* Konten Tab Aktif */}
      {isLoading ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white">
          <div className="mb-6 flex h-12 items-end gap-1.5">
            <div className="h-5 w-2 animate-[loadingBar_1s_ease-in-out_infinite] rounded-full bg-[#15406A]" />
            <div className="h-8 w-2 animate-[loadingBar_1s_ease-in-out_0.15s_infinite] rounded-full bg-[#15406A]/80" />
            <div className="h-10 w-2 animate-[loadingBar_1s_ease-in-out_0.3s_infinite] rounded-full bg-[#15406A]/60" />
            <div className="h-7 w-2 animate-[loadingBar_1s_ease-in-out_0.45s_infinite] rounded-full bg-[#15406A]/40" />
            <div className="h-5 w-2 animate-[loadingBar_1s_ease-in-out_0.6s_infinite] rounded-full bg-[#15406A]/30" />
          </div>

          <p className="text-sm font-semibold text-[#15406A]">Memuat data dashboard</p>
          <p className="mt-1 text-xs text-slate-400">Menghubungkan ke database...</p>
        </div>
      ) : errorMessage ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center">
          <p className="font-semibold text-red-700">{errorMessage}</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-lg bg-[#15406A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#103454]">
            Muat Ulang Halaman
          </button>
        </div>
      ) : activeTab === "CHART" ? (
        <DashboardCharts data={dashboardData} isLoading={isLoading} />
      ) : (
        <RekapanTable data={dashboardData} />
      )}
    </div>
  );
}
