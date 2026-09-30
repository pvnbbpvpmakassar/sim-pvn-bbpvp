"use client";

import React, { useState, useEffect, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Download, Trash2, Plus, PlusCircle, AlertCircle, RefreshCw, CornerDownRight, MapPin, X, CheckCircle } from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

import { getSatpelData, simpanSatpelData, LokasiSatpel, SatpelRowData } from "@/app/actions/data";

type DataValue = { paket: number; realisasi: number };
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
    if (locations.length === 1) return setModal({ isOpen: true, type: "error", title: "Gagal", message: "Tabel harus memiliki minimal satu kolom lokasi." });
    setModal({
      isOpen: true,
      type: "confirm",
      title: "Hapus Lokasi?",
      message: "Kolom ini beserta datanya akan dihapus dari layar.",
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
      message: "Lanjutkan menghapus rincian ini?",
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
      message: "Hapus sub-rincian ini?",
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
      title: "Bersihkan Tabel?",
      message: "Semua baris data akan dihapus.",
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

  const simpanData = async () => {
    setIsSaving(true);
    const result = await simpanSatpelData("NON-ABT", locations, rows);
    if (result.success) {
      setModal({ isOpen: true, type: "success", title: "Berhasil", message: "Data Satpel berhasil disimpan ke Database!" });
    } else {
      setModal({ isOpen: true, type: "error", title: "Gagal", message: `Terjadi kesalahan: ${result.error}` });
    }
    setIsSaving(false);
  };

  const handleDownloadExcel = async () => {
    if (rows.length === 0) return setModal({ isOpen: true, type: "error", title: "Gagal Mengunduh", message: "Tabel masih kosong." });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Satpel");

    // Definisikan Lebar Kolom Dasar
    const columns: Partial<ExcelJS.Column>[] = [{ width: 8 }, { width: 15 }, { width: 45 }];
    // Tambah 4 Kolom per Lokasi
    locations.forEach(() => {
      columns.push({ width: 18 }, { width: 18 }, { width: 18 }, { width: 15 });
    });
    worksheet.columns = columns;

    // --- SETUP HEADER DINAMIS ---
    const row1 = worksheet.addRow(["NO.", "KODE", "RINCIAN OUTPUT (RO)"]);
    const row2 = worksheet.addRow(["", "", ""]);
    const row3 = worksheet.addRow(["", "", ""]);

    let colIndex = 4; // Dimulai dari kolom D
    locations.forEach((loc) => {
      // Baris 1 (Nama Lokasi)
      row1.getCell(colIndex).value = loc.name;
      worksheet.mergeCells(1, colIndex, 1, colIndex + 3);
      // Baris 2 (Target, Realisasi, Persen)
      row2.getCell(colIndex).value = "Target";
      worksheet.mergeCells(2, colIndex, 2, colIndex + 1);
      row2.getCell(colIndex + 2).value = "Realisasi";
      worksheet.mergeCells(2, colIndex + 2, 3, colIndex + 2);
      row2.getCell(colIndex + 3).value = "Persen (%)";
      worksheet.mergeCells(2, colIndex + 3, 3, colIndex + 3);
      // Baris 3 (Paket, Orang)
      row3.getCell(colIndex).value = "Paket";
      row3.getCell(colIndex + 1).value = "Orang";

      colIndex += 4;
    });

    worksheet.mergeCells("A1:A3");
    worksheet.mergeCells("B1:B3");
    worksheet.mergeCells("C1:C3");

    // Styling Header
    [row1, row2, row3].forEach((headerRow) => {
      headerRow.eachCell({ includeEmpty: true }, (cell) => {
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
    });

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

    // --- MASUKKAN DATA ---
    rows.forEach((row, index) => {
      const hasSub = row.subRows.length > 0;

      // PERBAIKAN: Gunakan (string | number)[]
      const parentRowData: (string | number)[] = [index + 1, row.kode, row.ro];
      locations.forEach((loc) => {
        const { paket, realisasi } = getDisplayData(row, loc.id);
        const orang = hitungOrang(paket);
        parentRowData.push(paket, orang, realisasi, `${hitungPersen(realisasi, orang)}%`);
      });
      const parentRow = worksheet.addRow(parentRowData);
      applyBorder(parentRow);
      if (hasSub) {
        parentRow.font = { bold: true };
        parentRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
      }

      row.subRows.forEach((sub) => {
        // PERBAIKAN: Gunakan (string | number)[]
        const subRowData: (string | number)[] = ["", sub.kode, `    ↳ ${sub.ro}`];
        locations.forEach((loc) => {
          const paket = sub.data[loc.id]?.paket || 0;
          const realisasi = sub.data[loc.id]?.realisasi || 0;
          const orang = hitungOrang(paket);
          subRowData.push(paket, orang, realisasi, `${hitungPersen(realisasi, orang)}%`);
        });
        const subRow = worksheet.addRow(subRowData);
        applyBorder(subRow);
      });
    });

    // --- BARIS TOTAL ---
    // PERBAIKAN: Gunakan (string | number)[]
    const totalRowData: (string | number)[] = ["", "", "JUMLAH TOTAL"];
    locations.forEach((loc) => {
      const totalPaket = rows.reduce((sum, row) => sum + getDisplayData(row, loc.id).paket, 0);
      const totalRealisasi = rows.reduce((sum, row) => sum + getDisplayData(row, loc.id).realisasi, 0);
      const totalOrang = hitungOrang(totalPaket);
      totalRowData.push(totalPaket, totalOrang, totalRealisasi, `${hitungPersen(totalRealisasi, totalOrang)}%`);
    });

    const totalRow = worksheet.addRow(totalRowData);
    totalRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF59E0B" } };
      cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
      cell.border = {
        top: { style: "thin", color: { argb: "FFFFFFFF" } },
        left: { style: "thin", color: { argb: "FFFFFFFF" } },
        bottom: { style: "thin", color: { argb: "FFFFFFFF" } },
        right: { style: "thin", color: { argb: "FFFFFFFF" } },
      };
      cell.alignment = { vertical: "middle", horizontal: colNum === 3 ? "right" : "center" };
    });
    worksheet.mergeCells(`A${totalRow.number}:C${totalRow.number}`);

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), "Data_Satpel.xlsx");
  };

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
          <p className="text-gray-500 text-sm mt-1">Kelola data target dan realisasi multi-lokasi.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={tambahLokasi} className="flex items-center gap-2 bg-blue-50 text-[#15406A] hover:bg-blue-100 px-4 py-2 rounded-lg font-bold transition-colors border border-blue-200 shadow-sm">
            <MapPin className="w-4 h-4" /> Tambah Kolom Lokasi
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
          <span className="font-bold">Peringatan:</span> Pastikan Anda selalu menekan tombol <b className="text-[#15406A]">Simpan Data</b> di bagian bawah tabel setelah selesai menambah atau mengedit.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm text-left border-collapse min-w-max">
            <thead className="bg-[#15406A] text-white">
              <tr>
                <th rowSpan={3} className="sticky left-0 z-20 bg-[#15406A] border border-[#1a4e82] px-4 py-3 text-center w-16">
                  NO.
                </th>
                <th rowSpan={3} className="sticky left-16 z-20 bg-[#15406A] border border-[#1a4e82] px-4 py-3 w-32">
                  Kode
                </th>
                <th rowSpan={3} className="sticky left-48 z-20 bg-[#15406A] border border-[#1a4e82] px-4 py-3 min-w-[250px] shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                  Rincian Output (RO)
                </th>

                {locations.map((loc) => (
                  <th colSpan={4} key={loc.id} className="border border-[#1a4e82] p-0 text-center relative group min-w-[320px]">
                    <div className="flex items-center justify-center w-full h-full p-2 gap-2">
                      <input
                        type="text"
                        value={loc.name}
                        onChange={(e) => updateNamaLokasi(loc.id, e.target.value)}
                        className="bg-transparent outline-none text-center text-white font-extrabold w-full focus:bg-[#184878] rounded px-2 py-1"
                        placeholder="Ketik nama Satpel..."
                      />
                      {locations.length > 1 && (
                        <button onClick={() => hapusLokasi(loc.id)} title="Hapus Kolom Lokasi" className="text-blue-300 hover:text-red-400 absolute right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-[#15406A] p-1 rounded-md">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </th>
                ))}

                <th rowSpan={3} className="border border-[#1a4e82] px-4 py-3 text-center w-32">
                  Aksi
                </th>
              </tr>
              <tr>
                {locations.map((loc) => (
                  <Fragment key={`sub1-${loc.id}`}>
                    <th colSpan={2} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#184878]">
                      Target
                    </th>
                    <th rowSpan={2} className="border border-[#1a4e82] px-4 py-3 text-center bg-[#184878] w-28">
                      Realisasi
                    </th>
                    <th rowSpan={2} className="border border-[#1a4e82] px-4 py-3 text-center bg-[#184878] w-28">
                      Persen (%)
                    </th>
                  </Fragment>
                ))}
              </tr>
              <tr>
                {locations.map((loc) => (
                  <Fragment key={`sub2-${loc.id}`}>
                    <th className="border border-[#1a4e82] px-4 py-2 text-center bg-[#1c548c] w-24">Paket</th>
                    <th className="border border-[#1a4e82] px-4 py-2 text-center bg-[#1c548c] w-24">Orang</th>
                  </Fragment>
                ))}
              </tr>
            </thead>

            <tbody className="text-gray-700">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4 + locations.length * 4} className="px-4 py-12 text-center text-gray-400 font-medium bg-white">
                    Tabel masih kosong. Klik Tambah RO Baru untuk memulai.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => {
                  const hasSub = row.subRows.length > 0;
                  return (
                    <Fragment key={row.id}>
                      <tr className={`border-b border-gray-200 transition-colors ${hasSub ? "bg-gray-100 font-semibold" : "bg-white hover:bg-slate-50"}`}>
                        <td className="sticky left-0 z-10 bg-inherit border-r border-gray-200 px-4 py-2 text-center">{index + 1}</td>
                        <td className="sticky left-16 z-10 bg-inherit border-r border-gray-200 p-0">
                          <input type="text" value={row.kode} onChange={(e) => updateBarisUtamaText(row.id, "kode", e.target.value)} className="w-full h-full px-4 py-3 bg-transparent outline-none focus:bg-blue-50/50" />
                        </td>
                        <td className="sticky left-48 z-10 bg-inherit border-r border-gray-200 p-0 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                          <input type="text" value={row.ro} onChange={(e) => updateBarisUtamaText(row.id, "ro", e.target.value)} className="w-full h-full px-4 py-3 bg-transparent outline-none focus:bg-blue-50/50" />
                        </td>

                        {locations.map((loc) => {
                          const { paket, realisasi } = getDisplayData(row, loc.id);
                          const orang = hitungOrang(paket);
                          const persen = hitungPersen(realisasi, orang);

                          return (
                            <Fragment key={`parent-data-${loc.id}`}>
                              <td className="border-r border-gray-200 p-0">
                                <input
                                  type="number"
                                  value={paket === 0 ? "" : paket}
                                  onChange={(e) => updateBarisUtamaData(row.id, loc.id, "paket", Number(e.target.value))}
                                  disabled={hasSub}
                                  placeholder="0"
                                  className={`w-full h-full px-4 py-3 text-center outline-none ${hasSub ? "bg-transparent cursor-not-allowed text-gray-500" : "bg-transparent focus:bg-blue-50/50"}`}
                                />
                              </td>
                              <td className="border-r border-gray-200 px-4 py-3 text-center bg-transparent">{orang}</td>
                              <td className="border-r border-gray-200 p-0">
                                <input
                                  type="number"
                                  value={realisasi === 0 ? "" : realisasi}
                                  onChange={(e) => updateBarisUtamaData(row.id, loc.id, "realisasi", Number(e.target.value))}
                                  disabled={hasSub}
                                  placeholder="0"
                                  className={`w-full h-full px-4 py-3 text-center outline-none ${hasSub ? "bg-transparent cursor-not-allowed text-gray-500" : "bg-transparent focus:bg-blue-50/50"}`}
                                />
                              </td>
                              <td className="border-r border-gray-200 px-4 py-3 text-center bg-transparent text-[#15406A] font-bold">{persen}%</td>
                            </Fragment>
                          );
                        })}
                        <td className="px-4 py-2 text-center bg-white">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => tambahSubBaris(row.id)} title="Tambah Sub-RO" className="p-1.5 bg-blue-100 text-[#15406A] rounded hover:bg-blue-200 transition-colors">
                              <PlusCircle className="w-4 h-4" />
                            </button>
                            <button onClick={() => hapusBarisUtama(row.id)} title="Hapus RO" className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {row.subRows.map((sub) => (
                        <tr key={sub.id} className="border-b border-gray-100 bg-white hover:bg-slate-50 transition-colors">
                          <td className="sticky left-0 z-10 bg-inherit border-r border-gray-200"></td>
                          <td className="sticky left-16 z-10 bg-inherit border-r border-gray-200 p-0 relative">
                            <div className="absolute left-2 top-3.5 text-gray-300 pointer-events-none">
                              <CornerDownRight className="w-4 h-4" />
                            </div>
                            <input type="text" value={sub.kode} onChange={(e) => updateSubBarisText(row.id, sub.id, "kode", e.target.value)} className="w-full h-full pl-8 pr-4 py-2.5 bg-transparent outline-none focus:bg-white text-sm" />
                          </td>
                          <td className="sticky left-48 z-10 bg-inherit border-r border-gray-200 p-0 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                            <input
                              type="text"
                              value={sub.ro}
                              onChange={(e) => updateSubBarisText(row.id, sub.id, "ro", e.target.value)}
                              className="w-full h-full px-4 py-2.5 bg-transparent outline-none focus:bg-white text-sm"
                              placeholder="Sub-rincian..."
                            />
                          </td>
                          {locations.map((loc) => {
                            const paket = sub.data[loc.id]?.paket || 0;
                            const realisasi = sub.data[loc.id]?.realisasi || 0;
                            const orang = hitungOrang(paket);
                            const persen = hitungPersen(realisasi, orang);

                            return (
                              <Fragment key={`sub-data-${loc.id}`}>
                                <td className="border-r border-gray-200 p-0 border-l">
                                  <input
                                    type="number"
                                    value={paket === 0 ? "" : paket}
                                    onChange={(e) => updateSubBarisData(row.id, sub.id, loc.id, "paket", Number(e.target.value))}
                                    placeholder="0"
                                    className="w-full h-full px-4 py-2.5 text-center bg-transparent outline-none focus:bg-white text-sm"
                                  />
                                </td>
                                <td className="border-r border-gray-200 px-4 py-2.5 text-center bg-transparent text-sm text-gray-500">{orang}</td>
                                <td className="border-r border-gray-200 p-0">
                                  <input
                                    type="number"
                                    value={realisasi === 0 ? "" : realisasi}
                                    onChange={(e) => updateSubBarisData(row.id, sub.id, loc.id, "realisasi", Number(e.target.value))}
                                    placeholder="0"
                                    className="w-full h-full px-4 py-2.5 text-center bg-transparent outline-none focus:bg-white text-sm"
                                  />
                                </td>
                                <td className="border-r border-gray-200 px-4 py-2.5 text-center bg-transparent text-[#15406A] font-semibold text-sm">{persen}%</td>
                              </Fragment>
                            );
                          })}
                          <td className="px-4 py-2 text-center bg-white">
                            <button onClick={() => hapusSubBaris(row.id, sub.id)} title="Hapus Sub-RO" className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  );
                })
              )}
            </tbody>

            {rows.length > 0 && (
              <tfoot className="bg-amber-400 text-white font-bold tracking-wide">
                <tr>
                  <td className="sticky left-0 z-20 bg-amber-400 border border-[#1a4e82] px-4 py-4 text-center"></td>
                  <td className="sticky left-16 z-20 bg-amber-400 border border-[#1a4e82] px-4 py-4 text-center"></td>
                  <td className="sticky left-48 z-20 bg-amber-400 border border-[#1a4e82] px-4 py-4 text-right shadow-[2px_0_5px_rgba(0,0,0,0.1)] uppercase">Jumlah Total</td>

                  {locations.map((loc) => {
                    const totalPaket = rows.reduce((sum, row) => sum + getDisplayData(row, loc.id).paket, 0);
                    const totalRealisasi = rows.reduce((sum, row) => sum + getDisplayData(row, loc.id).realisasi, 0);
                    const totalOrang = hitungOrang(totalPaket);
                    const totalPersen = hitungPersen(totalRealisasi, totalOrang);

                    return (
                      <Fragment key={`total-${loc.id}`}>
                        <td className="border border-[#1a4e82] px-4 py-4 text-center bg-amber-500">{totalPaket}</td>
                        <td className="border border-[#1a4e82] px-4 py-4 text-center text-blue-100">{totalOrang}</td>
                        <td className="border border-[#1a4e82] px-4 py-4 text-center bg-amber-500 text-emerald-300">{totalRealisasi}</td>
                        <td className="border border-[#1a4e82] px-4 py-4 text-center text-blue-200">{totalPersen}%</td>
                      </Fragment>
                    );
                  })}
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
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={simpanData}
          disabled={isSaving}
          className="flex items-center gap-2 bg-[#15406A] hover:bg-[#0f2f4e] text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-[#15406A]/30 transition-all disabled:opacity-70"
        >
          {isSaving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save className="w-5 h-5" />}
          {isSaving ? "Menyimpan..." : "Simpan Data"}
        </motion.button>
      </div>
    </div>
  );
}
