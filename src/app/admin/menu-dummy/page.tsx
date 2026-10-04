"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Download, Trash2, Plus, AlertCircle, RefreshCw, CheckCircle } from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// Impor fungsi Server Action yang baru dibuat
import { getMenuDummy, simpanBulkMenuDummy, MenuDummyRowData } from "@/app/actions/data";

type ModalConfig = { isOpen: boolean; type: "confirm" | "success" | "error"; title: string; message: string; onConfirm?: () => void };

export default function MenuDummyPage() {
  const [rows, setRows] = useState<MenuDummyRowData[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [modal, setModal] = useState<ModalConfig>({ isOpen: false, type: "confirm", title: "", message: "" });
  const closeModal = () => setModal((prev) => ({ ...prev, isOpen: false }));

  // --- Fungsi Utilitas Kalkulasi ---
  const hitungPersen = (realisasi: number, target: number) => (target > 0 ? ((realisasi / target) * 100).toFixed(2) : "0.00");

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const response = await getMenuDummy();
      if (response.success && response.data) {
        setRows(response.data);
      } else {
        setModal({ isOpen: true, type: "error", title: "Gagal Memuat", message: response.error || "Gagal menarik data dari database." });
      }
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const tambahBaris = () => {
    setRows([...rows, { id: crypto.randomUUID(), nama: "", target: 0, realisasi: 0 }]);
  };

  const hapusBaris = (id: string) => {
    setModal({
      isOpen: true,
      type: "confirm",
      title: "Hapus Baris?",
      message: "Data ini akan dihapus dari tabel.",
      onConfirm: () => {
        setRows((prev) => prev.filter((row) => row.id !== id));
        closeModal();
      },
    });
  };

  const bersihkanTabel = () => {
    if (rows.length === 0) return;
    setModal({
      isOpen: true,
      type: "confirm",
      title: "Bersihkan Tabel?",
      message: "Semua data akan dihapus dari layar (Tekan simpan untuk memperbarui database).",
      onConfirm: () => {
        setRows([]);
        closeModal();
      },
    });
  };

  const updateBaris = (id: string, field: keyof MenuDummyRowData, value: string | number) => {
    setRows(rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const simpanData = async () => {
    setIsSaving(true);
    const result = await simpanBulkMenuDummy(rows);

    if (result.success) {
      setModal({ isOpen: true, type: "success", title: "Berhasil", message: "Data Menu Dummy berhasil disimpan ke Database!" });
    } else {
      setModal({ isOpen: true, type: "error", title: "Gagal", message: `Terjadi kesalahan saat menyimpan: ${result.error}` });
    }
    setIsSaving(false);
  };

  const handleDownloadExcel = async () => {
    if (rows.length === 0) {
      setModal({ isOpen: true, type: "error", title: "Gagal", message: "Tabel kosong." });
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Menu Dummy");

    worksheet.columns = [
      { header: "NO.", key: "no", width: 8 },
      { header: "NAMA", key: "nama", width: 45 },
      { header: "TARGET", key: "target", width: 18 },
      { header: "REALISASI", key: "realisasi", width: 18 },
      { header: "PERSEN (%)", key: "persen", width: 15 },
    ];

    const applyBorder = (row: ExcelJS.Row) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFCCCCCC" } },
          left: { style: "thin", color: { argb: "FFCCCCCC" } },
          bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
          right: { style: "thin", color: { argb: "FFCCCCCC" } },
        };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      });
      const namaCell = row.getCell(2);
      if (namaCell) namaCell.alignment = { vertical: "middle", horizontal: "left" };
    };

    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF15406A" } };
      cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin", color: { argb: "FFFFFFFF" } },
        left: { style: "thin", color: { argb: "FFFFFFFF" } },
        bottom: { style: "thin", color: { argb: "FFFFFFFF" } },
        right: { style: "thin", color: { argb: "FFFFFFFF" } },
      };
    });

    let totalTarget = 0;
    let totalRealisasi = 0;

    rows.forEach((row, index) => {
      totalTarget += row.target;
      totalRealisasi += row.realisasi;
      const persen = hitungPersen(row.realisasi, row.target);

      const excelRow = worksheet.addRow({
        no: index + 1,
        nama: row.nama,
        target: row.target,
        realisasi: row.realisasi,
        persen: `${persen}%`,
      });
      applyBorder(excelRow);
    });

    const totalRow = worksheet.addRow({
      no: "",
      nama: "JUMLAH TOTAL",
      target: totalTarget,
      realisasi: totalRealisasi,
      persen: `${hitungPersen(totalRealisasi, totalTarget)}%`,
    });

    totalRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF59E0B" } };
      cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
      cell.border = {
        top: { style: "thin", color: { argb: "FFFFFFFF" } },
        left: { style: "thin", color: { argb: "FFFFFFFF" } },
        bottom: { style: "thin", color: { argb: "FFFFFFFF" } },
        right: { style: "thin", color: { argb: "FFFFFFFF" } },
      };
      if (colNumber === 2) cell.alignment = { vertical: "middle", horizontal: "right" };
      else cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    worksheet.mergeCells(`A${totalRow.number}:B${totalRow.number}`);

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), "Data_Menu_Dummy.xlsx");
  };

  const grandTotalTarget = rows.reduce((sum, row) => sum + (row.target || 0), 0);
  const grandTotalRealisasi = rows.reduce((sum, row) => sum + (row.realisasi || 0), 0);
  const grandTotalPersen = hitungPersen(grandTotalRealisasi, grandTotalTarget);

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
        <p className="text-sm font-semibold text-[#15406A]">Memuat Menu Dummy</p>
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
                  {modal.type === "confirm" && <AlertCircle className="w-8 h-8 text-blue-600" />}
                  {modal.type === "error" && <AlertCircle className="w-8 h-8 text-red-600" />}
                  {modal.type === "success" && <CheckCircle className="w-8 h-8 text-emerald-600" />}
                  <h3 className={`text-xl font-bold ${modal.type === "error" ? "text-red-900" : modal.type === "success" ? "text-emerald-900" : "text-blue-900"}`}>{modal.title}</h3>
                </div>
                <p className="mt-3 text-gray-700 leading-relaxed">{modal.message}</p>
              </div>
              <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
                {modal.type === "confirm" ? (
                  <>
                    <button onClick={closeModal} className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50">Batal</button>
                    <button onClick={modal.onConfirm} className="px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-[#15406A] hover:bg-blue-900">Ya, Lanjutkan</button>
                  </>
                ) : (
                  <button onClick={closeModal} className={`px-5 py-2.5 rounded-lg text-sm font-medium text-white ${modal.type === "error" ? "bg-red-600" : "bg-emerald-600"}`}>Tutup</button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#15406A]">Menu Dummy (Independen)</h1>
          <p className="text-gray-500 text-sm mt-1">Kelola data terpisah yang tidak terikat dengan ABT maupun NON-ABT.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleDownloadExcel} className="flex items-center gap-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-4 py-2 rounded-lg font-medium transition-colors border border-emerald-200">
            <Download className="w-4 h-4" /> Excel
          </button>
          <button onClick={bersihkanTabel} className="flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg font-medium transition-colors border border-red-200">
            <RefreshCw className="w-4 h-4" /> Bersihkan
          </button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-amber-800 text-sm font-medium leading-relaxed">
          <span className="font-bold">Peringatan:</span> Pastikan Anda selalu menekan tombol <b className="text-[#15406A]">Simpan Data</b> di bagian bawah tabel setelah selesai melakukan perubahan.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-[#15406A] text-white">
              <tr>
                <th className="border border-[#1a4e82] px-4 py-3 text-center w-16">NO.</th>
                <th className="border border-[#1a4e82] px-4 py-3 min-w-[250px]">Nama / Keterangan</th>
                <th className="border border-[#1a4e82] px-4 py-3 text-center w-48">Target</th>
                <th className="border border-[#1a4e82] px-4 py-3 text-center w-48">Realisasi</th>
                <th className="border border-[#1a4e82] px-4 py-3 text-center w-32">Persen (%)</th>
                <th className="border border-[#1a4e82] px-4 py-3 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400 font-medium">
                    Tabel masih kosong. Klik Tambah Baris untuk memulai.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => {
                  return (
                    <tr key={row.id} className="border-b border-gray-200 hover:bg-blue-50/30 transition-colors">
                      <td className="border-r border-gray-200 px-4 py-2 text-center">{index + 1}</td>
                      <td className="border-r border-gray-200 p-0">
                        <input 
                          type="text" 
                          value={row.nama} 
                          onChange={(e) => updateBaris(row.id, "nama", e.target.value)} 
                          className="w-full h-full px-4 py-3 bg-transparent outline-none focus:bg-white font-medium" 
                          placeholder="Masukkan nama..." 
                        />
                      </td>
                      <td className="border-r border-gray-200 p-0">
                        <input
                          type="number"
                          value={row.target === 0 ? "" : row.target}
                          onChange={(e) => updateBaris(row.id, "target", Number(e.target.value))}
                          placeholder="0"
                          className="w-full h-full px-4 py-3 text-center bg-transparent outline-none focus:bg-white"
                        />
                      </td>
                      <td className="border-r border-gray-200 p-0">
                        <input
                          type="number"
                          value={row.realisasi === 0 ? "" : row.realisasi}
                          onChange={(e) => updateBaris(row.id, "realisasi", Number(e.target.value))}
                          placeholder="0"
                          className="w-full h-full px-4 py-3 text-center bg-transparent outline-none focus:bg-white"
                        />
                      </td>
                      <td className="border-r border-gray-200 px-4 py-3 text-center bg-gray-50/50 text-[#15406A] font-bold">
                        {hitungPersen(row.realisasi, row.target)}%
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button onClick={() => hapusBaris(row.id)} title="Hapus Baris" className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot className="bg-amber-400 text-white font-bold tracking-wide">
                <tr>
                  <td colSpan={2} className="border border-[#1a4e82] px-4 py-4 text-right uppercase">Jumlah Total</td>
                  <td className="border border-[#1a4e82] px-4 py-4 text-center bg-amber-500">{grandTotalTarget}</td>
                  <td className="border border-[#1a4e82] px-4 py-4 text-center bg-amber-500 text-emerald-300">{grandTotalRealisasi}</td>
                  <td className="border border-[#1a4e82] px-4 py-4 text-center text-blue-200">{grandTotalPersen}%</td>
                  <td className="border border-[#1a4e82] bg-amber-400"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="bg-gray-50 p-4 border-t border-gray-200">
          <button onClick={tambahBaris} className="flex items-center gap-2 text-sm font-bold text-[#15406A] hover:text-blue-800 transition-colors">
            <Plus className="w-5 h-5" /> Tambah Baris
          </button>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <motion.button onClick={simpanData} disabled={isSaving} className="flex items-center gap-2 bg-[#15406A] hover:bg-[#0f2f4e] text-white px-8 py-3 rounded-xl font-bold transition-all disabled:opacity-70">
          {isSaving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save className="w-5 h-5" />}
          {isSaving ? "Menyimpan..." : "Simpan Data"}
        </motion.button>
      </div>
    </div>
  );
}