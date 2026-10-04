"use client";

import React, { useState, useEffect, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Download, Trash2, Plus, PlusCircle, AlertCircle, RefreshCw, CornerDownRight, MapPin, X, CheckCircle } from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

import { getSatpelData, simpanSatpelData } from "@/app/actions/data";

type DataValue = { paket: number; orang?: number; realisasi: number };
type SubRow = { id: string; kode: string; ro: string; data: Record<string, DataValue> };
type Row = { id: string; kode: string; ro: string; data: Record<string, DataValue>; subRows: SubRow[] };
type LocationCol = { id: string; name: string };

type ModalConfig = { isOpen: boolean; type: "confirm" | "success" | "error"; title: string; message: string; onConfirm?: () => void };

export default function SatpelPage() {
  const [locations, setLocations] = useState<LocationCol[]>([{ id: crypto.randomUUID(), name: "Satpel 1" }]);
  const [rows, setRows] = useState<Row[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [modal, setModal] = useState<ModalConfig>({ isOpen: false, type: "confirm", title: "", message: "" });
  const closeModal = () => setModal((prev) => ({ ...prev, isOpen: false }));

  const hitungOrang = (paket: number) => paket * 16;
  const hitungPersen = (realisasi: number, orang: number) => (orang > 0 ? ((realisasi / orang) * 100).toFixed(2) : "0.00");

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const res = await getSatpelData("NON-ABT");
      if (res.success) {
        if (res.locations && res.locations.length > 0) setLocations(res.locations as LocationCol[]);
        if (res.data) setRows(res.data as Row[]);
      } else {
        setModal({ isOpen: true, type: "error", title: "Error", message: "Gagal menarik data dari database." });
      }
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const tambahLokasi = () => setLocations([...locations, { id: crypto.randomUUID(), name: `Satpel ${locations.length + 1}` }]);
  const updateNamaLokasi = (id: string, newName: string) => setLocations(locations.map((loc) => (loc.id === id ? { ...loc, name: newName } : loc)));
  const hapusLokasi = (id: string) => {
    if (locations.length === 1) return setModal({ isOpen: true, type: "error", title: "Gagal", message: "Halaman ini harus memiliki minimal satu tabel lokasi." });
    setModal({
      isOpen: true,
      type: "confirm",
      title: "Hapus Tabel Lokasi?",
      message: "Tabel lokasi ini beserta datanya akan dihapus dari layar.",
      onConfirm: () => {
        setLocations(locations.filter((loc) => loc.id !== id));
        closeModal();
      },
    });
  };

  const tambahBarisUtama = () => setRows([...rows, { id: crypto.randomUUID(), kode: "-", ro: "-", data: {}, subRows: [] }]);
  const tambahSubBaris = (parentId: string) => setRows(rows.map((row) => (row.id === parentId ? { ...row, subRows: [...row.subRows, { id: crypto.randomUUID(), kode: "-", ro: "-", data: {} }] } : row)));
  const hapusBarisUtama = (id: string) =>
    setModal({
      isOpen: true,
      type: "confirm",
      title: "Hapus RO?",
      message: "Lanjutkan menghapus rincian ini beserta sub-rinciannya dari seluruh lokasi?",
      onConfirm: () => {
        setRows(rows.filter((row) => row.id !== id));
        closeModal();
      },
    });
  const hapusSubBaris = (parentId: string, subId: string) =>
    setModal({
      isOpen: true,
      type: "confirm",
      title: "Hapus Sub-RO?",
      message: "Hapus sub-rincian ini dari seluruh lokasi?",
      onConfirm: () => {
        setRows(rows.map((row) => (row.id === parentId ? { ...row, subRows: row.subRows.filter((sub) => sub.id !== subId) } : row)));
        closeModal();
      },
    });
  const bersihkanTabel = () => {
    if (rows.length === 0) return;
    setModal({
      isOpen: true,
      type: "confirm",
      title: "Bersihkan Seluruh Data?",
      message: "Semua baris data akan dihapus dari seluruh lokasi.",
      onConfirm: () => {
        setRows([]);
        closeModal();
      },
    });
  };

  const updateBarisUtamaText = (id: string, field: "kode" | "ro", value: string) => setRows(rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  const updateSubBarisText = (parentId: string, subId: string, field: "kode" | "ro", value: string) =>
    setRows(rows.map((row) => (row.id === parentId ? { ...row, subRows: row.subRows.map((sub) => (sub.id === subId ? { ...sub, [field]: value } : sub)) } : row)));
  const updateBarisUtamaData = (rowId: string, locId: string, field: keyof DataValue, value: number) =>
    setRows(rows.map((row) => (row.id === rowId ? { ...row, data: { ...row.data, [locId]: { ...(row.data[locId] || { paket: 0, realisasi: 0 }), [field]: value } } } : row)));
  const updateSubBarisData = (rowId: string, subId: string, locId: string, field: keyof DataValue, value: number) =>
    setRows(
      rows.map((row) =>
        row.id === rowId ? { ...row, subRows: row.subRows.map((sub) => (sub.id === subId ? { ...sub, data: { ...sub.data, [locId]: { ...(sub.data[locId] || { paket: 0, realisasi: 0 }), [field]: value } } } : sub)) } : row,
      ),
    );

  const getDisplayData = (row: Row, locId: string) => {
    const hasSub = row.subRows.length > 0;
    if (hasSub) {
      return {
        paket: row.subRows.reduce((sum, sub) => sum + (sub.data[locId]?.paket || 0), 0),
        realisasi: row.subRows.reduce((sum, sub) => sum + (sub.data[locId]?.realisasi || 0), 0),
      };
    }
    return { paket: row.data[locId]?.paket || 0, realisasi: row.data[locId]?.realisasi || 0 };
  };

  const simpanData = async () => {
    setIsSaving(true);
    const rowsToSave = rows.map((row) => {
      const newData = { ...row.data };
      locations.forEach((loc) => {
        if (newData[loc.id]) newData[loc.id] = { ...newData[loc.id], orang: hitungOrang(newData[loc.id].paket || 0) };
      });
      const newSubRows = row.subRows.map((sub) => {
        const newSubData = { ...sub.data };
        locations.forEach((loc) => {
          if (newSubData[loc.id]) newSubData[loc.id] = { ...newSubData[loc.id], orang: hitungOrang(newSubData[loc.id].paket || 0) };
        });
        return { ...sub, data: newSubData };
      });
      return { ...row, data: newData, subRows: newSubRows };
    });

    const result = await simpanSatpelData("NON-ABT", locations, rowsToSave);
    if (result.success) setModal({ isOpen: true, type: "success", title: "Berhasil", message: "Data Satpel berhasil disimpan ke Database!" });
    else setModal({ isOpen: true, type: "error", title: "Gagal", message: `Terjadi kesalahan: ${result.error}` });
    setIsSaving(false);
  };

  // --- Disesuaikan untuk Mengekspor Banyak Tabel Secara Vertikal ---
  const handleDownloadExcel = async () => {
    if (rows.length === 0) return setModal({ isOpen: true, type: "error", title: "Gagal Mengunduh", message: "Data masih kosong." });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Satpel");

    worksheet.columns = [{ width: 6 }, { width: 15 }, { width: 45 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 15 }];

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

    const globalRowNumber = 1;

    const createTable = (title: string, locId: string | "TOTAL") => {
      const headerTitle = worksheet.addRow(["", "", title.toUpperCase(), "", "", "", ""]);
      worksheet.mergeCells(`C${headerTitle.number}:G${headerTitle.number}`);
      headerTitle.getCell(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: locId === "TOTAL" ? "FFF59E0B" : "FF15406A" } };
      headerTitle.getCell(3).font = { color: { argb: "FFFFFFFF" }, bold: true };
      headerTitle.getCell(3).alignment = { vertical: "middle", horizontal: "center" };

      const h1 = worksheet.addRow(["NO.", "KODE", "RINCIAN OUTPUT (RO)", "Target", "", "Realisasi", "Persen (%)"]);
      worksheet.mergeCells(`D${h1.number}:E${h1.number}`);
      const h2 = worksheet.addRow(["", "", "", "Paket", "Orang", "", ""]);
      worksheet.mergeCells(`A${h1.number}:A${h2.number}`);
      worksheet.mergeCells(`B${h1.number}:B${h2.number}`);
      worksheet.mergeCells(`C${h1.number}:C${h2.number}`);
      worksheet.mergeCells(`F${h1.number}:F${h2.number}`);
      worksheet.mergeCells(`G${h1.number}:G${h2.number}`);

      [h1, h2].forEach((h) => {
        h.eachCell({ includeEmpty: true }, (c) => {
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF184878" } };
          c.font = { color: { argb: "FFFFFFFF" }, bold: true };
          c.alignment = { vertical: "middle", horizontal: "center" };
          c.border = {
            top: { style: "thin", color: { argb: "FFFFFFFF" } },
            left: { style: "thin", color: { argb: "FFFFFFFF" } },
            bottom: { style: "thin", color: { argb: "FFFFFFFF" } },
            right: { style: "thin", color: { argb: "FFFFFFFF" } },
          };
        });
      });

      let sumP = 0;
      let sumR = 0;
      rows.forEach((row, idx) => {
        const hasSub = row.subRows.length > 0;
        let p = 0;
        let r = 0;

        if (locId === "TOTAL") {
          p = locations.reduce((acc, loc) => acc + getDisplayData(row, loc.id).paket, 0);
          r = locations.reduce((acc, loc) => acc + getDisplayData(row, loc.id).realisasi, 0);
        } else {
          const d = getDisplayData(row, locId);
          p = d.paket;
          r = d.realisasi;
        }

        sumP += p;
        sumR += r;
        const o = hitungOrang(p);

        const rMain = worksheet.addRow([idx + 1, row.kode, row.ro, p, o, r, `${hitungPersen(r, o)}%`]);
        applyBorder(rMain);
        if (hasSub) {
          rMain.font = { bold: true };
          rMain.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
        }

        row.subRows.forEach((sub) => {
          let sp = 0;
          let sr = 0;
          if (locId === "TOTAL") {
            sp = locations.reduce((acc, loc) => acc + (sub.data[loc.id]?.paket || 0), 0);
            sr = locations.reduce((acc, loc) => acc + (sub.data[loc.id]?.realisasi || 0), 0);
          } else {
            sp = sub.data[locId]?.paket || 0;
            sr = sub.data[locId]?.realisasi || 0;
          }
          const so = hitungOrang(sp);
          const rSub = worksheet.addRow(["", sub.kode, `    ↳ ${sub.ro}`, sp, so, sr, `${hitungPersen(sr, so)}%`]);
          applyBorder(rSub);
        });
      });

      const soTotal = hitungOrang(sumP);
      const rTot = worksheet.addRow(["", "", "JUMLAH TOTAL", sumP, soTotal, sumR, `${hitungPersen(sumR, soTotal)}%`]);
      worksheet.mergeCells(`A${rTot.number}:C${rTot.number}`);
      rTot.eachCell({ includeEmpty: true }, (cell, col) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: locId === "TOTAL" ? "FFF59E0B" : "FFFFE4B5" } };
        cell.font = { color: { argb: locId === "TOTAL" ? "FFFFFFFF" : "FF8B4513" }, bold: true };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      });
      worksheet.addRow([]);
    };

    locations.forEach((loc) => createTable(`LOKASI: ${loc.name}`, loc.id));
    createTable("REKAPITULASI KESELURUHAN (TOTAL SEMUA SATPEL)", "TOTAL");

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), "Data_Satpel_Terpisah.xlsx");
  };

  if (isLoading)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <div className="mb-6 flex items-end gap-1.5 h-12">
          <div className="w-2 rounded-full bg-[#15406A] animate-[loadingBar_1s_ease-in-out_infinite]" />
          <div className="w-2 rounded-full bg-[#15406A]/80 animate-[loadingBar_1s_ease-in-out_0.15s_infinite]" />
          <div className="w-2 rounded-full bg-[#15406A]/60 animate-[loadingBar_1s_ease-in-out_0.3s_infinite]" />
          <div className="w-2 rounded-full bg-[#15406A]/40 animate-[loadingBar_1s_ease-in-out_0.45s_infinite]" />
          <div className="w-2 rounded-full bg-[#15406A]/30 animate-[loadingBar_1s_ease-in-out_0.6s_infinite]" />
        </div>
        <p className="text-sm font-semibold text-[#15406A]">Memuat data Satpel</p>
        <p className="mt-1 text-xs text-slate-400">Menghubungkan ke database...</p>
      </div>
    );

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
          <h1 className="text-2xl font-bold text-[#15406A]">Satpel (NON-ABT)</h1>
          <p className="text-gray-500 text-sm mt-1">Kelola data target dan realisasi di masing-masing lokasi secara terpisah.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={tambahLokasi} className="flex items-center gap-2 bg-blue-50 text-[#15406A] hover:bg-blue-100 px-4 py-2 rounded-lg font-bold transition-colors border border-blue-200 shadow-sm">
            <MapPin className="w-4 h-4" /> Tambah Tabel Lokasi
          </button>
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
          <span className="font-bold">Informasi:</span> RO dan Kode tersinkronisasi di seluruh tabel. Mengubah/Menambah RO di satu tabel akan mengubahnya di tabel lokasi lain.
        </p>
      </div>

      {/* RENDER TABEL PER LOKASI */}
      {locations.map((loc, locIndex) => {
        const totalPaketLoc = rows.reduce((sum, row) => sum + getDisplayData(row, loc.id).paket, 0);
        const totalRealisasiLoc = rows.reduce((sum, row) => sum + getDisplayData(row, loc.id).realisasi, 0);
        const totalOrangLoc = hitungOrang(totalPaketLoc);

        return (
          <div key={loc.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
            <div className="bg-[#15406A] px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group">
              <input
                type="text"
                value={loc.name}
                onChange={(e) => updateNamaLokasi(loc.id, e.target.value)}
                className="bg-transparent outline-none text-white font-black text-xl focus:bg-[#184878] rounded px-2 py-1 w-full sm:w-1/2 border border-transparent focus:border-blue-400"
                placeholder="Ketik Nama Lokasi / Satpel..."
              />
              {locations.length > 1 && (
                <button onClick={() => hapusLokasi(loc.id)} className="text-red-300 hover:text-red-100 transition-colors bg-red-900/30 px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm border border-red-800/50">
                  <Trash2 className="w-4 h-4" /> Hapus Tabel
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-[#184878] text-white">
                  <tr>
                    <th rowSpan={2} className="border border-[#1a4e82] px-4 py-3 text-center w-16">
                      NO.
                    </th>
                    <th rowSpan={2} className="border border-[#1a4e82] px-4 py-3 w-32">
                      KODE
                    </th>
                    <th rowSpan={2} className="border border-[#1a4e82] px-4 py-3 min-w-[250px]">
                      Rincian Output (RO)
                    </th>
                    <th colSpan={2} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#1c548c]">
                      Target
                    </th>
                    <th rowSpan={2} className="border border-[#1a4e82] px-4 py-3 text-center bg-[#1c548c] w-28">
                      Realisasi
                    </th>
                    <th rowSpan={2} className="border border-[#1a4e82] px-4 py-3 text-center bg-[#1c548c] w-28">
                      Persen (%)
                    </th>
                    <th rowSpan={2} className="border border-[#1a4e82] px-4 py-3 text-center w-32">
                      Aksi
                    </th>
                  </tr>
                  <tr>
                    <th className="border border-[#1a4e82] px-4 py-2 text-center bg-[#2060a0] w-24">Paket</th>
                    <th className="border border-[#1a4e82] px-4 py-2 text-center bg-[#2060a0] w-24">Orang</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-gray-400 font-medium bg-white">
                        Belum ada RO. Klik Tambah RO di bawah.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, index) => {
                      const hasSub = row.subRows.length > 0;
                      const { paket: displayPaket, realisasi: displayRealisasi } = getDisplayData(row, loc.id);
                      const displayOrang = hitungOrang(displayPaket);
                      const sortedSubRows = [...row.subRows].sort((a, b) => a.kode.localeCompare(b.kode, undefined, { numeric: true, sensitivity: "base" }));

                      return (
                        <Fragment key={`${loc.id}-${row.id}`}>
                          <tr className={`border-b border-gray-200 transition-colors ${hasSub ? "bg-gray-100 font-semibold" : "bg-white hover:bg-blue-50/30"}`}>
                            <td className="border-r border-gray-200 px-4 py-2 text-center">{index + 1}</td>
                            <td className="border-r border-gray-200 p-0">
                              <input type="text" value={row.kode} onChange={(e) => updateBarisUtamaText(row.id, "kode", e.target.value)} className="w-full h-full px-4 py-3 bg-transparent outline-none focus:bg-white" />
                            </td>
                            <td className="border-r border-gray-200 p-0">
                              <input type="text" value={row.ro} onChange={(e) => updateBarisUtamaText(row.id, "ro", e.target.value)} className="w-full h-full px-4 py-3 bg-transparent outline-none focus:bg-white" />
                            </td>
                            <td className="border-r border-gray-200 p-0">
                              <input
                                type="number"
                                value={displayPaket === 0 ? "" : displayPaket}
                                onChange={(e) => updateBarisUtamaData(row.id, loc.id, "paket", Number(e.target.value))}
                                disabled={hasSub}
                                placeholder="0"
                                className={`w-full h-full px-4 py-3 text-center outline-none ${hasSub ? "bg-transparent cursor-not-allowed text-gray-500" : "bg-transparent focus:bg-white"}`}
                              />
                            </td>
                            <td className="border-r border-gray-200 px-4 py-3 text-center bg-gray-50/50">{displayOrang}</td>
                            <td className="border-r border-gray-200 p-0">
                              <input
                                type="number"
                                value={displayRealisasi === 0 ? "" : displayRealisasi}
                                onChange={(e) => updateBarisUtamaData(row.id, loc.id, "realisasi", Number(e.target.value))}
                                disabled={hasSub}
                                placeholder="0"
                                className={`w-full h-full px-4 py-3 text-center outline-none ${hasSub ? "bg-transparent cursor-not-allowed text-gray-500" : "bg-transparent focus:bg-white"}`}
                              />
                            </td>
                            <td className="border-r border-gray-200 px-4 py-3 text-center bg-gray-50/50 text-[#15406A] font-bold">{hitungPersen(displayRealisasi, displayOrang)}%</td>
                            <td className="px-4 py-2 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button onClick={() => tambahSubBaris(row.id)} title="Tambah Sub-RO" className="p-1.5 bg-blue-100 text-[#15406A] rounded hover:bg-blue-200 transition-colors">
                                  <PlusCircle className="w-4 h-4" />
                                </button>
                                <button onClick={() => hapusBarisUtama(row.id)} title="Hapus RO (Semua Lokasi)" className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {sortedSubRows.map((sub) => {
                            const sp = sub.data[loc.id]?.paket || 0;
                            const sr = sub.data[loc.id]?.realisasi || 0;
                            const so = hitungOrang(sp);

                            return (
                              <tr key={`${loc.id}-${sub.id}`} className="border-b border-gray-100 bg-white hover:bg-slate-50 transition-colors">
                                <td className="border-r border-gray-200"></td>
                                <td className="border-r border-gray-200 p-0 relative">
                                  <div className="absolute left-2 top-3.5 text-gray-300 pointer-events-none">
                                    <CornerDownRight className="w-4 h-4" />
                                  </div>
                                  <input
                                    type="text"
                                    value={sub.kode}
                                    onChange={(e) => updateSubBarisText(row.id, sub.id, "kode", e.target.value)}
                                    className="w-full h-full pl-8 pr-4 py-2.5 bg-transparent outline-none text-sm focus:bg-white"
                                  />
                                </td>
                                <td className="border-r border-gray-200 p-0">
                                  <input
                                    type="text"
                                    value={sub.ro}
                                    onChange={(e) => updateSubBarisText(row.id, sub.id, "ro", e.target.value)}
                                    className="w-full h-full px-4 py-2.5 bg-transparent outline-none text-sm focus:bg-white"
                                    placeholder="Sub-rincian..."
                                  />
                                </td>
                                <td className="border-r border-gray-200 p-0">
                                  <input
                                    type="number"
                                    value={sp === 0 ? "" : sp}
                                    onChange={(e) => updateSubBarisData(row.id, sub.id, loc.id, "paket", Number(e.target.value))}
                                    placeholder="0"
                                    className="w-full h-full px-4 py-2.5 text-center bg-transparent outline-none focus:bg-white text-sm"
                                  />
                                </td>
                                <td className="border-r border-gray-200 px-4 py-2.5 text-center bg-gray-50/50 text-sm text-gray-500">{so}</td>
                                <td className="border-r border-gray-200 p-0">
                                  <input
                                    type="number"
                                    value={sr === 0 ? "" : sr}
                                    onChange={(e) => updateSubBarisData(row.id, sub.id, loc.id, "realisasi", Number(e.target.value))}
                                    placeholder="0"
                                    className="w-full h-full px-4 py-2.5 text-center bg-transparent outline-none focus:bg-white text-sm"
                                  />
                                </td>
                                <td className="border-r border-gray-200 px-4 py-2.5 text-center bg-gray-50/50 text-[#15406A] font-semibold text-sm">{hitungPersen(sr, so)}%</td>
                                <td className="px-4 py-2 text-center">
                                  <button onClick={() => hapusSubBaris(row.id, sub.id)} title="Hapus Sub-RO (Semua Lokasi)" className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
                {rows.length > 0 && (
                  <tfoot className="bg-amber-100 text-amber-900 font-bold tracking-wide">
                    <tr>
                      <td colSpan={3} className="border border-amber-200 px-4 py-4 text-right uppercase">
                        Total {loc.name}
                      </td>
                      <td className="border border-amber-200 px-4 py-4 text-center">{totalPaketLoc}</td>
                      <td className="border border-amber-200 px-4 py-4 text-center">{totalOrangLoc}</td>
                      <td className="border border-amber-200 px-4 py-4 text-center bg-amber-200/40">{totalRealisasiLoc}</td>
                      <td className="border border-amber-200 px-4 py-4 text-center bg-amber-200/40">{hitungPersen(totalRealisasiLoc, totalOrangLoc)}%</td>
                      <td className="border border-amber-200"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            <div className="bg-gray-50 p-4 border-t border-gray-200">
              <button onClick={tambahBarisUtama} className="flex items-center gap-2 text-sm font-bold text-[#15406A] hover:text-blue-800 transition-colors">
                <Plus className="w-5 h-5" /> Tambah RO (Teraplikasi ke semua tabel)
              </button>
            </div>
          </div>
        );
      })}

      {/* TABEL REKAPITULASI KESELURUHAN (Murni Read Only) */}
      {rows.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-amber-300 overflow-hidden mt-12 mb-8">
          <div className="bg-amber-500 px-6 py-4">
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">REKAPITULASI KESELURUHAN (TOTAL SEMUA SATPEL)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-[#184878] text-white">
                <tr>
                  <th rowSpan={2} className="border border-[#1a4e82] px-4 py-3 text-center w-16">
                    NO.
                  </th>
                  <th rowSpan={2} className="border border-[#1a4e82] px-4 py-3 w-32">
                    KODE
                  </th>
                  <th rowSpan={2} className="border border-[#1a4e82] px-4 py-3 min-w-[250px]">
                    Rincian Output (RO)
                  </th>
                  <th colSpan={2} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#1c548c]">
                    Total Target Terakumulasi
                  </th>
                  <th rowSpan={2} className="border border-[#1a4e82] px-4 py-3 text-center bg-[#1c548c] w-28">
                    Total Realisasi
                  </th>
                  <th rowSpan={2} className="border border-[#1a4e82] px-4 py-3 text-center bg-[#1c548c] w-28">
                    Persen (%)
                  </th>
                </tr>
                <tr>
                  <th className="border border-[#1a4e82] px-4 py-2 text-center bg-[#2060a0] w-24">Paket</th>
                  <th className="border border-[#1a4e82] px-4 py-2 text-center bg-[#2060a0] w-24">Orang</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {rows.map((row, index) => {
                  const hasSub = row.subRows.length > 0;
                  const totalPaket = locations.reduce((sum, loc) => sum + getDisplayData(row, loc.id).paket, 0);
                  const totalRealisasi = locations.reduce((sum, loc) => sum + getDisplayData(row, loc.id).realisasi, 0);
                  const totalOrang = hitungOrang(totalPaket);

                  const sortedSubRows = [...row.subRows].sort((a, b) => a.kode.localeCompare(b.kode, undefined, { numeric: true, sensitivity: "base" }));

                  return (
                    <Fragment key={`total-${row.id}`}>
                      <tr className={`border-b border-gray-200 transition-colors ${hasSub ? "bg-amber-50/40 font-semibold" : "bg-white"}`}>
                        <td className="border-r border-gray-200 px-4 py-3 text-center">{index + 1}</td>
                        <td className="border-r border-gray-200 px-4 py-3">{row.kode}</td>
                        <td className="border-r border-gray-200 px-4 py-3">{row.ro}</td>
                        <td className="border-r border-gray-200 px-4 py-3 text-center">{totalPaket}</td>
                        <td className="border-r border-gray-200 px-4 py-3 text-center bg-gray-50/50">{totalOrang}</td>
                        <td className="border-r border-gray-200 px-4 py-3 text-center">{totalRealisasi}</td>
                        <td className="px-4 py-3 text-center bg-gray-50/50 text-[#15406A] font-bold">{hitungPersen(totalRealisasi, totalOrang)}%</td>
                      </tr>
                      {sortedSubRows.map((sub) => {
                        const sPaket = locations.reduce((sum, loc) => sum + (sub.data[loc.id]?.paket || 0), 0);
                        const sRealisasi = locations.reduce((sum, loc) => sum + (sub.data[loc.id]?.realisasi || 0), 0);
                        const sOrang = hitungOrang(sPaket);

                        return (
                          <tr key={`total-${sub.id}`} className="border-b border-gray-100 bg-white">
                            <td className="border-r border-gray-200"></td>
                            <td className="border-r border-gray-200 px-4 py-2">{sub.kode}</td>
                            <td className="border-r border-gray-200 px-4 py-2 relative">
                              <div className="absolute left-2 top-3 text-gray-300">
                                <CornerDownRight className="w-4 h-4" />
                              </div>
                              <span className="pl-6">{sub.ro}</span>
                            </td>
                            <td className="border-r border-gray-200 px-4 py-2 text-center text-gray-600">{sPaket}</td>
                            <td className="border-r border-gray-200 px-4 py-2 text-center bg-gray-50/50 text-gray-500">{sOrang}</td>
                            <td className="border-r border-gray-200 px-4 py-2 text-center text-gray-600">{sRealisasi}</td>
                            <td className="px-4 py-2 text-center bg-gray-50/50 text-[#15406A] font-semibold">{hitungPersen(sRealisasi, sOrang)}%</td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  );
                })}
              </tbody>
              <tfoot className="bg-[#15406A] text-white font-bold tracking-wide">
                <tr>
                  <td colSpan={3} className="border-r border-[#1a4e82] px-4 py-4 text-right uppercase">
                    GRAND TOTAL KESELURUHAN
                  </td>
                  <td className="border-r border-[#1a4e82] px-4 py-4 text-center">{rows.reduce((sum, row) => sum + locations.reduce((locSum, loc) => locSum + getDisplayData(row, loc.id).paket, 0), 0)}</td>
                  <td className="border-r border-[#1a4e82] px-4 py-4 text-center text-blue-200">{hitungOrang(rows.reduce((sum, row) => sum + locations.reduce((locSum, loc) => locSum + getDisplayData(row, loc.id).paket, 0), 0))}</td>
                  <td className="border-r border-[#1a4e82] px-4 py-4 text-center text-emerald-300">{rows.reduce((sum, row) => sum + locations.reduce((locSum, loc) => locSum + getDisplayData(row, loc.id).realisasi, 0), 0)}</td>
                  <td className="px-4 py-4 text-center text-amber-300">
                    {hitungPersen(
                      rows.reduce((sum, row) => sum + locations.reduce((locSum, loc) => locSum + getDisplayData(row, loc.id).realisasi, 0), 0),
                      hitungOrang(rows.reduce((sum, row) => sum + locations.reduce((locSum, loc) => locSum + getDisplayData(row, loc.id).paket, 0), 0)),
                    )}
                    %
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-4 pb-12">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={simpanData}
          disabled={isSaving}
          className="flex items-center gap-2 bg-[#15406A] hover:bg-[#0f2f4e] text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-[#15406A]/30 transition-all disabled:opacity-70"
        >
          {isSaving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save className="w-5 h-5" />}
          {isSaving ? "Menyimpan..." : "Simpan Data Satpel"}
        </motion.button>
      </div>
    </div>
  );
}
