import React from "react";
import Image from "next/image";
import Link from "next/link";
import { LogIn, TrendingUp, Sparkles } from "lucide-react";
import LogoBBPVP from "@/assets/logo-bbpvp-makassar.png";

import PublicDashboardView from "@/app/public-dashboard/PublicDashboardView";

export default function PublicDashboardPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans selection:bg-[#15406A] selection:text-white">
      
      {/* --- NAVBAR GLASSMORPHISM --- */}
      <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-gray-200/50 shadow-[0_4px_30px_rgba(0,0,0,0.03)] transition-all duration-300">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            
            {/* Bagian Kiri: Logo dan Judul */}
            <div className="flex items-center gap-2.5 sm:gap-4 group cursor-default">
              <div className="h-14 w-14 items-center justify-center rounded-xl border border-white/50 bg-white p-2 shadow-sm shadow-black/10">
                <Image src={LogoBBPVP} alt="BBPVP Makassar" width={60} height={60} priority className="h-full w-full object-contain" />
              </div>
              <div className="flex flex-col justify-center">
                <h1 className="text-base sm:text-xl md:text-2xl font-black text-[#15406A] tracking-tight flex items-center gap-1 leading-none sm:leading-tight">
                  Dashboard <span className="text-amber-500">PVN 2026</span>
                </h1>
                <p className="text-[9px] sm:text-xs md:text-sm text-slate-500 font-medium tracking-wide mt-0.5 sm:mt-0 leading-tight">
                  Balai Pelatihan Vokasi & Produktivitas Makassar
                </p>
              </div>
            </div>
            
            {/* Bagian Kanan: Tombol Login */}
            <Link 
              href="/login" 
              className="shrink-0 group relative flex items-center gap-1.5 sm:gap-2 bg-[#15406A] hover:bg-[#0f2f4e] text-white px-4 py-2 sm:px-6 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm transition-all duration-300 hover:shadow-[0_8px_20px_rgba(21,64,106,0.25)] hover:-translate-y-0.5 overflow-hidden"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none"></div>
              <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:translate-x-0.5" />
              <span className="hidden sm:inline tracking-wide">Masuk Sistem</span>
              <span className="sm:hidden tracking-wide">Masuk</span>
            </Link>

          </div>
        </div>
      </nav>

      {/* --- MAIN CONTENT HEADER --- */}
      <main className="flex-grow max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 w-full">
        <div className="mb-6 sm:mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full bg-blue-100/50 border border-blue-200 text-blue-700 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-3 sm:mb-4">
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              Portal Publik
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#15406A] tracking-tight leading-snug">
              Rekapitulasi Anggaran & Realisasi
            </h2>
            <p className="text-slate-500 mt-2 sm:mt-3 text-sm sm:text-base md:text-lg max-w-3xl leading-relaxed">
              Pantau rincian anggaran, target, dan realisasi program secara transparan. Seluruh data di bawah ini terakumulasi otomatis dari sistem secara <i>real-time</i>.
            </p>
          </div>
        </div>

        {/* --- PANGGIL KOMPONEN KLIENT TANPA PROPS --- */}
        <PublicDashboardView />
      </main>
      
      {/* --- FOOTER --- */}
      <footer className="bg-white border-t border-gray-200 py-6 sm:py-8 mt-auto">
        <div className="max-w-[1400px] mx-auto px-4 text-center text-xs sm:text-sm text-slate-400 font-medium leading-relaxed">
          &copy; {new Date().getFullYear()} Dashboard PVN - Hak Cipta Dilindungi. <br className="sm:hidden" />
          <span className="hidden sm:inline"> | </span> 
          Balai Pelatihan Vokasi dan Produktivitas Makassar.
        </div>
      </footer>
      
    </div>
  );
}