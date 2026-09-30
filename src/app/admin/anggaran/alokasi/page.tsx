"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Download, Trash2, Plus, AlertCircle, RefreshCw, CheckCircle } from "lucide-react";

// Impor fungsi Server Action
import { getAlokasiAnggaran, simpanBulkAlokasiAnggaran, AlokasiRowData } from "@/app/actions/data";

type ModalConfig = { isOpen: boolean; type: "confirm" | "success" | "error"; title: string; message: string; onConfirm?: () => void };

export default function AlokasiAnggaranPage() {
  const [rowsABT, setRowsABT] = useState<AlokasiRowData[]>([]);
  const [rowsNONABT, setRowsNONABT] = useState<AlokasiRowData[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState<ModalConfig>({ isOpen: false, type: "confirm", title: "", message: "" });

  const closeModal = () => setModal({ ...modal, isOpen: false });
  
  // Fungsi format Rupiah untuk bagian Total (menggunakan Rp.)
  const formatRp = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);
  
  // Fungsi format pemisah ribuan untuk Input (hanya angka dan titik)
  const formatInputAngka = (value: number) => value === 0 ? "" : new Intl.NumberFormat("id-ID").format(value);

  // Fungsi Kalkulasi Persen yang kebal terhadap NaN
  const hitungPersen = (realisasi: number, anggaran: number) => {
    const real = Number(realisasi) || 0;
    const angg = Number(anggaran) || 0;
    return angg > 0 ? ((real / angg) * 100).toFixed(2) : "0.00";
  };

  // --- Tarik Data Saat Render Pertama ---
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const res = await getAlokasiAnggaran();
      
      if (res.success && res.data) {
        setRowsABT(res.data.abt);
        setRowsNONABT(res.data.nonAbt);
      } else {
        setModal({ isOpen: true, type: "error", title: "Gagal Memuat", message: res.error || "Gagal menarik data dari database." });
      }
      setIsLoading(false);
    };
    fetchData();
  }, []);

  // --- Fungsi Khusus Menangani Input Anggaran/Realisasi (Konversi String ke Number) ---
  const handleAngkaChange = (valStr: string, id: string, field: "anggaran" | "realisasi", isABT: boolean) => {
    // Buang semua karakter yang bukan angka
    const rawValue = valStr.replace(/[^0-9]/g, "");
    // Ubah ke integer, jika kosong jadikan 0
    const numValue = rawValue ? parseInt(rawValue, 10) : 0;
    
    if (isABT) {
      setRowsABT(rowsABT.map(r => r.id === id ? { ...r, [field]: numValue } : r));
    } else {
      setRowsNONABT(rowsNONABT.map(r => r.id === id ? { ...r, [field]: numValue } : r));
    }
  };

  // --- Manipulasi ABT ---
  const tambahABT = () => setRowsABT([...rowsABT, { id: crypto.randomUUID(), nama_modul: "", anggaran: 0, realisasi: 0 }]);
  const hapusABT = (id: string) => setModal({ isOpen: true, type: "confirm", title: "Hapus Baris?", message: "Hapus alokasi ini?", onConfirm: () => { setRowsABT(rowsABT.filter(r => r.id !== id)); closeModal(); } });
  const updateTextABT = (id: string, value: string) => setRowsABT(rowsABT.map(r => r.id === id ? { ...r, nama_modul: value } : r));

  // --- Manipulasi NON-ABT ---
  const tambahNONABT = () => setRowsNONABT([...rowsNONABT, { id: crypto.randomUUID(), nama_modul: "", anggaran: 0, realisasi: 0 }]);
  const hapusNONABT = (id: string) => setModal({ isOpen: true, type: "confirm", title: "Hapus Baris?", message: "Hapus alokasi ini?", onConfirm: () => { setRowsNONABT(rowsNONABT.filter(r => r.id !== id)); closeModal(); } });
  const updateTextNONABT = (id: string, value: string) => setRowsNONABT(rowsNONABT.map(r => r.id === id ? { ...r, nama_modul: value } : r));

  const bersihkanTabel = () => {
    setModal({
      isOpen: true, type: "confirm", title: "Bersihkan Semua Tabel?", message: "Hapus semua data di tabel ABT dan NON-ABT pada layar ini?",
      onConfirm: () => { setRowsABT([]); setRowsNONABT([]); closeModal(); }
    });
  };

  const simpanData = async () => {
    setIsSaving(true);
    const result = await simpanBulkAlokasiAnggaran(rowsABT, rowsNONABT);
    
    if (result.success) {
      setModal({ isOpen: true, type: "success", title: "Berhasil", message: "Data Alokasi Anggaran berhasil disimpan ke Database!" });
    } else {
      setModal({ isOpen: true, type: "error", title: "Gagal", message: `Terjadi kesalahan saat menyimpan: ${result.error}` });
    }
    setIsSaving(false);
  };

  // --- Komponen Render Tabel ---
  const renderTable = (
    title: string, 
    rows: AlokasiRowData[], 
    tambahFn: () => void, 
    hapusFn: (id: string) => void, 
    updateTextFn: (id: string, value: string) => void,
    isABT: boolean
  ) => {
    const totalAnggaran = rows.reduce((sum, r) => sum + r.anggaran, 0);
    const totalRealisasi = rows.reduce((sum, r) => sum + r.realisasi, 0);

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="bg-[#15406A] px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white uppercase tracking-wide">ALOKASI {title}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-[#184878] text-white">
              <tr>
                <th className="border border-[#1a4e82] px-4 py-3 text-center w-16">NO.</th>
                <th className="border border-[#1a4e82] px-4 py-3 min-w-[250px]">Rincian Output (Nama Modul)</th>
                <th className="border border-[#1a4e82] px-4 py-3 text-center w-48">Anggaran (Rp.)</th>
                <th className="border border-[#1a4e82] px-4 py-3 text-center w-48">Realisasi (Rp.)</th>
                <th className="border border-[#1a4e82] px-4 py-3 text-center w-32">Persentase (%)</th>
                <th className="border border-[#1a4e82] px-4 py-3 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {rows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Tabel {title} kosong. Klik Tambah Modul untuk memulai.</td></tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={row.id} className="border-b border-gray-200 hover:bg-blue-50/30 transition-colors">
                    <td className="border-r border-gray-200 px-4 py-2 text-center font-semibold">{index + 1}</td>
                    <td className="border-r border-gray-200 p-0">
                      <input 
                        type="text" 
                        value={row.nama_modul} 
                        onChange={(e) => updateTextFn(row.id, e.target.value)} 
                        className="w-full h-full px-4 py-3 bg-transparent outline-none focus:bg-white font-medium text-[#15406A]" 
                        placeholder="Contoh: Sertifikasi Kompetensi" 
                      />
                    </td>
                    <td className="border-r border-gray-200 p-0">
                      <div className="flex w-full h-full bg-transparent focus-within:bg-white transition-colors">
                        <span className="pl-4 py-3 text-gray-400 font-medium">Rp</span>
                        <input 
                          type="text" 
                          value={formatInputAngka(row.anggaran)} 
                          onChange={(e) => handleAngkaChange(e.target.value, row.id, "anggaran", isABT)} 
                          className="w-full h-full px-4 py-3 text-right bg-transparent outline-none font-bold text-gray-700" 
                          placeholder="0" 
                        />
                      </div>
                    </td>
                    <td className="border-r border-gray-200 p-0">
                      <div className="flex w-full h-full bg-transparent focus-within:bg-white transition-colors">
                        <span className="pl-4 py-3 text-gray-400 font-medium">Rp</span>
                        <input 
                          type="text" 
                          value={formatInputAngka(row.realisasi)} 
                          onChange={(e) => handleAngkaChange(e.target.value, row.id, "realisasi", isABT)} 
                          className="w-full h-full px-4 py-3 text-right bg-transparent outline-none font-bold text-gray-700" 
                          placeholder="0" 
                        />
                      </div>
                    </td>
                    <td className="border-r border-gray-200 px-4 py-3 text-center bg-gray-50 text-[#15406A] font-bold text-base">
                      {hitungPersen(row.realisasi, row.anggaran)}%
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button onClick={() => hapusFn(row.id)} className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot className="bg-amber-400 text-white font-bold tracking-wide">
                <tr>
                  <td colSpan={2} className="border border-[#1a4e82] px-4 py-4 text-right uppercase">Jumlah Total {title}</td>
                  <td className="border border-[#1a4e82] px-4 py-4 text-right bg-amber-500 text-[15px]">{formatRp(totalAnggaran)}</td>
                  <td className="border border-[#1a4e82] px-4 py-4 text-right bg-amber-500 text-emerald-100 text-[15px]">{formatRp(totalRealisasi)}</td>
                  <td className="border border-[#1a4e82] px-4 py-4 text-center text-blue-900 text-base">{hitungPersen(totalRealisasi, totalAnggaran)}%</td>
                  <td className="border border-[#1a4e82] bg-amber-400"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="bg-gray-50 p-4 border-t border-gray-200">
          <button onClick={tambahFn} className="flex items-center gap-2 text-sm font-bold text-[#15406A] hover:text-blue-800 transition-colors">
            <Plus className="w-5 h-5" /> Tambah Modul {title}
          </button>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
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
    );
  }

  return (
    <div className="space-y-6 relative">
      <AnimatePresence>
        {modal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative">
              <div className={`p-6 ${modal.type === "error" ? "bg-red-50" : modal.type === "success" ? "bg-emerald-50" : "bg-blue-50"}`}>
                <div className="flex items-center gap-4">
                  {modal.type === "confirm" ? <AlertCircle className="w-8 h-8 text-blue-600" /> : modal.type === "error" ? <AlertCircle className="w-8 h-8 text-red-600" /> : <CheckCircle className="w-8 h-8 text-emerald-600" />}
                  <h3 className={`text-xl font-bold ${modal.type === "error" ? "text-red-900" : modal.type === "success" ? "text-emerald-900" : "text-blue-900"}`}>{modal.title}</h3>
                </div>
                <p className="mt-3 text-gray-700 leading-relaxed">{modal.message}</p>
              </div>
              <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
                {modal.type === "confirm" ? (
                  <>
                    <button onClick={closeModal} className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 transition-colors">Batal</button>
                    <button onClick={modal.onConfirm} className="px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-[#15406A] hover:bg-blue-900 transition-colors">Ya, Lanjutkan</button>
                  </>
                ) : (
                  <button onClick={closeModal} className={`px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-colors ${modal.type === "error" ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>Tutup</button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#15406A]">Alokasi Anggaran</h1>
          <p className="text-gray-500 text-sm mt-1">Kelola distribusi anggaran utama untuk setiap modul secara garis besar.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-lg font-medium border border-emerald-200 transition-colors hover:bg-emerald-100"><Download className="w-4 h-4" /> Excel</button>
          <button onClick={bersihkanTabel} className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg font-medium border border-red-200 transition-colors hover:bg-red-100"><RefreshCw className="w-4 h-4" /> Bersihkan</button>
        </div>
      </div>

      {renderTable("ABT", rowsABT, tambahABT, hapusABT, updateTextABT, true)}
      {renderTable("NON-ABT", rowsNONABT, tambahNONABT, hapusNONABT, updateTextNONABT, false)}

      <div className="flex justify-end pt-4 pb-12">
        <motion.button onClick={simpanData} disabled={isSaving} className="flex items-center gap-2 bg-[#15406A] hover:bg-[#0f2f4e] text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-all disabled:opacity-70">
          {isSaving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save className="w-5 h-5" />}
          {isSaving ? "Menyimpan..." : "Simpan Seluruh Alokasi"}
        </motion.button>
      </div>
    </div>
  );
}