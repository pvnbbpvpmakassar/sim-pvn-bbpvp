"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Download, Trash2, Plus, PlusCircle, AlertCircle, RefreshCw, CornerDownRight, CheckCircle } from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

import { getRincianOutput, simpanBulkRincianOutput } from "@/app/actions/data";

// ==========================================================
// TIPE DATA
// ==========================================================

type SubRow = {
  id: string;
  kode: string;
  ro: string;
  orang: number;
  realisasiOrang: number;
  isReadOnly?: boolean;
};

type Row = {
  id: string;
  kode: string;
  ro: string;
  orang: number;
  realisasiOrang: number;
  subRows: SubRow[];
  isReadOnly?: boolean;
};

type RawSubRow = {
  id?: string | number | null;
  kode?: string | null;
  ro?: string | null;
  nama_ro?: string | null;
  orang?: number | null;
  realisasiOrang?: number | null;
  realisasi_orang?: number | null;
  realisasi?: number | null;
  isReadOnly?: boolean | null;
};

type RawRow = RawSubRow & {
  subRows?: RawSubRow[] | null;
};

type ModalConfig = {
  isOpen: boolean;
  type: "confirm" | "success" | "error";
  title: string;
  message: string;
  onConfirm?: () => void;
};

type EditableRowField = "kode" | "ro" | "orang" | "realisasiOrang";

type EditableSubRowField = "kode" | "ro" | "orang" | "realisasiOrang";

// ==========================================================
// HELPER NORMALISASI DATA
// ==========================================================

const toNumber = (value: number | null | undefined) => (typeof value === "number" && Number.isFinite(value) ? value : 0);

const normalizeSubRow = (sub: RawSubRow): SubRow => ({
  id: String(sub.id ?? crypto.randomUUID()),
  kode: sub.kode ?? "-",
  ro: sub.ro ?? sub.nama_ro ?? "-",
  orang: toNumber(sub.orang),
  realisasiOrang: toNumber(sub.realisasiOrang ?? sub.realisasi_orang ?? sub.realisasi),
  isReadOnly: Boolean(sub.isReadOnly),
});

const normalizeRow = (row: RawRow): Row => ({
  id: String(row.id ?? crypto.randomUUID()),
  kode: row.kode ?? "-",
  ro: row.ro ?? row.nama_ro ?? "-",
  orang: toNumber(row.orang),
  realisasiOrang: toNumber(row.realisasiOrang ?? row.realisasi_orang ?? row.realisasi),
  subRows: Array.isArray(row.subRows) ? row.subRows.map(normalizeSubRow) : [],
  isReadOnly: Boolean(row.isReadOnly),
});

// ==========================================================
// COMPONENT
// ==========================================================

