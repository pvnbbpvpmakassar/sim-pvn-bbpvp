"use client";

import React, { useState, useEffect } from "react";
import { BarChart3, Table as TableIcon, LayoutDashboard } from "lucide-react";

// Sesuaikan path import ini jika letak folder Anda berbeda
import RekapanTable, { DashboardGroupData } from "@/app/admin/dashboard-charts/RekapanTable";
import { getDashboardRekapan } from "@/app/actions/data";

export default function PublicDashboardView() {
  const [activeTab, setActiveTab] = useState<"CHART" | "REKAPAN">("REKAPAN");
  const [dashboardData, setDashboardData] = useState<DashboardGroupData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Penarikan data dipindah ke sisi klien agar bisa memicu animasi loading
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
    <div className="w-full animate-in fade-in duration-500">
      
      {/* --- Sistem Tab (Sesuai Gaya Admin) --- */}
      <div className="flex bg-gray-100 p-1 rounded-xl w-fit mb-8 border border-gray-200/60 shadow-inner mx-auto sm:mx-0">
        <button
          onClick={() => setActiveTab("CHART")}
          className={`flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-lg transition-all ${
            activeTab === "CHART" 
              ? "bg-white text-[#15406A] shadow-sm" 
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
          }`}
        >
          <BarChart3 className="w-4 h-4" /> Lihat Chart
        </button>
        <button
          onClick={() => setActiveTab("REKAPAN")}
          className={`flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-lg transition-all ${
            activeTab === "REKAPAN" 
              ? "bg-white text-[#15406A] shadow-sm" 
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
          }`}
        >
          <TableIcon className="w-4 h-4" /> Lihat Rekapan
        </button>
      </div>

      {/* --- KONTEN DINAMIS BERDASARKAN STATE & LOADING --- */}
      {activeTab === "CHART" ? (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 min-h-[400px]">
          <div className="flex flex-col items-center justify-center h-full py-20 text-gray-400">
             <BarChart3 className="w-16 h-16 mb-4 opacity-50" />
             <p className="font-medium text-lg">Area Komponen Grafik Anda</p>
          </div>
        </div>
      ) : isLoading ? (
        <div className="flex min-h-[50vh] flex-col items-center justify-center bg-white rounded-3xl border border-gray-200 shadow-sm">
          <div className="mb-6 flex items-end gap-1.5 h-12">
            <div className="w-2 rounded-full bg-[#15406A] animate-[loadingBar_1s_ease-in-out_infinite]" />
            <div className="w-2 rounded-full bg-[#15406A]/80 animate-[loadingBar_1s_ease-in-out_0.15s_infinite]" />
            <div className="w-2 rounded-full bg-[#15406A]/60 animate-[loadingBar_1s_ease-in-out_0.3s_infinite]" />
            <div className="w-2 rounded-full bg-[#15406A]/40 animate-[loadingBar_1s_ease-in-out_0.45s_infinite]" />
            <div className="w-2 rounded-full bg-[#15406A]/30 animate-[loadingBar_1s_ease-in-out_0.6s_infinite]" />
          </div>
          <p className="text-sm font-semibold text-[#15406A]">Memuat data Tabel Rekapan</p>
          <p className="mt-1 text-xs text-slate-400">Menghubungkan ke database...</p>
        </div>
      ) : dashboardData.length > 0 ? (
        <RekapanTable data={dashboardData} />
      ) : (
        <div className="bg-white p-16 text-center rounded-3xl shadow-sm border border-gray-200 flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
            <LayoutDashboard className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-gray-700">Belum Ada Data</h3>
          <p className="text-gray-500 mt-2">Data rekapitulasi dashboard belum tersedia atau gagal dimuat.</p>
        </div>
      )}
    </div>
  );
}