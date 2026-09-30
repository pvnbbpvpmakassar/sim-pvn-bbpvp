"use client";

import React, { useState, useEffect } from "react";
import { BarChart3, Table as TableIcon } from "lucide-react";
import { getDashboardRekapan, DashboardGroupData } from "@/app/actions/data";
import RekapanTable from "./dashboard-charts/RekapanTable";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<"CHART" | "REKAPAN">("REKAPAN");
  const [dashboardData, setDashboardData] = useState<DashboardGroupData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const res = await getDashboardRekapan();
      if (res.success && res.data) {
        setDashboardData(res.data as DashboardGroupData[]);
      }
      setIsLoading(false);
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#15406A]">Dashboard Utama</h1>
          <p className="text-gray-500 text-sm mt-1">Pantau grafik capaian dan rekapitulasi data secara menyeluruh.</p>
        </div>
      </div>

      {/* --- Sistem Tab --- */}
      <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("CHART")}
          className={`flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === "CHART" ? "bg-white text-[#15406A] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          <BarChart3 className="w-4 h-4" /> Lihat Chart
        </button>
        <button
          onClick={() => setActiveTab("REKAPAN")}
          className={`flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === "REKAPAN" ? "bg-white text-[#15406A] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          <TableIcon className="w-4 h-4" /> Lihat Rekapan
        </button>
      </div>

      {/* --- Konten Aktif --- */}
      {activeTab === "CHART" ? (
        <div className="flex h-64 items-center justify-center bg-white border border-gray-200 rounded-2xl shadow-sm">
          <p className="text-gray-400 font-medium">Modul Visualisasi Chart akan ditempatkan di sini...</p>
        </div>
      ) : isLoading ? (
        <div className="flex min-h-screen flex-col items-center justify-center">
          <div className="mb-6 flex items-end gap-1.5 h-12">
            <div className="w-2 rounded-full bg-[#15406A] animate-[loadingBar_1s_ease-in-out_infinite]" />
            <div className="w-2 rounded-full bg-[#15406A]/80 animate-[loadingBar_1s_ease-in-out_0.15s_infinite]" />
            <div className="w-2 rounded-full bg-[#15406A]/60 animate-[loadingBar_1s_ease-in-out_0.3s_infinite]" />
            <div className="w-2 rounded-full bg-[#15406A]/40 animate-[loadingBar_1s_ease-in-out_0.45s_infinite]" />
            <div className="w-2 rounded-full bg-[#15406A]/30 animate-[loadingBar_1s_ease-in-out_0.6s_infinite]" />
          </div>

          <p className="text-sm font-semibold text-[#15406A]">Memuat data LPKS</p>

          <p className="mt-1 text-xs text-slate-400">Menghubungkan ke database...</p>
        </div>  
      ) : (
        <RekapanTable data={dashboardData} />
      )}
    </div>
  );
}
