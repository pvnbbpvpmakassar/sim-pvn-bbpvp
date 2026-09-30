"use client";

import React, { useState, useEffect, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Download, AlertCircle, CheckCircle, ChevronDown, ChevronRight, CornerDownRight } from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// Impor fungsi Server Action
import { getRincianAnggaran, simpanBulkRincianAnggaran, ModulAnggaranGroup } from "@/app/actions/data";

type ModalConfig = { isOpen: boolean; type: "confirm" | "success" | "error"; title: string; message: string; onConfirm?: () => void };

export default function RincianAnggaranPage() {
  const [activeTab, setActiveTab] = useState<"ABT" | "NON-ABT">("ABT");
  const [abtData, setAbtData] = useState<ModulAnggaranGroup[]>([]);
  const [nonAbtData, setNonAbtData] = useState<ModulAnggaranGroup[]>([]);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState<ModalConfig>({ isOpen: false, type: "confirm", title: "", message: "" });

  const closeModal = () => setModal({ ...modal, isOpen: false });

  // Utilitas Formatter
  const formatRp = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);
  const formatInputAngka = (value: number) => (value === 0 ? "" : new Intl.NumberFormat("id-ID").format(value));
  const hitungPersen = (realisasi: number, anggaran: number) => {
    const real = Number(realisasi) || 0;
    const angg = Number(anggaran) || 0;
    return angg > 0 ? ((real / angg) * 100).toFixed(2) : "0.00";
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const res = await getRincianAnggaran();
      if (res.success && res.data) {
        setAbtData(res.data.abt);
        setNonAbtData(res.data.nonAbt);

        if (res.data.abt.length > 0) {
          setExpandedModules({ [`ABT-${res.data.abt[0].modul}`]: true });
        }
      } else {
        setModal({ isOpen: true, type: "error", title: "Gagal Memuat", message: res.error || "Gagal menarik data." });
      }
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const toggleModul = (kategori: string, modulName: string) => {
    const key = `${kategori}-${modulName}`;
    setExpandedModules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // --- LOGIKA CERDAS: Mencegah Input Melebihi Sisa Alokasi ---
  const handleAngkaChange = (valStr: string, modulName: string, rowId: string, field: "anggaran" | "realisasi", isABT: boolean, subId?: string) => {
    const rawValue = valStr.replace(/[^0-9]/g, "");
    let numValue = rawValue ? parseInt(rawValue, 10) : 0;

    const targetGroups = isABT ? abtData : nonAbtData;
    const groupIndex = targetGroups.findIndex((g) => g.modul === modulName);
    if (groupIndex === -1) return;

    const group = targetGroups[groupIndex];

    // Jika yang diedit adalah Anggaran, cegah jika melewati batas "Anggaran Tersedia"
    if (field === "anggaran") {
      let totalDirinci = 0;
      let oldValue = 0;

      // Hitung total saat ini dan cari nilai lama dari baris yang sedang diedit
      group.rows.forEach((r) => {
        const hasSub = r.subRows.length > 0;
        if (hasSub) {
          r.subRows.forEach((s) => {
            totalDirinci += s.anggaran;
            if (s.id === subId) oldValue = s.anggaran;
          });
        } else {
          totalDirinci += r.anggaran;
          if (r.id === rowId) oldValue = r.anggaran;
        }
      });

      const sisaTersedia = group.alokasi - totalDirinci;
      const selisihInput = numValue - oldValue;

      // Jika user mencoba menambah angka melebihi sisa yang ada, CAP (tahan) di batas maksimum
      if (selisihInput > sisaTersedia) {
        numValue = oldValue + sisaTersedia;
      }
    }

    // --- Terapkan perubahan state ---
    const updateGroups = (groups: ModulAnggaranGroup[]) =>
      groups.map((g) => {
        if (g.modul !== modulName) return g;
        const newRows = g.rows.map((row) => {
          if (row.id === rowId) {
            if (subId) {
              const newSubs = row.subRows.map((sub) => (sub.id === subId ? { ...sub, [field]: numValue } : sub));
              return { ...row, subRows: newSubs };
            }
            return { ...row, [field]: numValue };
          }
          return row;
        });
        return { ...g, rows: newRows };
      });

    if (isABT) setAbtData(updateGroups(abtData));
    else setNonAbtData(updateGroups(nonAbtData));
  };

  const simpanData = async () => {
    setIsSaving(true);

    // PERBAIKAN: Ganti tipe 'any' menjadi struktur data yang spesifik
    const payload: {
      id: string;
      anggaran: number;
      realisasi: number;
      fallbackInsert?: { kategori: string; modul: string; kode: string; ro: string; parent_id: string | null };
    }[] = [];

    const processGroups = (groups: ModulAnggaranGroup[]) => {
      groups.forEach((group) => {
        group.rows.forEach((row) => {
          const hasSub = row.subRows.length > 0;
          const finalAnggaran = hasSub ? row.subRows.reduce((a, b) => a + b.anggaran, 0) : row.anggaran;
          const finalRealisasi = hasSub ? row.subRows.reduce((a, b) => a + b.realisasi, 0) : row.realisasi;

          payload.push({ id: row.id, anggaran: finalAnggaran, realisasi: finalRealisasi, fallbackInsert: row.fallbackInsert });
          row.subRows.forEach((sub) => payload.push({ id: sub.id, anggaran: sub.anggaran, realisasi: sub.realisasi, fallbackInsert: sub.fallbackInsert }));
        });
      });
    };

    processGroups(abtData);
    processGroups(nonAbtData);

    const result = await simpanBulkRincianAnggaran(payload);
    if (result.success) {
      setModal({ isOpen: true, type: "success", title: "Berhasil", message: "Seluruh Rincian Anggaran berhasil disimpan ke Database!" });
    } else {
      setModal({ isOpen: true, type: "error", title: "Gagal", message: `Terjadi kesalahan saat menyimpan: ${result.error}` });
    }
    setIsSaving(false);
  };

  const handleDownloadExcel = async () => {
    const workbook = new ExcelJS.Workbook();

    const buildSheet = (sheetName: string, groups: ModulAnggaranGroup[]) => {
      const worksheet = workbook.addWorksheet(sheetName);
      worksheet.columns = [
        { header: "NO.", key: "no", width: 8 },
        { header: "KODE", key: "kode", width: 15 },
        { header: "RINCIAN OUTPUT (RO)", key: "ro", width: 45 },
        { header: "ANGGARAN (Rp.)", key: "anggaran", width: 22 },
        { header: "REALISASI (Rp.)", key: "realisasi", width: 22 },
        { header: "PERSEN (%)", key: "persen", width: 15 },
      ];

      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF15406A" } };
        cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      });

      let rowIndex = 2;

      groups.forEach((group) => {
        const modulRow = worksheet.addRow(["", "", `MODUL: ${group.modul.toUpperCase()}`, "", "", ""]);
        worksheet.mergeCells(`C${rowIndex}:F${rowIndex}`);
        modulRow.getCell(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFCBD5E1" } };
        modulRow.getCell(3).font = { bold: true };
        rowIndex++;

        group.rows.forEach((row, i) => {
          const hasSub = row.subRows.length > 0;
          const displayAnggaran = hasSub ? row.subRows.reduce((a, b) => a + b.anggaran, 0) : row.anggaran;
          const displayRealisasi = hasSub ? row.subRows.reduce((a, b) => a + b.realisasi, 0) : row.realisasi;

          const parentRow = worksheet.addRow([i + 1, row.kode, row.ro, displayAnggaran, displayRealisasi, `${hitungPersen(displayRealisasi, displayAnggaran)}%`]);
          if (hasSub) parentRow.font = { bold: true };
          rowIndex++;

          row.subRows.forEach((sub) => {
            worksheet.addRow(["", sub.kode, `    ↳ ${sub.ro}`, sub.anggaran, sub.realisasi, `${hitungPersen(sub.realisasi, sub.anggaran)}%`]);
            rowIndex++;
          });
        });
      });
    };

    if (abtData.length > 0) buildSheet("Rincian ABT", abtData);
    if (nonAbtData.length > 0) buildSheet("Rincian NON-ABT", nonAbtData);

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), "Rincian_Anggaran.xlsx");
  };

  const renderModulGroups = (groups: ModulAnggaranGroup[], isABT: boolean) => {
    const kategoriStr = isABT ? "ABT" : "NON-ABT";

    if (groups.length === 0) return <div className="p-8 text-center text-gray-400 bg-white rounded-2xl shadow-sm border border-gray-200">Belum ada rincian data untuk kategori ini. Pastikan Anda sudah mengisi RO di halaman Modul.</div>;

    return groups.map((group) => {
      const isExpanded = expandedModules[`${kategoriStr}-${group.modul}`] || false;

      // Kalkulasi Total & Sisa per Modul
      let totalDirinciModul = 0;
      let totalRealisasiModul = 0;
      group.rows.forEach((r) => {
        const hasSub = r.subRows.length > 0;
        totalDirinciModul += hasSub ? r.subRows.reduce((a, b) => a + b.anggaran, 0) : r.anggaran;
        totalRealisasiModul += hasSub ? r.subRows.reduce((a, b) => a + b.realisasi, 0) : r.realisasi;
      });

      const sisaAnggaran = group.alokasi - totalDirinciModul;
      const isHabis = sisaAnggaran <= 0;

      return (
        <div key={group.modul} className={`bg-white rounded-xl shadow-sm border ${isHabis ? "border-red-200" : "border-gray-200"} overflow-hidden mb-6`}>
          {/* Accordion Header */}
          <button
            onClick={() => toggleModul(kategoriStr, group.modul)}
            className={`w-full px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center transition-colors gap-4 ${isHabis ? "bg-[#757575] hover:bg-[#646464]" : "bg-[#15406A] hover:bg-[#0f2f4e]"}`}
          >
            <div className="flex items-center gap-3 text-white">
              {isExpanded ? <ChevronDown className="w-5 h-5 text-blue-200" /> : <ChevronRight className="w-5 h-5 text-blue-200" />}
              <h2 className="text-lg font-bold uppercase tracking-wide">Modul: {group.modul}</h2>
            </div>
            <div className="flex flex-wrap gap-4 sm:gap-6 text-sm items-center">
              <div className="text-right">
                <p className="text-blue-200 font-medium text-xs uppercase">Total Anggaran</p>
                <p className="text-white font-bold">{formatRp(group.alokasi)}</p>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-blue-200 font-medium text-xs uppercase">Sudah Dirinci</p>
                <p className="text-emerald-300 font-bold">{formatRp(totalDirinciModul)}</p>
              </div>
              <div className="text-right bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
                <p className="text-blue-200 font-medium text-xs uppercase">Tersedia</p>
                <p className={`font-bold ${isHabis ? "text-red-400" : "text-amber-300"}`}>{formatRp(sisaAnggaran)}</p>
              </div>
            </div>
          </button>

          {/* Accordion Body */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-x-auto">
                {group.alokasi === 0 && (
                  <div className="bg-amber-50 text-amber-700 px-6 py-3 text-sm font-bold flex items-center gap-2 border-b border-amber-200">
                    <AlertCircle className="w-4 h-4" /> Alokasi anggaran untuk modul ini belum ditetapkan di menu Alokasi Anggaran.
                  </div>
                )}
                {isHabis && group.alokasi > 0 && (
                  <div className="bg-red-50 text-red-600 px-6 py-3 text-sm font-bold flex items-center gap-2 border-b border-red-100">
                    <AlertCircle className="w-4 h-4" /> Anggaran untuk modul ini sudah teralokasi sepenuhnya (Habis).
                  </div>
                )}

                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-gray-50 text-[#15406A]">
                    <tr>
                      <th className="border-y border-gray-200 px-4 py-3 text-center w-16">NO.</th>
                      <th className="border-y border-gray-200 px-4 py-3 w-32">KODE</th>
                      <th className="border-y border-gray-200 px-4 py-3 min-w-[250px]">Rincian Output (RO)</th>
                      <th className="border-y border-gray-200 px-4 py-3 text-center w-48">Anggaran (Rp.)</th>
                      <th className="border-y border-gray-200 px-4 py-3 text-center w-48">Realisasi (Rp.)</th>
                      <th className="border-y border-gray-200 px-4 py-3 text-center w-32">Persen (%)</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700">
                    {group.rows.map((row, index) => {
                      const hasSub = row.subRows.length > 0;
                      const displayAnggaran = hasSub ? row.subRows.reduce((a, b) => a + b.anggaran, 0) : row.anggaran;
                      const displayRealisasi = hasSub ? row.subRows.reduce((a, b) => a + b.realisasi, 0) : row.realisasi;

                      return (
                        <Fragment key={row.id}>
                          <tr className={`border-b border-gray-100 ${hasSub ? "bg-gray-50/50 font-semibold" : "hover:bg-blue-50/30 transition-colors"}`}>
                            <td className="border-r border-gray-100 px-4 py-3 text-center">{index + 1}</td>
                            <td className="border-r border-gray-100 px-4 py-3">{row.kode}</td>
                            <td className="border-r border-gray-100 px-4 py-3">{row.ro}</td>
                            <td className="border-r border-gray-100 p-0">
                              <div className={`flex w-full h-full ${hasSub ? "bg-gray-100" : "bg-transparent focus-within:bg-white"}`}>
                                <span className="pl-4 py-3 text-gray-400 font-medium">Rp</span>
                                <input
                                  type="text"
                                  value={formatInputAngka(displayAnggaran)}
                                  onChange={(e) => handleAngkaChange(e.target.value, group.modul, row.id, "anggaran", isABT)}
                                  disabled={hasSub || group.alokasi === 0}
                                  placeholder="0"
                                  className={`w-full h-full px-4 py-3 text-right outline-none font-bold ${hasSub || group.alokasi === 0 ? "bg-transparent text-gray-400 cursor-not-allowed" : "bg-transparent text-[#15406A]"}`}
                                />
                              </div>
                            </td>
                            <td className="border-r border-gray-100 p-0">
                              <div className={`flex w-full h-full ${hasSub ? "bg-gray-100" : "bg-transparent focus-within:bg-white"}`}>
                                <span className="pl-4 py-3 text-gray-400 font-medium">Rp</span>
                                <input
                                  type="text"
                                  value={formatInputAngka(displayRealisasi)}
                                  onChange={(e) => handleAngkaChange(e.target.value, group.modul, row.id, "realisasi", isABT)}
                                  disabled={hasSub}
                                  placeholder="0"
                                  className={`w-full h-full px-4 py-3 text-right outline-none font-bold ${hasSub ? "bg-transparent text-gray-400 cursor-not-allowed" : "bg-transparent text-[#15406A]"}`}
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center bg-gray-50/50 text-[#15406A] font-bold">{hitungPersen(displayRealisasi, displayAnggaran)}%</td>
                          </tr>

                          {row.subRows.map((sub) => (
                            <tr key={sub.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors bg-white">
                              <td className="border-r border-gray-100 px-4 py-2.5"></td>
                              <td className="border-r border-gray-100 px-4 py-2.5 text-sm">{sub.kode}</td>
                              <td className="border-r border-gray-100 px-4 py-2.5 relative">
                                <div className="absolute left-2 top-3 text-gray-300 pointer-events-none">
                                  <CornerDownRight className="w-4 h-4" />
                                </div>
                                <span className="pl-6 text-sm">{sub.ro}</span>
                              </td>
                              <td className="border-r border-gray-100 p-0">
                                <div className="flex w-full h-full bg-transparent focus-within:bg-white transition-colors">
                                  <span className="pl-4 py-2.5 text-gray-400 text-sm">Rp</span>
                                  <input
                                    type="text"
                                    value={formatInputAngka(sub.anggaran)}
                                    onChange={(e) => handleAngkaChange(e.target.value, group.modul, row.id, "anggaran", isABT, sub.id)}
                                    disabled={group.alokasi === 0}
                                    placeholder="0"
                                    className={`w-full h-full px-4 py-2.5 text-right bg-transparent outline-none text-sm font-semibold ${group.alokasi === 0 ? "text-gray-400 cursor-not-allowed" : "text-gray-600"}`}
                                  />
                                </div>
                              </td>
                              <td className="border-r border-gray-100 p-0">
                                <div className="flex w-full h-full bg-transparent focus-within:bg-white transition-colors">
                                  <span className="pl-4 py-2.5 text-gray-400 text-sm">Rp</span>
                                  <input
                                    type="text"
                                    value={formatInputAngka(sub.realisasi)}
                                    onChange={(e) => handleAngkaChange(e.target.value, group.modul, row.id, "realisasi", isABT, sub.id)}
                                    placeholder="0"
                                    className="w-full h-full px-4 py-2.5 text-right bg-transparent outline-none text-sm font-semibold text-gray-600"
                                  />
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-center text-sm font-bold text-[#15406A] bg-gray-50/30">{hitungPersen(sub.realisasi, sub.anggaran)}%</td>
                            </tr>
                          ))}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    });
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
                  {modal.type === "error" ? <AlertCircle className="w-8 h-8 text-red-600" /> : <CheckCircle className="w-8 h-8 text-emerald-600" />}
                  <h3 className={`text-xl font-bold ${modal.type === "error" ? "text-red-900" : "text-emerald-900"}`}>{modal.title}</h3>
                </div>
                <p className="mt-3 text-gray-700 leading-relaxed">{modal.message}</p>
              </div>
              <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
                <button onClick={closeModal} className={`px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-colors ${modal.type === "error" ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#15406A]">Rincian Anggaran</h1>
          <p className="text-gray-500 text-sm mt-1">Isi anggaran mendetail ke setiap RO dan Sub-RO yang terdaftar.</p>
        </div>
        <button onClick={handleDownloadExcel} className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-lg font-medium border border-emerald-200 transition-colors hover:bg-emerald-100">
          <Download className="w-4 h-4" /> Export Excel
        </button>
      </div>

      {/* Tabs Kategori */}
      <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
        <button onClick={() => setActiveTab("ABT")} className={`px-8 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === "ABT" ? "bg-white text-[#15406A] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          Kategori ABT
        </button>
        <button onClick={() => setActiveTab("NON-ABT")} className={`px-8 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === "NON-ABT" ? "bg-white text-[#15406A] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          Kategori NON-ABT
        </button>
      </div>

      {/* Area Render Modul Bawaan */}
      <div className="pt-2">{activeTab === "ABT" ? renderModulGroups(abtData, true) : renderModulGroups(nonAbtData, false)}</div>

      <div className="flex justify-end pt-4 pb-12">
        <motion.button onClick={simpanData} disabled={isSaving} className="flex items-center gap-2 bg-[#15406A] hover:bg-[#0f2f4e] text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-all disabled:opacity-70">
          {isSaving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save className="w-5 h-5" />}
          {isSaving ? "Menyimpan..." : "Simpan Seluruh Rincian"}
        </motion.button>
      </div>
    </div>
  );
}
