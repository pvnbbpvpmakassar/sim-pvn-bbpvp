import React from "react";
import Link from "next/link";
import { LogIn, TrendingUp, Sparkles } from "lucide-react";

import PublicDashboardView from "@/app/public-dashboard/PublicDashboardView";

export default function PublicDashboardPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans selection:bg-[#15406A] selection:text-white">
      
      {/* --- NAVBAR GLASSMORPHISM --- */}
      <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-gray-200/50 shadow-[0_4px_30px_rgba(0,0,0,0.03)] transition-all duration-300">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            
            <div className="flex items-center gap-4 group cursor-default">
              <div className="w-12 h-12 bg-gradient-to-br from-[#15406A] to-[#2563eb] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-900/20 group-hover:scale-105 group-hover:rotate-3 transition-transform duration-300">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-[#15406A] tracking-tight flex items-center gap-1">
                  SIMPVN <span className="text-amber-500">Dashboard</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 font-medium tracking-wide">
                  Balai Pelatihan Vokasi & Produktivitas
                </p>
              </div>
            </div>
            
            <Link 
              href="/login" 
              className="group relative flex items-center gap-2 bg-[#15406A] hover:bg-[#0f2f4e] text-white px-6 py-2.5 rounded-full font-bold text-sm transition-all duration-300 hover:shadow-[0_8px_20px_rgba(21,64,106,0.25)] hover:-translate-y-0.5 overflow-hidden"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none"></div>
              <LogIn className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              <span className="hidden sm:inline tracking-wide">Masuk Sistem</span>
              <span className="sm:hidden tracking-wide">Masuk</span>
            </Link>

          </div>
        </div>
      </nav>

      {/* --- MAIN CONTENT HEADER --- */}
      <main className="flex-grow max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100/50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-widest mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Portal Publik
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-[#15406A] tracking-tight">
              Rekapitulasi Anggaran & Realisasi
            </h2>
            <p className="text-slate-500 mt-3 text-base sm:text-lg max-w-3xl leading-relaxed">
              Pantau rincian anggaran, target, dan realisasi program secara transparan. Seluruh data di bawah ini terakumulasi otomatis dari sistem secara <i>real-time</i>.
            </p>
          </div>
        </div>

        {/* --- PANGGIL KOMPONEN KLIENT TANPA PROPS (Karena ia mengurus fetch sendiri) --- */}
        <PublicDashboardView />
      </main>
      
      {/* --- FOOTER --- */}
      <footer className="bg-white border-t border-gray-200 py-8 mt-auto">
        <div className="max-w-[1400px] mx-auto px-4 text-center text-sm text-slate-400 font-medium">
          &copy; {new Date().getFullYear()} SIMPVN - Hak Cipta Dilindungi. <br className="sm:hidden" />
          <span className="hidden sm:inline"> | </span> 
          Balai Pelatihan Vokasi dan Produktivitas.
        </div>
      </footer>
      
    </div>
  );
}