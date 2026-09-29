"use client";

import React, { useState, Fragment } from "react";
import { motion } from "framer-motion";
import { Save, Download, Trash2, Plus, PlusCircle, AlertCircle, RefreshCw, CornerDownRight } from "lucide-react";
import { getRincianOutput } from "@/app/actions/data";

// --- Tipe Data ---
type SubRow = {
  id: string;
  kode: string;
  ro: string;
  paket: number;
  realisasi: number;
};

type Row = {
  id: string;
  kode: string;
  ro: string;
  paket: number;
  realisasi: number;
  subRows: SubRow[];
};

export default function UPTDPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Gunakan useEffect untuk mengambil data SQL murni saat halaman dirender
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingData(true);
      // Panggil server action dengan parameter kategori dan modul
      const response = await getRincianOutput("ABT", "uptd");

      if (response.success && response.data) {
        // Timpa state awal dengan data asli dari PostgreSQL
        setRows(response.data as Row[]);
      } else {
        console.error(response.error);
      }
      setIsLoadingData(false);
    };

    fetchData();
  }, []);

  // --- Fungsi Kalkulasi Otomatis ---
  const hitungOrang = (paket: number) => paket * 16;
  const hitungPersen = (realisasi: number, orang: number) => (orang > 0 ? ((realisasi / orang) * 100).toFixed(2) : "0.00");

  // --- Fungsi Manipulasi Baris ---
  const tambahBarisUtama = () => {
    setRows([...rows, { id: crypto.randomUUID(), kode: "-", ro: "-", paket: 0, realisasi: 0, subRows: [] }]);
  };

  const tambahSubBaris = (parentId: string) => {
    setRows(
      rows.map((row) => {
        if (row.id === parentId) {
          return {
            ...row,
            // Reset nilai induk karena sekarang bergantung pada sub-baris
            paket: 0,
            realisasi: 0,
            subRows: [...row.subRows, { id: crypto.randomUUID(), kode: "-", ro: "-", paket: 0, realisasi: 0 }],
          };
        }
        return row;
      }),
    );
  };

  const hapusBarisUtama = (id: string) => {
    setRows(rows.filter((row) => row.id !== id));
  };

  const hapusSubBaris = (parentId: string, subId: string) => {
    setRows(
      rows.map((row) => {
        if (row.id === parentId) {
          return { ...row, subRows: row.subRows.filter((sub) => sub.id !== subId) };
        }
        return row;
      }),
    );
  };

  const bersihkanTabel = () => {
    if (confirm("Apakah Anda yakin ingin menghapus semua data di tabel ini?")) {
      setRows([]);
    }
  };

  // --- Fungsi Update Data (Inline Editing) ---
  const updateBarisUtama = (id: string, field: keyof Row, value: string | number) => {
    setRows(rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const updateSubBaris = (parentId: string, subId: string, field: keyof SubRow, value: string | number) => {
    setRows(
      rows.map((row) => {
        if (row.id === parentId) {
          const newSubRows = row.subRows.map((sub) => (sub.id === subId ? { ...sub, [field]: value } : sub));
          return { ...row, subRows: newSubRows };
        }
        return row;
      }),
    );
  };

  const simpanData = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      alert("Data UPTD berhasil disimpan!");
    }, 1000);
  };

  const totalPaket = rows.reduce((sum, row) => {
    const hasSub = row.subRows.length > 0;
    const rowPaket = hasSub ? row.subRows.reduce((acc, sub) => acc + (sub.paket || 0), 0) : row.paket || 0;
    return sum + rowPaket;
  }, 0);

  const totalRealisasi = rows.reduce((sum, row) => {
    const hasSub = row.subRows.length > 0;
    const rowRealisasi = hasSub ? row.subRows.reduce((acc, sub) => acc + (sub.realisasi || 0), 0) : row.realisasi || 0;
    return sum + rowRealisasi;
  }, 0);

  const totalOrang = hitungOrang(totalPaket);
  const totalPersen = hitungPersen(totalRealisasi, totalOrang);

  return (
    <div className="space-y-6">
      {/* Header & Tombol Aksi Atas */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#15406A]">UPTD (ABT)</h1>
          <p className="text-gray-500 text-sm mt-1">Kelola data target dan realisasi output UPTD.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-4 py-2 rounded-lg font-medium transition-colors border border-emerald-200">
            <Download className="w-4 h-4" /> Excel
          </button>
          <button onClick={bersihkanTabel} className="flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg font-medium transition-colors border border-red-200">
            <RefreshCw className="w-4 h-4" /> Bersihkan
          </button>
        </div>
      </div>

      {/* Peringatan */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-amber-800 text-sm font-medium leading-relaxed">
          <span className="font-bold">Peringatan:</span> Pastikan Anda selalu menekan tombol <b className="text-[#15406A]">Simpan Data</b> di bagian bawah tabel setelah selesai menambah atau mengedit rincian.
        </p>
      </div>

      {/* Area Tabel */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-[#15406A] text-white">
              <tr>
                <th rowSpan={3} className="border border-[#1a4e82] px-4 py-3 text-center w-16">
                  NO.
                </th>
                <th rowSpan={3} className="border border-[#1a4e82] px-4 py-3 w-32">
                  Kode
                </th>
                <th rowSpan={3} className="border border-[#1a4e82] px-4 py-3 min-w-[250px]">
                  Rincian Output (RO)
                </th>
                <th colSpan={4} className="border border-[#1a4e82] px-4 py-2 text-center">
                  ABT
                </th>
                <th rowSpan={3} className="border border-[#1a4e82] px-4 py-3 text-center w-32">
                  Aksi
                </th>
              </tr>
              <tr>
                <th colSpan={2} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#184878]">
                  Target
                </th>
                <th rowSpan={2} className="border border-[#1a4e82] px-4 py-3 text-center bg-[#184878] w-28">
                  Realisasi
                </th>
                <th rowSpan={2} className="border border-[#1a4e82] px-4 py-3 text-center bg-[#184878] w-28">
                  Persen (%)
                </th>
              </tr>
              <tr>
                <th className="border border-[#1a4e82] px-4 py-2 text-center bg-[#1c548c] w-24">Paket</th>
                <th className="border border-[#1a4e82] px-4 py-2 text-center bg-[#1c548c] w-24">Orang</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400 font-medium">
                    Tabel masih kosong. Klik Tambah RO Baru untuk memulai.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => {
                  const hasSub = row.subRows.length > 0;
                  const displayPaket = hasSub ? row.subRows.reduce((acc, curr) => acc + (curr.paket || 0), 0) : row.paket;
                  const displayRealisasi = hasSub ? row.subRows.reduce((acc, curr) => acc + (curr.realisasi || 0), 0) : row.realisasi;
                  const displayOrang = hitungOrang(displayPaket);
                  const displayPersen = hitungPersen(displayRealisasi, displayOrang);

                  return (
                    <Fragment key={row.id}>
                      {/* Baris Induk (RO) */}
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
                            value={displayPaket === 0 ? "" : displayPaket}
                            onChange={(e) => updateBarisUtama(row.id, "paket", Number(e.target.value))}
                            disabled={hasSub}
                            placeholder="0"
                            className={`w-full h-full px-4 py-3 text-center outline-none ${hasSub ? "bg-gray-100 cursor-not-allowed" : "bg-transparent focus:bg-blue-50/50"}`}
                          />
                        </td>
                        <td className="border-r border-gray-200 px-4 py-3 text-center bg-gray-50">{displayOrang}</td>
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
                            <button onClick={() => tambahSubBaris(row.id)} title="Tambah Sub-RO" className="p-1.5 bg-blue-100 text-[#15406A] rounded hover:bg-blue-200 transition-colors">
                              <PlusCircle className="w-4 h-4" />
                            </button>
                            <button onClick={() => hapusBarisUtama(row.id)} title="Hapus RO" className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Baris Anak (Sub-RO) */}
                      {row.subRows.map((sub) => {
                        const subOrang = hitungOrang(sub.paket);
                        const subPersen = hitungPersen(sub.realisasi, subOrang);
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
                                value={sub.paket === 0 ? "" : sub.paket}
                                onChange={(e) => updateSubBaris(row.id, sub.id, "paket", Number(e.target.value))}
                                placeholder="0"
                                className="w-full h-full px-4 py-2.5 text-center bg-transparent outline-none focus:bg-white text-sm"
                              />
                            </td>
                            <td className="border-r border-gray-200 px-4 py-2.5 text-center bg-gray-50/50 text-sm text-gray-500">{subOrang}</td>
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
                              <button onClick={() => hapusSubBaris(row.id, sub.id)} title="Hapus Sub-RO" className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
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
            {/* --- TABLE FOOTER: BARIS JUMLAH TOTAL --- */}
            {rows.length > 0 && (
              <tfoot className="bg-amber-400 text-white font-bold tracking-wide">
                <tr>
                  <td colSpan={3} className="border border-[#1a4e82] px-4 py-4 text-right uppercase">
                    Jumlah Total
                  </td>
                  <td className="border border-[#1a4e82] px-4 py-4 text-center bg-amber-500">{totalPaket}</td>
                  <td className="border border-[#1a4e82] px-4 py-4 text-center text-blue-100">{totalOrang}</td>
                  <td className="border border-[#1a4e82] px-4 py-4 text-center bg-amber-500 text-emerald-300">{totalRealisasi}</td>
                  <td className="border border-[#1a4e82] px-4 py-4 text-center text-blue-200">{totalPersen}%</td>
                  <td className="border border-[#1a4e82] bg-amber-400"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Footer / Tombol Tambah Baris */}
        <div className="bg-gray-50 p-4 border-t border-gray-200">
          <button onClick={tambahBarisUtama} className="flex items-center gap-2 text-sm font-bold text-[#15406A] hover:text-blue-800 transition-colors">
            <Plus className="w-5 h-5" /> Tambah RO Baru
          </button>
        </div>
      </div>

      {/* Area Simpan */}
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
