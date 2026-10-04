"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Download, Trash2, Plus, PlusCircle, AlertCircle, RefreshCw, CornerDownRight, X, CheckCircle } from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// Impor fungsi database dan tipe datanya yang tegas
import { getRincianOutput, simpanBulkRincianOutput, RowData } from "@/app/actions/data";

// PERBAIKAN TIPE DATA: Jadikan 'orang' mandatory (wajib) agar sama persis dengan RowData di backend
type SubRow = { id: string; kode: string; ro: string; paket: number; orang: number; realisasi: number; isReadOnly?: boolean };
type Row = { id: string; kode: string; ro: string; paket: number; orang: number; realisasi: number; subRows: SubRow[]; isReadOnly?: boolean };
type ModalConfig = { isOpen: boolean; type: "confirm" | "success" | "error"; title: string; message: string; onConfirm?: () => void };

export default function PflkKompetensiPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [modal, setModal] = useState<ModalConfig>({ isOpen: false, type: "confirm", title: "", message: "" });
  const closeModal = () => setModal((prev) => ({ ...prev, isOpen: false }));

  // Fungsi Kalkulasi Persentase
  const hitungPersen = (realisasi: number, orang: number) => (orang > 0 ? ((realisasi / orang) * 100).toFixed(2) : "0.00");

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const response = await getRincianOutput("NON-ABT", "pflk");
      
      if (response.success && response.data) {
        // PERBAIKAN: Gunakan RowData[] dari backend untuk casting yang aman tanpa any
        const rawData = response.data as RowData[];
        
        const mappedData: Row[] = rawData.map((row) => ({
          ...row,
          orang: row.orang || 0,
          subRows: row.subRows.map((sub) => ({
             ...sub,
             orang: sub.orang || 0,
             paket: 0
          }))
        }));
        setRows(mappedData);
      } else {
        setModal({ isOpen: true, type: "error", title: "Gagal Memuat", message: "Gagal mengambil data dari database." });
      }
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const tambahBarisUtama = () => setRows([...rows, { id: crypto.randomUUID(), kode: "-", ro: "-", paket: 0, orang: 0, realisasi: 0, subRows: [] }]);
  const tambahSubBaris = (parentId: string) => {
    setRows(rows.map((row) => (row.id === parentId ? { ...row, paket: 0, orang: 0, realisasi: 0, subRows: [...row.subRows, { id: crypto.randomUUID(), kode: "-", ro: "-", paket: 0, orang: 0, realisasi: 0 }] } : row)));
  };
  const hapusBarisUtama = (id: string) =>
    setModal({
      isOpen: true,
      type: "confirm",
      title: "Hapus RO?",
      message: "Lanjutkan menghapus rincian ini beserta anak-anaknya?",
      onConfirm: () => {
        setRows((prev) => prev.filter((row) => row.id !== id));
        closeModal();
      },
    });
  const hapusSubBaris = (parentId: string, subId: string) =>
    setModal({
      isOpen: true,
      type: "confirm",
      title: "Hapus Sub-RO?",
      message: "Data ini akan dihapus dari tabel.",
      onConfirm: () => {
        setRows((prev) => prev.map((row) => (row.id === parentId ? { ...row, subRows: row.subRows.filter((sub) => sub.id !== subId) } : row)));
        closeModal();
      },
    });
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
  const updateBarisUtama = (id: string, field: keyof Row, value: string | number) => setRows(rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  const updateSubBaris = (parentId: string, subId: string, field: keyof SubRow, value: string | number) =>
    setRows(rows.map((row) => (row.id === parentId ? { ...row, subRows: row.subRows.map((sub) => (sub.id === subId ? { ...sub, [field]: value } : sub)) } : row)));

  const simpanData = async () => {
    setIsSaving(true);

    // PERBAIKAN: Petakan menjadi RowData[] yang valid
    const rowsToSave: RowData[] = rows.map((row) => {
      const hasSub = row.subRows.length > 0;
      
      const subRowsWithOrang = row.subRows.map((sub) => ({
        ...sub,
        paket: 0
      }));

      const parentOrang = hasSub 
        ? subRowsWithOrang.reduce((acc, sub) => acc + (sub.orang || 0), 0)
        : (row.orang || 0);

      return {
        ...row,
        paket: 0,
        orang: parentOrang,
        subRows: subRowsWithOrang
      };
    });

    const result = await simpanBulkRincianOutput("NON-ABT", "pflk", rowsToSave);

    if (result.success) {
      setModal({ isOpen: true, type: "success", title: "Berhasil", message: "Data PFLK berhasil disimpan ke Database!" });
    } else {
      setModal({ isOpen: true, type: "error", title: "Gagal", message: `Terjadi kesalahan saat menyimpan ke database: ${result.error}` });
    }
    setIsSaving(false);
  };

  const handleDownloadExcel = async () => {
    if (rows.length === 0) {
      setModal({ isOpen: true, type: "error", title: "Gagal", message: "Tabel kosong." });
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("PFLK");

    worksheet.columns = [
      { header: "NO.", key: "no", width: 8 },
      { header: "KODE", key: "kode", width: 15 },
      { header: "RINCIAN OUTPUT (RO)", key: "ro", width: 45 },
      { header: "TARGET ORANG", key: "orang", width: 18 },
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
      const roCell = row.getCell(3);
      if (roCell) roCell.alignment = { vertical: "middle", horizontal: "left" };
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

    rows.forEach((row, index) => {
      const hasSub = row.subRows.length > 0;
      const orang = hasSub ? row.subRows.reduce((acc, sub) => acc + (sub.orang || 0), 0) : row.orang;
      const realisasi = hasSub ? row.subRows.reduce((acc, sub) => acc + (sub.realisasi || 0), 0) : row.realisasi;
      const persen = hitungPersen(realisasi, orang);

      const parentRow = worksheet.addRow({
        no: index + 1,
        kode: row.kode,
        ro: row.ro,
        orang: orang,
        realisasi: realisasi,
        persen: `${persen}%`,
      });
      
      applyBorder(parentRow);
      if (hasSub) {
        parentRow.font = { bold: true };
        parentRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
      }

      // PERBAIKAN EXCEL: Urutkan Sub-RO di hasil unduhan
      const sortedSubRows = [...row.subRows].sort((a, b) => {
        return a.kode.localeCompare(b.kode, undefined, { numeric: true, sensitivity: 'base' });
      });

      sortedSubRows.forEach((sub) => {
        const subPersen = hitungPersen(sub.realisasi, sub.orang);
        const subRow = worksheet.addRow({
          no: "",
          kode: sub.kode,
          ro: `    ↳ ${sub.ro}`,
          orang: sub.orang,
          realisasi: sub.realisasi,
          persen: `${subPersen}%`,
        });
        applyBorder(subRow);
      });
    });

    const totalRow = worksheet.addRow({
      no: "",
      kode: "",
      ro: "JUMLAH TOTAL",
      orang: totalOrang,
      realisasi: totalRealisasi,
      persen: `${totalPersen}%`,
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
      
      if (colNumber === 3) {
        cell.alignment = { vertical: "middle", horizontal: "right" };
      } else {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }
    });

    worksheet.mergeCells(`A${totalRow.number}:C${totalRow.number}`);

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), "Data_PFLK_Kompetensi.xlsx");
  };

  const totalOrang = rows.reduce((sum, row) => sum + (row.subRows.length > 0 ? row.subRows.reduce((acc, sub) => acc + (sub.orang || 0), 0) : row.orang || 0), 0);
  const totalRealisasi = rows.reduce((sum, row) => sum + (row.subRows.length > 0 ? row.subRows.reduce((acc, sub) => acc + (sub.realisasi || 0), 0) : row.realisasi || 0), 0);
  const totalPersen = hitungPersen(totalRealisasi, totalOrang);

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
        <p className="text-sm font-semibold text-[#15406A]">Memuat data PFLK</p>
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
                    <button onClick={closeModal} className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50">
                      Batal
                    </button>
                    <button onClick={modal.onConfirm} className="px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-[#15406A] hover:bg-blue-900">
                      Ya, Lanjutkan
                    </button>
                  </>
                ) : (
                  <button onClick={closeModal} className={`px-5 py-2.5 rounded-lg text-sm font-medium text-white ${modal.type === "error" ? "bg-red-600" : "bg-emerald-600"}`}>
                    Tutup
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#15406A]">PFLK (NON-ABT)</h1>
          <p className="text-gray-500 text-sm mt-1">Kelola data target dan realisasi output PFLK</p>
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
          <span className="font-bold">Peringatan:</span> Pastikan Anda selalu menekan tombol <b className="text-[#15406A]">Simpan Data</b> di bagian bawah tabel setelah selesai menambah atau mengedit rincian.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-[#15406A] text-white">
              <tr>
                <th rowSpan={2} className="border border-[#1a4e82] px-4 py-3 text-center w-16">NO.</th>
                <th rowSpan={2} className="border border-[#1a4e82] px-4 py-3 w-32">Kode</th>
                <th rowSpan={2} className="border border-[#1a4e82] px-4 py-3 min-w-[250px]">Rincian Output (RO)</th>
                <th colSpan={3} className="border border-[#1a4e82] px-4 py-2 text-center">NON-ABT</th>
                <th rowSpan={2} className="border border-[#1a4e82] px-4 py-3 text-center w-32">Aksi</th>
              </tr>
              <tr>
                <th className="border border-[#1a4e82] px-4 py-2 text-center bg-[#184878]">Target Orang</th>
                <th className="border border-[#1a4e82] px-4 py-3 text-center bg-[#184878] w-28">Realisasi</th>
                <th className="border border-[#1a4e82] px-4 py-3 text-center bg-[#184878] w-28">Persen (%)</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400 font-medium">
                    Tabel masih kosong. Klik Tambah RO untuk memulai.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => {
                  const hasSub = row.subRows.length > 0;
                  const displayOrang = hasSub ? row.subRows.reduce((acc, curr) => acc + (curr.orang || 0), 0) : row.orang;
                  const displayRealisasi = hasSub ? row.subRows.reduce((acc, curr) => acc + (curr.realisasi || 0), 0) : row.realisasi;
                  const displayPersen = hitungPersen(displayRealisasi, displayOrang);

                  // PERBAIKAN SORTING: Mengurutkan Sub-RO secara Alphanumeric berdasarkan Kode
                  const sortedSubRows = [...row.subRows].sort((a, b) => {
                    return a.kode.localeCompare(b.kode, undefined, { numeric: true, sensitivity: 'base' });
                  });

                  return (
                    <React.Fragment key={row.id}>
                      <tr className={`border-b border-gray-200 transition-colors ${hasSub ? "bg-gray-50/50 font-semibold" : "hover:bg-blue-50/30"}`}>
                        <td className="border-r border-gray-200 px-4 py-2 text-center">{index + 1}</td>
                        <td className="border-r border-gray-200 p-0">
                          <input type="text" value={row.kode} onChange={(e) => updateBarisUtama(row.id, "kode", e.target.value)} className="w-full h-full px-4 py-3 bg-transparent outline-none focus:bg-blue-50/50" />
                        </td>
                        <td className="border-r border-gray-200 p-0">
                          <input type="text" value={row.ro} onChange={(e) => updateBarisUtama(row.id, "ro", e.target.value)} className="w-full h-full px-4 py-3 bg-transparent outline-none focus:bg-blue-50/50" />
                        </td>
                        <td className="border-r border-gray-200 p-0">
                          <input
                            type="number"
                            value={displayOrang === 0 ? "" : displayOrang}
                            onChange={(e) => updateBarisUtama(row.id, "orang", Number(e.target.value))}
                            disabled={hasSub}
                            placeholder="0"
                            className={`w-full h-full px-4 py-3 text-center outline-none ${hasSub ? "bg-gray-100 cursor-not-allowed" : "bg-transparent focus:bg-blue-50/50"}`}
                          />
                        </td>
                        <td className="border-r border-gray-200 p-0">
                          <input
                            type="number"
                            value={displayRealisasi === 0 ? "" : displayRealisasi}
                            onChange={(e) => updateBarisUtama(row.id, "realisasi", Number(e.target.value))}
                            disabled={hasSub}
                            placeholder="0"
                            className={`w-full h-full px-4 py-3 text-center outline-none ${hasSub ? "bg-gray-100 cursor-not-allowed" : "bg-transparent focus:bg-blue-50/50"}`}
                          />
                        </td>
                        <td className="border-r border-gray-200 px-4 py-3 text-center bg-gray-50 text-[#15406A] font-bold">{displayPersen}%</td>
                        <td className="px-4 py-2 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => tambahSubBaris(row.id)} title="Tambah Sub-RO" className="p-1.5 bg-blue-100 text-[#15406A] rounded hover:bg-blue-200">
                              <PlusCircle className="w-4 h-4" />
                            </button>
                            <button onClick={() => hapusBarisUtama(row.id)} title="Hapus RO" className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {sortedSubRows.map((sub) => {
                        const subPersen = hitungPersen(sub.realisasi, sub.orang);
                        return (
                          <tr key={sub.id} className="border-b border-gray-100 hover:bg-blue-50/30">
                            <td className="border-r border-gray-200 bg-gray-50"></td>
                            <td className="border-r border-gray-200 p-0 relative">
                              <div className="absolute left-2 top-3.5 text-gray-300 pointer-events-none">
                                <CornerDownRight className="w-4 h-4" />
                              </div>
                              <input type="text" value={sub.kode} onChange={(e) => updateSubBaris(row.id, sub.id, "kode", e.target.value)} className="w-full h-full pl-8 pr-4 py-2.5 bg-transparent outline-none focus:bg-white text-sm" />
                            </td>
                            <td className="border-r border-gray-200 p-0">
                              <input
                                type="text"
                                value={sub.ro}
                                onChange={(e) => updateSubBaris(row.id, sub.id, "ro", e.target.value)}
                                className="w-full h-full px-4 py-2.5 bg-transparent outline-none focus:bg-white text-sm"
                                placeholder="Sub-rincian..."
                              />
                            </td>
                            <td className="border-r border-gray-200 p-0">
                              <input
                                type="number"
                                value={sub.orang === 0 ? "" : sub.orang}
                                onChange={(e) => updateSubBaris(row.id, sub.id, "orang", Number(e.target.value))}
                                placeholder="0"
                                className="w-full h-full px-4 py-2.5 text-center bg-transparent outline-none focus:bg-white text-sm"
                              />
                            </td>
                            <td className="border-r border-gray-200 p-0">
                              <input
                                type="number"
                                value={sub.realisasi === 0 ? "" : sub.realisasi}
                                onChange={(e) => updateSubBaris(row.id, sub.id, "realisasi", Number(e.target.value))}
                                placeholder="0"
                                className="w-full h-full px-4 py-2.5 text-center bg-transparent outline-none focus:bg-white text-sm"
                              />
                            </td>
                            <td className="border-r border-gray-200 px-4 py-2.5 text-center bg-gray-50/50 text-[#15406A] font-semibold text-sm">{subPersen}%</td>
                            <td className="px-4 py-2 text-center">
                              <button onClick={() => hapusSubBaris(row.id, sub.id)} title="Hapus Sub-RO" className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot className="bg-amber-400 text-white font-bold tracking-wide">
                <tr>
                  <td colSpan={3} className="border border-[#1a4e82] px-4 py-4 text-right uppercase">
                    Jumlah Total
                  </td>
                  <td className="border border-[#1a4e82] px-4 py-4 text-center bg-amber-500">{totalOrang}</td>
                  <td className="border border-[#1a4e82] px-4 py-4 text-center bg-amber-500 text-emerald-300">{totalRealisasi}</td>
                  <td className="border border-[#1a4e82] px-4 py-4 text-center text-blue-200">{totalPersen}%</td>
                  <td className="border border-[#1a4e82] bg-amber-400"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="bg-gray-50 p-4 border-t border-gray-200">
          <button onClick={tambahBarisUtama} className="flex items-center gap-2 text-sm font-bold text-[#15406A] hover:text-blue-800 transition-colors">
            <Plus className="w-5 h-5" /> Tambah RO Baru
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