export default function PflkKompetensiPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [modal, setModal] = useState<ModalConfig>({
    isOpen: false,
    type: "confirm",
    title: "",
    message: "",
  });

  const closeModal = () =>
    setModal((prev) => ({
      ...prev,
      isOpen: false,
    }));

  // ========================================================
  // HITUNG PERSENTASE
  // ========================================================

  const hitungPersen = (realisasi: number, target: number) => (target > 0 ? ((realisasi / target) * 100).toFixed(2) : "0.00");

  // ========================================================
  // LOAD DATA
  // ========================================================

  useEffect(() => {
    let cancelled = false;

    const initialLoad = async () => {
      try {
        const response = await getRincianOutput("NON-ABT", "pflk");

        if (!response.success) {
          throw new Error("error" in response && response.error ? response.error : "Gagal mengambil data dari database.");
        }

        if (!cancelled) {
          setRows(Array.isArray(response.data) ? response.data.map((row) => normalizeRow(row as RawRow)) : []);
        }
      } catch (error: unknown) {
        if (cancelled) return;

        const message = error instanceof Error ? error.message : "Gagal mengambil data dari database.";

        setRows([]);

        setModal({
          isOpen: true,
          type: "error",
          title: "Gagal Memuat",
          message,
        });
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void initialLoad();

    return () => {
      cancelled = true;
    };
  }, []);

  // ========================================================
  // METRIK TAMPILAN
  // ========================================================

  const getDisplayMetrics = (row: Row) => {
    const hasSub = row.subRows.length > 0;

    const orang = hasSub ? row.subRows.reduce((sum, sub) => sum + sub.orang, 0) : row.orang;

    const realisasiOrang = hasSub ? row.subRows.reduce((sum, sub) => sum + sub.realisasiOrang, 0) : row.realisasiOrang;

    return {
      orang,
      realisasiOrang,
      persen: hitungPersen(realisasiOrang, orang),
    };
  };

  // ========================================================
  // TAMBAH DATA
  // ========================================================

  const tambahBarisUtama = () => {
    setRows((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        kode: "-",
        ro: "-",
        orang: 0,
        realisasiOrang: 0,
        subRows: [],
      },
    ]);
  };

  const tambahSubBaris = (parentId: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === parentId
          ? {
              ...row,
              orang: 0,
              realisasiOrang: 0,
              subRows: [
                ...row.subRows,
                {
                  id: crypto.randomUUID(),
                  kode: "-",
                  ro: "-",
                  orang: 0,
                  realisasiOrang: 0,
                },
              ],
            }
          : row,
      ),
    );
  };

  // ========================================================
  // HAPUS DATA
  // ========================================================

  const hapusBarisUtama = (id: string) => {
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
  };

  const hapusSubBaris = (parentId: string, subId: string) => {
    setModal({
      isOpen: true,
      type: "confirm",
      title: "Hapus Sub-RO?",
      message: "Data ini akan dihapus dari tabel.",
      onConfirm: () => {
        setRows((prev) =>
          prev.map((row) =>
            row.id === parentId
              ? {
                  ...row,
                  subRows: row.subRows.filter((sub) => sub.id !== subId),
                }
              : row,
          ),
        );

        closeModal();
      },
    });
  };

  // ========================================================
  // BERSIHKAN TABEL
  // ========================================================

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

  // ========================================================
  // UPDATE DATA
  // ========================================================

  const updateBarisUtama = (id: string, field: EditableRowField, value: string | number) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]: value,
            }
          : row,
      ),
    );
  };

  const updateSubBaris = (parentId: string, subId: string, field: EditableSubRowField, value: string | number) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === parentId
          ? {
              ...row,
              subRows: row.subRows.map((sub) =>
                sub.id === subId
                  ? {
                      ...sub,
                      [field]: value,
                    }
                  : sub,
              ),
            }
          : row,
      ),
    );
  };

  // ========================================================
  // TOTAL
  // ========================================================

  const totals = rows.reduce(
    (acc, row) => {
      const metrics = getDisplayMetrics(row);

      acc.orang += metrics.orang;
      acc.realisasiOrang += metrics.realisasiOrang;

      return acc;
    },
    {
      orang: 0,
      realisasiOrang: 0,
    },
  );

  const totalOrang = totals.orang;
  const totalRealisasiOrang = totals.realisasiOrang;
  const totalPersen = hitungPersen(totalRealisasiOrang, totalOrang);

  // ========================================================
  // SIMPAN DATA
  // ========================================================

  const simpanData = async () => {
    setIsSaving(true);

    try {
      const rowsToSave = rows.map((row) => {
        const hasSub = row.subRows.length > 0;

        const subRowsToSave = row.subRows.map((sub) => ({
          ...sub,
          orang: toNumber(sub.orang),
          realisasiOrang: toNumber(sub.realisasiOrang),
        }));

        const parentOrang = hasSub ? subRowsToSave.reduce((acc, sub) => acc + sub.orang, 0) : toNumber(row.orang);

        const parentRealisasiOrang = hasSub ? subRowsToSave.reduce((acc, sub) => acc + sub.realisasiOrang, 0) : toNumber(row.realisasiOrang);

        return {
          ...row,
          orang: parentOrang,
          realisasiOrang: parentRealisasiOrang,
          subRows: subRowsToSave,
        };
      });

      const result = await simpanBulkRincianOutput("NON-ABT", "pflk", rowsToSave);

      if (result.success) {
        setModal({
          isOpen: true,
          type: "success",
          title: "Berhasil",
          message: "Data PFLK berhasil disimpan ke Database!",
        });
      } else {
        setModal({
          isOpen: true,
          type: "error",
          title: "Gagal",
          message: `Terjadi kesalahan saat menyimpan ke database: ${result.error}`,
        });
      }
    } catch (error: unknown) {
      setModal({
        isOpen: true,
        type: "error",
        title: "Gagal",
        message: error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan data.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ========================================================
  // EXPORT EXCEL
  // ========================================================

  const handleDownloadExcel = async () => {
    if (rows.length === 0) {
      setModal({
        isOpen: true,
        type: "error",
        title: "Gagal",
        message: "Tabel kosong.",
      });

      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("PFLK");

    worksheet.columns = [
      {
        header: "NO.",
        key: "no",
        width: 8,
      },
      {
        header: "KODE",
        key: "kode",
        width: 15,
      },
      {
        header: "RINCIAN OUTPUT (RO)",
        key: "ro",
        width: 45,
      },
      {
        header: "TARGET ORANG",
        key: "orang",
        width: 18,
      },
      {
        header: "REALISASI ORANG",
        key: "realisasiOrang",
        width: 20,
      },
      {
        header: "CAPAIAN (%)",
        key: "persen",
        width: 18,
      },
    ];

    // ------------------------------------------------------
    // BORDER EXCEL
    // ------------------------------------------------------

    const applyBorder = (row: ExcelJS.Row) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: {
            style: "thin",
            color: {
              argb: "FFCCCCCC",
            },
          },
          left: {
            style: "thin",
            color: {
              argb: "FFCCCCCC",
            },
          },
          bottom: {
            style: "thin",
            color: {
              argb: "FFCCCCCC",
            },
          },
          right: {
            style: "thin",
            color: {
              argb: "FFCCCCCC",
            },
          },
        };

        cell.alignment = {
          vertical: "middle",
          horizontal: "center",
        };
      });

      const roCell = row.getCell(3);

      if (roCell) {
        roCell.alignment = {
          vertical: "middle",
          horizontal: "left",
        };
      }
    };

    // ------------------------------------------------------
    // HEADER
    // ------------------------------------------------------

    const headerRow = worksheet.getRow(1);

    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: "FF15406A",
        },
      };

      cell.font = {
        color: {
          argb: "FFFFFFFF",
        },
        bold: true,
      };

      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
      };

      cell.border = {
        top: {
          style: "thin",
          color: {
            argb: "FFFFFFFF",
          },
        },
        left: {
          style: "thin",
          color: {
            argb: "FFFFFFFF",
          },
        },
        bottom: {
          style: "thin",
          color: {
            argb: "FFFFFFFF",
          },
        },
        right: {
          style: "thin",
          color: {
            argb: "FFFFFFFF",
          },
        },
      };
    });

    // ------------------------------------------------------
    // DATA
    // ------------------------------------------------------

    rows.forEach((row, index) => {
      const metrics = getDisplayMetrics(row);
      const hasSub = row.subRows.length > 0;

      const parentRow = worksheet.addRow({
        no: index + 1,
        kode: row.kode,
        ro: row.ro,
        orang: metrics.orang,
        realisasiOrang: metrics.realisasiOrang,
        persen: `${metrics.persen}%`,
      });

      applyBorder(parentRow);

      if (hasSub) {
        parentRow.font = {
          bold: true,
        };

        parentRow.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: {
            argb: "FFF9FAFB",
          },
        };
      }

      // ----------------------------------------------------
      // SORT SUB-RO
      // ----------------------------------------------------

      const sortedSubRows = [...row.subRows].sort((a, b) =>
        a.kode.localeCompare(b.kode, undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      );

      sortedSubRows.forEach((sub) => {
        const subPersen = hitungPersen(sub.realisasiOrang, sub.orang);

        const subRow = worksheet.addRow({
          no: "",
          kode: sub.kode,
          ro: `    ↳ ${sub.ro}`,
          orang: sub.orang,
          realisasiOrang: sub.realisasiOrang,
          persen: `${subPersen}%`,
        });

        applyBorder(subRow);
      });
    });

    // ------------------------------------------------------
    // TOTAL EXCEL
    // ------------------------------------------------------

    const totalRow = worksheet.addRow({
      no: "",
      kode: "",
      ro: "JUMLAH TOTAL",
      orang: totalOrang,
      realisasiOrang: totalRealisasiOrang,
      persen: `${totalPersen}%`,
    });

    totalRow.eachCell(
      {
        includeEmpty: true,
      },
      (cell, colNumber) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: {
            argb: "FFF59E0B",
          },
        };

        cell.font = {
          color: {
            argb: "FFFFFFFF",
          },
          bold: true,
        };

        cell.border = {
          top: {
            style: "thin",
            color: {
              argb: "FFFFFFFF",
            },
          },
          left: {
            style: "thin",
            color: {
              argb: "FFFFFFFF",
            },
          },
          bottom: {
            style: "thin",
            color: {
              argb: "FFFFFFFF",
            },
          },
          right: {
            style: "thin",
            color: {
              argb: "FFFFFFFF",
            },
          },
        };

        if (colNumber === 3) {
          cell.alignment = {
            vertical: "middle",
            horizontal: "right",
          };
        } else {
          cell.alignment = {
            vertical: "middle",
            horizontal: "center",
          };
        }
      },
    );

    worksheet.mergeCells(`A${totalRow.number}:C${totalRow.number}`);

    // ------------------------------------------------------
    // DOWNLOAD
    // ------------------------------------------------------

    const buffer = await workbook.xlsx.writeBuffer();

    saveAs(new Blob([buffer]), "Data_PFLK_Kompetensi.xlsx");
  };

  // ========================================================
  // LOADING
  // ========================================================

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

  // ========================================================
  // MAIN UI
  // ========================================================

  return (
    <div className="space-y-6 relative">
      {/* ====================================================
          MODAL
      ==================================================== */}

      <AnimatePresence>
        {modal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.95,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                scale: 0.95,
              }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative"
            >
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

      {/* ====================================================
          HEADER
      ==================================================== */}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#15406A]">PFLK (NON-ABT)</h1>

          <p className="text-gray-500 text-sm mt-1">Kelola data target dan realisasi output PFLK</p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handleDownloadExcel} className="flex items-center gap-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-4 py-2 rounded-lg font-medium transition-colors border border-emerald-200">
            <Download className="w-4 h-4" />
            Excel
          </button>

          <button onClick={bersihkanTabel} className="flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg font-medium transition-colors border border-red-200">
            <RefreshCw className="w-4 h-4" />
            Bersihkan
          </button>
        </div>
      </div>

      {/* ====================================================
          WARNING
      ==================================================== */}

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />

        <p className="text-amber-800 text-sm font-medium leading-relaxed">
          <span className="font-bold">Peringatan:</span> Pastikan Anda selalu menekan tombol <b className="text-[#15406A]">Simpan Data</b> di bagian bawah tabel setelah selesai menambah atau mengedit rincian.
        </p>
      </div>

      {/* ====================================================
          TABLE
      ==================================================== */}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            {/* ------------------------------------------------
                TABLE HEADER
            ------------------------------------------------ */}

            <thead className="bg-[#15406A] text-white">
              <tr>
                <th rowSpan={2} className="border border-[#1a4e82] px-4 py-3 text-center w-16">
                  NO.
                </th>

                <th rowSpan={2} className="border border-[#1a4e82] px-4 py-3 w-32">
                  Kode
                </th>

                <th rowSpan={2} className="border border-[#1a4e82] px-4 py-3 min-w-[250px]">
                  Rincian Output (RO)
                </th>

                <th colSpan={3} className="border border-[#1a4e82] px-4 py-2 text-center">
                  NON-ABT
                </th>

                <th rowSpan={2} className="border border-[#1a4e82] px-4 py-3 text-center w-32">
                  Aksi
                </th>
              </tr>

              <tr>
                <th className="border border-[#1a4e82] px-4 py-2 text-center bg-[#184878] w-32">Target Orang</th>

                <th className="border border-[#1a4e82] px-4 py-3 text-center bg-[#184878] w-32">Realisasi Orang</th>

                <th className="border border-[#1a4e82] px-4 py-3 text-center bg-[#184878] w-28">Capaian (%)</th>
              </tr>
            </thead>

            {/* ------------------------------------------------
                TABLE BODY
            ------------------------------------------------ */}

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

                  const metrics = getDisplayMetrics(row);

                  const sortedSubRows = [...row.subRows].sort((a, b) =>
                    a.kode.localeCompare(b.kode, undefined, {
                      numeric: true,
                      sensitivity: "base",
                    }),
                  );

                  return (
                    <React.Fragment key={row.id}>
                      {/* --------------------------------------
                          PARENT ROW
                      -------------------------------------- */}

                      <tr className={`border-b border-gray-200 transition-colors ${hasSub ? "bg-gray-50/50 font-semibold" : "hover:bg-blue-50/30"}`}>
                        {/* NO */}
                        <td className="border-r border-gray-200 px-4 py-2 text-center">{index + 1}</td>

                        {/* KODE */}
                        <td className="border-r border-gray-200 p-0">
                          <input type="text" value={row.kode} onChange={(e) => updateBarisUtama(row.id, "kode", e.target.value)} className="w-full h-full px-4 py-3 bg-transparent outline-none focus:bg-blue-50/50" />
                        </td>

                        {/* RO */}
                        <td className="border-r border-gray-200 p-0">
                          <input type="text" value={row.ro} onChange={(e) => updateBarisUtama(row.id, "ro", e.target.value)} className="w-full h-full px-4 py-3 bg-transparent outline-none focus:bg-blue-50/50" />
                        </td>

                        {/* TARGET ORANG */}
                        <td className="border-r border-gray-200 p-0">
                          <input
                            type="number"
                            value={metrics.orang === 0 ? "" : metrics.orang}
                            onChange={(e) => updateBarisUtama(row.id, "orang", Number(e.target.value))}
                            disabled={hasSub}
                            placeholder="0"
                            className={`w-full h-full px-4 py-3 text-center outline-none ${hasSub ? "bg-gray-100 cursor-not-allowed" : "bg-transparent focus:bg-blue-50/50"}`}
                          />
                        </td>

                        {/* REALISASI ORANG */}
                        <td className="border-r border-gray-200 p-0">
                          <input
                            type="number"
                            value={metrics.realisasiOrang === 0 ? "" : metrics.realisasiOrang}
                            onChange={(e) => updateBarisUtama(row.id, "realisasiOrang", Number(e.target.value))}
                            disabled={hasSub}
                            placeholder="0"
                            className={`w-full h-full px-4 py-3 text-center outline-none ${hasSub ? "bg-gray-100 cursor-not-allowed" : "bg-transparent focus:bg-blue-50/50"}`}
                          />
                        </td>

                        {/* CAPAIAN */}
                        <td className="border-r border-gray-200 px-4 py-3 text-center bg-gray-50 text-[#15406A] font-bold">{metrics.persen}%</td>

                        {/* AKSI */}
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

                      {/* --------------------------------------
                          SUB ROW
                      -------------------------------------- */}

                      {sortedSubRows.map((sub) => {
                        const subPersen = hitungPersen(sub.realisasiOrang, sub.orang);

                        return (
                          <tr key={sub.id} className="border-b border-gray-100 hover:bg-blue-50/30">
                            {/* NO */}
                            <td className="border-r border-gray-200 bg-gray-50"></td>

                            {/* KODE */}
                            <td className="border-r border-gray-200 p-0 relative">
                              <div className="absolute left-2 top-3.5 text-gray-300 pointer-events-none">
                                <CornerDownRight className="w-4 h-4" />
                              </div>

                              <input type="text" value={sub.kode} onChange={(e) => updateSubBaris(row.id, sub.id, "kode", e.target.value)} className="w-full h-full pl-8 pr-4 py-2.5 bg-transparent outline-none focus:bg-white text-sm" />
                            </td>

                            {/* RO */}
                            <td className="border-r border-gray-200 p-0">
                              <input
                                type="text"
                                value={sub.ro}
                                onChange={(e) => updateSubBaris(row.id, sub.id, "ro", e.target.value)}
                                className="w-full h-full px-4 py-2.5 bg-transparent outline-none focus:bg-white text-sm"
                                placeholder="Sub-rincian..."
                              />
                            </td>

                            {/* TARGET ORANG */}
                            <td className="border-r border-gray-200 p-0">
                              <input
                                type="number"
                                value={sub.orang === 0 ? "" : sub.orang}
                                onChange={(e) => updateSubBaris(row.id, sub.id, "orang", Number(e.target.value))}
                                placeholder="0"
                                className="w-full h-full px-4 py-2.5 text-center bg-transparent outline-none focus:bg-white text-sm"
                              />
                            </td>

                            {/* REALISASI ORANG */}
                            <td className="border-r border-gray-200 p-0">
                              <input
                                type="number"
                                value={sub.realisasiOrang === 0 ? "" : sub.realisasiOrang}
                                onChange={(e) => updateSubBaris(row.id, sub.id, "realisasiOrang", Number(e.target.value))}
                                placeholder="0"
                                className="w-full h-full px-4 py-2.5 text-center bg-transparent outline-none focus:bg-white text-sm"
                              />
                            </td>

                            {/* CAPAIAN */}
                            <td className="border-r border-gray-200 px-4 py-2.5 text-center bg-gray-50/50 text-[#15406A] font-semibold text-sm">{subPersen}%</td>

                            {/* AKSI */}
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

            {/* ------------------------------------------------
                FOOTER TOTAL
            ------------------------------------------------ */}

            {rows.length > 0 && (
              <tfoot className="bg-amber-400 text-white font-bold tracking-wide">
                <tr>
                  <td colSpan={3} className="border border-[#1a4e82] px-4 py-4 text-right uppercase">
                    Jumlah Total
                  </td>

                  <td className="border border-[#1a4e82] px-4 py-4 text-center bg-amber-500">{totalOrang}</td>

                  <td className="border border-[#1a4e82] px-4 py-4 text-center bg-amber-500 text-emerald-300">{totalRealisasiOrang}</td>

                  <td className="border border-[#1a4e82] px-4 py-4 text-center text-blue-200">{totalPersen}%</td>

                  <td className="border border-[#1a4e82] bg-amber-400"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* ==================================================
            TAMBAH RO
        ================================================== */}

        <div className="bg-gray-50 p-4 border-t border-gray-200">
          <button onClick={tambahBarisUtama} className="flex items-center gap-2 text-sm font-bold text-[#15406A] hover:text-blue-800 transition-colors">
            <Plus className="w-5 h-5" />
            Tambah RO Baru
          </button>
        </div>
      </div>

      {/* ====================================================
          SAVE
      ==================================================== */}

      <div className="flex justify-end pt-4">
        <motion.button onClick={simpanData} disabled={isSaving} className="flex items-center gap-2 bg-[#15406A] hover:bg-[#0f2f4e] text-white px-8 py-3 rounded-xl font-bold transition-all disabled:opacity-70">
          {isSaving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save className="w-5 h-5" />}

          {isSaving ? "Menyimpan..." : "Simpan Data"}
        </motion.button>
      </div>
    </div>
  );
}
