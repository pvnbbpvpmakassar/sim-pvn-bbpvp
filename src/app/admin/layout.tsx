// src/app/admin/layout.tsx
"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar"; // pastikan path import sesuai
import { Menu, Hexagon } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar Responsif (Menerima props untuk mode mobile) */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Area Konten Utama */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar Khusus Mobile (Menampilkan Tombol Hamburger) */}
        {/* Hanya tampil di layar berukuran kecil (< lg) */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-[#15406A] text-white shadow-md z-30">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors focus:outline-none" aria-label="Buka Menu">
            <Menu className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-2">
            <Hexagon className="w-5 h-5 text-blue-300" fill="currentColor" />
            <span className="font-extrabold text-sm tracking-wide">ADMIN PANEL</span>
          </div>
          <div className="w-9" /> {/* Spacer kosong agar teks berada di tengah */}
        </header>

        {/* Halaman Konten Utama (Scrollable) */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
