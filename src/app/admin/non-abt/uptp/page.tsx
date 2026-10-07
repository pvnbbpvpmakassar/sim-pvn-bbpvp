"use client";

import React, { useState, useEffect, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Download, Trash2, Plus, PlusCircle, AlertCircle, RefreshCw, CornerDownRight, Lock, CheckCircle } from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

import { getRincianOutput, getIntegrasiUPTP, simpanBulkRincianOutput } from "@/app/actions/data";

// ============================================================
// TYPES
// ============================================================

type SubRow = {
  id: string;
  kode: string;
  ro: string;
  paket: number;
  orang: number;
  realisasiPaket: number;
  realisasiOrang: number;
  isReadOnly?: boolean;
};

type Row = {
  id: string;
  kode: string;
  ro: string;
  paket: number;
  orang: number;
  realisasiPaket: number;
  realisasiOrang: number;
  subRows: SubRow[];
  isReadOnly?: boolean;
};

type ModalConfig = {
  isOpen: boolean;
  type: "confirm" | "success" | "error";
  title: string;
  message: string;
  onConfirm?: () => void;
};

// ============================================================
// RAW DATABASE TYPES
// ============================================================

type RawSubRow = {
  id?: string | number | null;
  kode?: string | null;
  ro?: string | null;
  nama_ro?: string | null;
  paket?: number | null;
  orang?: number | null;
  realisasiPaket?: number | null;
  realisasiOrang?: number | null;
  isReadOnly?: boolean | null;
};

type RawRow = {
  id?: string | number | null;
  kode?: string | null;
  ro?: string | null;
  nama_ro?: string | null;
  paket?: number | null;
  orang?: number | null;
  realisasiPaket?: number | null;
  realisasiOrang?: number | null;
  isReadOnly?: boolean | null;
  subRows?: RawSubRow[] | null;
};

type IntegrationModuleData = {
  kode?: string | null;
  paket?: number | null;
  orang?: number | null;
  realisasiPaket?: number | null;
  realisasiOrang?: number | null;
};

type IntegrationUPTPData = {
  tmt?: IntegrationModuleData;
  lpks?: IntegrationModuleData;
  blkk?: IntegrationModuleData;
};

// ============================================================
// CONSTANTS
// ============================================================

const PARENT_UUID = "22222222-2222-2222-2222-222222222222";

const TMT_UUID = "22222222-2222-2222-2222-222222222223";

const initialReadOnlyRows: Row[] = [
  {
    id: PARENT_UUID,
    kode: "4057.SCO.003",
    ro: "Bidang Industri dan Jasa",
    paket: 0,
    orang: 0,
    realisasiPaket: 0,
    realisasiOrang: 0,
    isReadOnly: true,
    subRows: [
      {
        id: TMT_UUID,
        kode: "-",
        ro: "TMT",
        paket: 0,
        orang: 0,
        realisasiPaket: 0,
        realisasiOrang: 0,
        isReadOnly: true,
      },
    ],
  },
];

// ============================================================
// NORMALIZER
// ============================================================

function normalizeSubRow(sub: RawSubRow): SubRow {
  return {
    id: String(sub.id ?? crypto.randomUUID()),
    kode: String(sub.kode ?? ""),
    ro: String(sub.ro ?? sub.nama_ro ?? ""),
    paket: Number(sub.paket ?? 0),
    orang: Number(sub.orang ?? 0),
    realisasiPaket: Number(sub.realisasiPaket ?? 0),
    realisasiOrang: Number(sub.realisasiOrang ?? 0),
    isReadOnly: Boolean(sub.isReadOnly),
  };
}

function normalizeRow(row: RawRow): Row {
  return {
    id: String(row.id ?? crypto.randomUUID()),
    kode: String(row.kode ?? ""),
    ro: String(row.ro ?? row.nama_ro ?? ""),
    paket: Number(row.paket ?? 0),
    orang: Number(row.orang ?? 0),
    realisasiPaket: Number(row.realisasiPaket ?? 0),
    realisasiOrang: Number(row.realisasiOrang ?? 0),
    isReadOnly: Boolean(row.isReadOnly),
    subRows: Array.isArray(row.subRows) ? row.subRows.map(normalizeSubRow) : [],
  };
}

// ============================================================
// FETCH DATA
// ============================================================

async function fetchUPTPData(): Promise<Row[]> {
  const [resUPTP, resIntegrasi] = await Promise.all([getRincianOutput("NON-ABT", "uptp"), getIntegrasiUPTP("NON-ABT")]);

  if (!resUPTP.success) {
    const errorMessage = "error" in resUPTP && resUPTP.error ? resUPTP.error : "Gagal mengambil data rincian output.";

    throw new Error(errorMessage);
  }

  if (!resIntegrasi.success) {
    const errorMessage = "error" in resIntegrasi && resIntegrasi.error ? resIntegrasi.error : "Gagal mengambil data integrasi UPTP.";

    throw new Error(errorMessage);
  }

  const manualData: Row[] = Array.isArray(resUPTP.data) ? resUPTP.data.map((row) => normalizeRow(row)) : [];

  const integrationData: IntegrationUPTPData | undefined = resIntegrasi.data;

  const tmt: IntegrationModuleData = integrationData?.tmt ?? {
    kode: "-",
    paket: 0,
    orang: 0,
    realisasiPaket: 0,
    realisasiOrang: 0,
  };

  const integratedRow: Row = {
    id: PARENT_UUID,
    kode: "4057.SCO.003",
    ro: "Bidang Industri dan Jasa",
    paket: 0,
    orang: 0,
    realisasiPaket: 0,
    realisasiOrang: 0,
    isReadOnly: true,

    subRows: [
      {
        id: TMT_UUID,
        kode: tmt.kode ?? "-",
        ro: "TMT",
        paket: Number(tmt.paket ?? 0),
        orang: Number(tmt.orang ?? 0),
        realisasiPaket: Number(tmt.realisasiPaket ?? 0),
        realisasiOrang: Number(tmt.realisasiOrang ?? 0),
        isReadOnly: true,
      },
    ],
  };

  const existingParentInDB = manualData.find((row) => row.id === PARENT_UUID);

  if (existingParentInDB) {
    const manualSubRows = existingParentInDB.subRows.filter((sub) => !sub.isReadOnly && sub.id !== TMT_UUID);

    integratedRow.subRows = [...integratedRow.subRows, ...manualSubRows];
  }

  const filteredManual = manualData.filter((row) => row.id !== PARENT_UUID);

  return [integratedRow, ...filteredManual];
}

// ============================================================
// COMPONENT
// ============================================================

export default function UPTPPage() {
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

  // ==========================================================
  // KALKULASI
  // ==========================================================

  const hitungPersen = (realisasi: number, target: number) => (target > 0 ? ((realisasi / target) * 100).toFixed(2) : "0.00");

  // ==========================================================
  // LOAD DATA
  // ==========================================================

  const loadData = async () => {
    try {
      setIsLoading(true);

      const data = await fetchUPTPData();

      setRows(data);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan tidak diketahui.";

      setRows(initialReadOnlyRows);

      setModal({
        isOpen: true,
        type: "error",
        title: "Gagal Memuat Database",
        message: `Pesan Error: ${errorMessage}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const initialLoad = async () => {
      try {
        const data = await fetchUPTPData();

        if (cancelled) return;

        setRows(data);
      } catch (error: unknown) {
        if (cancelled) return;

        const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan tidak diketahui.";

        setRows(initialReadOnlyRows);

        setModal({
          isOpen: true,
          type: "error",
          title: "Gagal Memuat Database",
          message: `Pesan Error: ${errorMessage}`,
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

  // ==========================================================
  // TAMBAH RO
  // ==========================================================

  const tambahBarisUtama = () => {
    setRows((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        kode: "-",
        ro: "-",
        paket: 0,
        orang: 0,
        realisasiPaket: 0,
        realisasiOrang: 0,
        subRows: [],
        isReadOnly: false,
      },
    ]);
  };

  // ==========================================================
  // TAMBAH SUB RO
  // ==========================================================

  const tambahSubBaris = (parentId: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === parentId
          ? {
              ...row,
              paket: 0,
              orang: 0,
              realisasiPaket: 0,
              realisasiOrang: 0,
              subRows: [
                ...row.subRows,
                {
                  id: crypto.randomUUID(),
                  kode: "-",
                  ro: "-",
                  paket: 0,
                  orang: 0,
                  realisasiPaket: 0,
                  realisasiOrang: 0,
                  isReadOnly: false,
                },
              ],
            }
          : row,
      ),
    );
  };

  // ==========================================================
  // HAPUS RO
  // ==========================================================

  const hapusBarisUtama = (id: string) => {
    const rowToDelete = rows.find((row) => row.id === id);

    if (rowToDelete?.isReadOnly) return;

    setModal({
      isOpen: true,
      type: "confirm",
      title: "Hapus Rincian Output?",
      message: "Tindakan ini juga menghapus semua sub-rincian. Lanjutkan?",
      onConfirm: () => {
        setRows((prev) => prev.filter((row) => row.id !== id));

        closeModal();
      },
    });
  };

  // ==========================================================
  // HAPUS SUB RO
  // ==========================================================

  const hapusSubBaris = (parentId: string, subId: string) => {
    setModal({
      isOpen: true,
      type: "confirm",
      title: "Hapus Sub-Rincian?",
      message: "Data akan dihapus secara permanen dari tabel.",
      onConfirm: () => {
        setRows((prev) =>
          prev.map((row) =>
            row.id === parentId
              ? {
                  ...row,
                  subRows: row.subRows.filter((sub) => sub.id !== subId || sub.isReadOnly),
                }
              : row,
          ),
        );

        closeModal();
      },
    });
  };

  // ==========================================================
  // BERSIHKAN
  // ==========================================================

  const bersihkanTabel = () => {
    setModal({
      isOpen: true,
      type: "confirm",
      title: "Bersihkan Tabel?",
      message: "Hapus semua data manual di tabel ini? (Data TMT tetap ada)",
      onConfirm: () => {
        const resetRows = rows
          .filter((row) => row.isReadOnly)
          .map((row) => ({
            ...row,
            subRows: row.subRows.filter((sub) => sub.isReadOnly),
          }));

        setRows(resetRows);

        closeModal();
      },
    });
  };

  // ==========================================================
  // UPDATE ROW
  // ==========================================================

  const updateBarisUtama = (id: string, field: keyof Row, value: string | number) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id && !row.isReadOnly
          ? {
              ...row,
              [field]: value,
            }
          : row,
      ),
    );
  };

  // ==========================================================
  // UPDATE SUB ROW
  // ==========================================================

  const updateSubBaris = (parentId: string, subId: string, field: keyof SubRow, value: string | number) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === parentId
          ? {
              ...row,
              subRows: row.subRows.map((sub) =>
                sub.id === subId && !sub.isReadOnly
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

  // ==========================================================
  // SIMPAN
  // ==========================================================

  const simpanData = async () => {
    try {
      setIsSaving(true);

      const rowsToSave = rows.map((row) => {
        const hasSub = row.subRows.length > 0;

        const subRowsToSave = row.subRows.map((sub) => ({
          id: sub.id,
          kode: sub.kode,
          ro: sub.ro,
          paket: Number(sub.paket ?? 0),
          orang: Number(sub.orang ?? 0),
          realisasiPaket: Number(sub.realisasiPaket ?? 0),
          realisasiOrang: Number(sub.realisasiOrang ?? 0),
          isReadOnly: Boolean(sub.isReadOnly),
        }));

        const parentPaket = hasSub ? subRowsToSave.reduce((sum, sub) => sum + sub.paket, 0) : Number(row.paket ?? 0);

        const parentOrang = hasSub ? subRowsToSave.reduce((sum, sub) => sum + sub.orang, 0) : Number(row.orang ?? 0);

        const parentRealisasiPaket = hasSub ? subRowsToSave.reduce((sum, sub) => sum + sub.realisasiPaket, 0) : Number(row.realisasiPaket ?? 0);

        const parentRealisasiOrang = hasSub ? subRowsToSave.reduce((sum, sub) => sum + sub.realisasiOrang, 0) : Number(row.realisasiOrang ?? 0);

        return {
          id: row.id,
          kode: row.kode,
          ro: row.ro,
          paket: parentPaket,
          orang: parentOrang,
          realisasiPaket: parentRealisasiPaket,
          realisasiOrang: parentRealisasiOrang,
          isReadOnly: Boolean(row.isReadOnly),
          subRows: subRowsToSave,
        };
      });

      const result = await simpanBulkRincianOutput("NON-ABT", "uptp", rowsToSave);

      if (result.success) {
        setModal({
          isOpen: true,
          type: "success",
          title: "Berhasil",
          message: "Data UPTP berhasil disimpan ke Database!",
        });
      } else {
        const errorMessage = "error" in result && result.error ? result.error : "Terjadi kesalahan saat menyimpan data.";

        setModal({
          isOpen: true,
          type: "error",
          title: "Gagal",
          message: `Terjadi kesalahan saat menyimpan ke database: ${errorMessage}`,
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan tidak diketahui.";

      setModal({
        isOpen: true,
        type: "error",
        title: "Gagal",
        message: `Terjadi kesalahan saat menyimpan ke database: ${errorMessage}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================================
  // TOTAL
  // ==========================================================

  const totalPaket = rows.reduce((sum, row) => sum + (row.subRows.length > 0 ? row.subRows.reduce((acc, sub) => acc + Number(sub.paket ?? 0), 0) : Number(row.paket ?? 0)), 0);

  const totalOrang = rows.reduce((sum, row) => sum + (row.subRows.length > 0 ? row.subRows.reduce((acc, sub) => acc + Number(sub.orang ?? 0), 0) : Number(row.orang ?? 0)), 0);

  const totalRealisasiPaket = rows.reduce((sum, row) => sum + (row.subRows.length > 0 ? row.subRows.reduce((acc, sub) => acc + Number(sub.realisasiPaket ?? 0), 0) : Number(row.realisasiPaket ?? 0)), 0);

  const totalRealisasiOrang = rows.reduce((sum, row) => sum + (row.subRows.length > 0 ? row.subRows.reduce((acc, sub) => acc + Number(sub.realisasiOrang ?? 0), 0) : Number(row.realisasiOrang ?? 0)), 0);

  const totalPersenPaket = hitungPersen(totalRealisasiPaket, totalPaket);

  const totalPersenOrang = hitungPersen(totalRealisasiOrang, totalOrang);

  // ==========================================================
  // EXPORT EXCEL
  // ==========================================================

  const handleDownloadExcel = async () => {
    if (rows.length === 0) {
      setModal({
        isOpen: true,
        type: "error",
        title: "Gagal Mengunduh",
        message: "Tabel masih kosong.",
      });

      return;
    }

    const workbook = new ExcelJS.Workbook();

    const worksheet = workbook.addWorksheet("UPTP");

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
        header: "TARGET PAKET",
        key: "targetPaket",
        width: 18,
      },
      {
        header: "TARGET ORANG",
        key: "targetOrang",
        width: 18,
      },
      {
        header: "REALISASI PAKET",
        key: "realisasiPaket",
        width: 20,
      },
      {
        header: "REALISASI ORANG",
        key: "realisasiOrang",
        width: 20,
      },
      {
        header: "CAPAIAN PAKET (%)",
        key: "capaianPaket",
        width: 20,
      },
      {
        header: "CAPAIAN ORANG (%)",
        key: "capaianOrang",
        width: 20,
      },
    ];

    const applyBorder = (row: ExcelJS.Row) => {
      row.eachCell(
        {
          includeEmpty: true,
        },
        (cell) => {
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
        },
      );

      const roCell = row.getCell(3);

      roCell.alignment = {
        vertical: "middle",
        horizontal: "left",
      };
    };

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
    });

    rows.forEach((row, index) => {
      const hasSub = row.subRows.length > 0;

      const paket = hasSub ? row.subRows.reduce((acc, sub) => acc + Number(sub.paket ?? 0), 0) : Number(row.paket ?? 0);

      const orang = hasSub ? row.subRows.reduce((acc, sub) => acc + Number(sub.orang ?? 0), 0) : Number(row.orang ?? 0);

      const realisasiPaket = hasSub ? row.subRows.reduce((acc, sub) => acc + Number(sub.realisasiPaket ?? 0), 0) : Number(row.realisasiPaket ?? 0);

      const realisasiOrang = hasSub ? row.subRows.reduce((acc, sub) => acc + Number(sub.realisasiOrang ?? 0), 0) : Number(row.realisasiOrang ?? 0);

      const parentRow = worksheet.addRow({
        no: index + 1,
        kode: row.kode,
        ro: row.ro,
        targetPaket: paket,
        targetOrang: orang,
        realisasiPaket,
        realisasiOrang,
        capaianPaket: `${hitungPersen(realisasiPaket, paket)}%`,
        capaianOrang: `${hitungPersen(realisasiOrang, orang)}%`,
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

      const sortedSubRows = [...row.subRows].sort((a, b) =>
        a.kode.localeCompare(b.kode, undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      );

      sortedSubRows.forEach((sub) => {
        const subPaket = Number(sub.paket ?? 0);

        const subOrang = Number(sub.orang ?? 0);

        const subRealisasiPaket = Number(sub.realisasiPaket ?? 0);

        const subRealisasiOrang = Number(sub.realisasiOrang ?? 0);

        const subRow = worksheet.addRow({
          no: "",
          kode: sub.kode,
          ro: `    ↳ ${sub.ro}`,
          targetPaket: subPaket,
          targetOrang: subOrang,
          realisasiPaket: subRealisasiPaket,
          realisasiOrang: subRealisasiOrang,
          capaianPaket: `${hitungPersen(subRealisasiPaket, subPaket)}%`,
          capaianOrang: `${hitungPersen(subRealisasiOrang, subOrang)}%`,
        });

        applyBorder(subRow);
      });
    });

    const totalRow = worksheet.addRow({
      no: "",
      kode: "",
      ro: "JUMLAH TOTAL",
      targetPaket: totalPaket,
      targetOrang: totalOrang,
      realisasiPaket: totalRealisasiPaket,
      realisasiOrang: totalRealisasiOrang,
      capaianPaket: `${totalPersenPaket}%`,
      capaianOrang: `${totalPersenOrang}%`,
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

        cell.alignment = {
          vertical: "middle",
          horizontal: colNumber === 3 ? "right" : "center",
        };
      },
    );

    worksheet.mergeCells(`A${totalRow.number}:C${totalRow.number}`);

    const buffer = await workbook.xlsx.writeBuffer();

    saveAs(new Blob([buffer]), "Data_UPTP_NON-ABT.xlsx");
  };

  // ==========================================================
  // LOADING
  // ==========================================================

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

        <p className="text-sm font-semibold text-[#15406A]">Memuat data UPTP</p>

        <p className="mt-1 text-xs text-slate-400">Menghubungkan ke database...</p>
      </div>
    );

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="space-y-6 relative">
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
          <h1 className="text-2xl font-bold text-[#15406A]">UPTP (NON-ABT)</h1>

          <p className="text-gray-500 text-sm mt-1">Kelola data target dan realisasi output UPTP.</p>
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

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />

        <p className="text-amber-800 text-sm font-medium leading-relaxed">
          <span className="font-bold">Informasi:</span> Data TMT dikunci karena otomatis terintegrasi. Anda tetap bisa menambah Sub-RO manual ke dalamnya.
        </p>
      </div>

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

                <th colSpan={6} className="border border-[#1a4e82] px-4 py-2 text-center">
                  NON-ABT
                </th>

                <th rowSpan={3} className="border border-[#1a4e82] px-4 py-3 text-center w-32">
                  Aksi
                </th>
              </tr>

              <tr>
                <th colSpan={2} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#184878]">
                  Target
                </th>

                <th colSpan={2} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#184878]">
                  Realisasi
                </th>

                <th colSpan={2} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#184878]">
                  Capaian (%)
                </th>
              </tr>

              <tr>
                <th className="border border-[#1a4e82] px-4 py-2 text-center bg-[#1c548c] w-24">Paket</th>

                <th className="border border-[#1a4e82] px-4 py-2 text-center bg-[#1c548c] w-24">Orang</th>

                <th className="border border-[#1a4e82] px-4 py-2 text-center bg-[#1c548c] w-24">Paket</th>

                <th className="border border-[#1a4e82] px-4 py-2 text-center bg-[#1c548c] w-24">Orang</th>

                <th className="border border-[#1a4e82] px-4 py-2 text-center bg-[#1c548c] w-24">Paket</th>

                <th className="border border-[#1a4e82] px-4 py-2 text-center bg-[#1c548c] w-24">Orang</th>
              </tr>
            </thead>

            <tbody className="text-gray-700">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-gray-400 font-medium">
                    Tabel masih kosong. Klik Tambah RO untuk memulai.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => {
                  const hasSub = row.subRows.length > 0;

                  const displayPaket = hasSub ? row.subRows.reduce((acc, curr) => acc + Number(curr.paket ?? 0), 0) : Number(row.paket ?? 0);

                  const displayOrang = hasSub ? row.subRows.reduce((acc, curr) => acc + Number(curr.orang ?? 0), 0) : Number(row.orang ?? 0);

                  const displayRealisasiPaket = hasSub ? row.subRows.reduce((acc, curr) => acc + Number(curr.realisasiPaket ?? 0), 0) : Number(row.realisasiPaket ?? 0);

                  const displayRealisasiOrang = hasSub ? row.subRows.reduce((acc, curr) => acc + Number(curr.realisasiOrang ?? 0), 0) : Number(row.realisasiOrang ?? 0);

                  const displayPersenPaket = hitungPersen(displayRealisasiPaket, displayPaket);

                  const displayPersenOrang = hitungPersen(displayRealisasiOrang, displayOrang);

                  const isParentLocked = row.isReadOnly || hasSub;

                  const sortedSubRows = [...row.subRows].sort((a, b) =>
                    a.kode.localeCompare(b.kode, undefined, {
                      numeric: true,
                      sensitivity: "base",
                    }),
                  );

                  return (
                    <Fragment key={row.id}>
                      <tr className={`border-b border-gray-200 transition-colors ${row.isReadOnly ? "bg-gray-100/70" : hasSub ? "bg-gray-50/50 font-semibold" : "hover:bg-blue-50/30"}`}>
                        <td className="border-r border-gray-200 px-4 py-2 text-center">{index + 1}</td>

                        <td className="border-r border-gray-200 p-0">
                          <input
                            type="text"
                            value={row.kode}
                            onChange={(e) => updateBarisUtama(row.id, "kode", e.target.value)}
                            disabled={row.isReadOnly}
                            className={`w-full h-full px-4 py-3 bg-transparent outline-none ${row.isReadOnly ? "cursor-not-allowed text-gray-500" : "focus:bg-blue-50/50"}`}
                          />
                        </td>

                        <td className="border-r border-gray-200 p-0">
                          <input
                            type="text"
                            value={row.ro}
                            onChange={(e) => updateBarisUtama(row.id, "ro", e.target.value)}
                            disabled={row.isReadOnly}
                            className={`w-full h-full px-4 py-3 bg-transparent outline-none ${row.isReadOnly ? "cursor-not-allowed text-gray-700 font-bold" : "focus:bg-blue-50/50"}`}
                          />
                        </td>

                        <td className="border-r border-gray-200 p-0">
                          <input
                            type="number"
                            value={displayPaket === 0 ? "" : displayPaket}
                            onChange={(e) => updateBarisUtama(row.id, "paket", Number(e.target.value))}
                            disabled={isParentLocked}
                            placeholder="0"
                            className={`w-full h-full px-4 py-3 text-center outline-none ${isParentLocked ? "bg-gray-100/50 cursor-not-allowed" : "bg-transparent focus:bg-blue-50/50"}`}
                          />
                        </td>

                        <td className="border-r border-gray-200 p-0">
                          <input
                            type="number"
                            value={displayOrang === 0 ? "" : displayOrang}
                            onChange={(e) => updateBarisUtama(row.id, "orang", Number(e.target.value))}
                            disabled={isParentLocked}
                            placeholder="0"
                            className={`w-full h-full px-4 py-3 text-center outline-none ${isParentLocked ? "bg-gray-100/50 cursor-not-allowed" : "bg-transparent focus:bg-blue-50/50"}`}
                          />
                        </td>

                        <td className="border-r border-gray-200 p-0">
                          <input
                            type="number"
                            value={displayRealisasiPaket === 0 ? "" : displayRealisasiPaket}
                            onChange={(e) => updateBarisUtama(row.id, "realisasiPaket", Number(e.target.value))}
                            disabled={isParentLocked}
                            placeholder="0"
                            className={`w-full h-full px-4 py-3 text-center outline-none ${isParentLocked ? "bg-gray-100/50 cursor-not-allowed" : "bg-transparent focus:bg-blue-50/50"}`}
                          />
                        </td>

                        <td className="border-r border-gray-200 p-0">
                          <input
                            type="number"
                            value={displayRealisasiOrang === 0 ? "" : displayRealisasiOrang}
                            onChange={(e) => updateBarisUtama(row.id, "realisasiOrang", Number(e.target.value))}
                            disabled={isParentLocked}
                            placeholder="0"
                            className={`w-full h-full px-4 py-3 text-center outline-none ${isParentLocked ? "bg-gray-100/50 cursor-not-allowed" : "bg-transparent focus:bg-blue-50/50"}`}
                          />
                        </td>

                        <td className="border-r border-gray-200 px-4 py-3 text-center bg-gray-50 text-[#15406A] font-bold">{displayPersenPaket}%</td>

                        <td className="border-r border-gray-200 px-4 py-3 text-center bg-gray-50 text-[#15406A] font-bold">{displayPersenOrang}%</td>

                        <td className="px-4 py-2 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => tambahSubBaris(row.id)} title="Tambah Sub-RO" className="p-1.5 bg-blue-100 text-[#15406A] rounded hover:bg-blue-200 transition-colors">
                              <PlusCircle className="w-4 h-4" />
                            </button>

                            {row.isReadOnly ? (
                              <div className="p-1.5 text-gray-400" title="Induk Terkunci">
                                <Lock className="w-4 h-4" />
                              </div>
                            ) : (
                              <button onClick={() => hapusBarisUtama(row.id)} title="Hapus RO" className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {sortedSubRows.map((sub) => {
                        const subPersenPaket = hitungPersen(Number(sub.realisasiPaket ?? 0), Number(sub.paket ?? 0));

                        const subPersenOrang = hitungPersen(Number(sub.realisasiOrang ?? 0), Number(sub.orang ?? 0));

                        const isSubLocked = sub.isReadOnly;

                        return (
                          <tr key={sub.id} className={`border-b border-gray-100 ${isSubLocked ? "bg-gray-50/50" : "hover:bg-blue-50/30"}`}>
                            <td className="border-r border-gray-200 bg-gray-50"></td>

                            <td className="border-r border-gray-200 p-0 relative">
                              <div className="absolute left-2 top-3.5 text-gray-300 pointer-events-none">
                                <CornerDownRight className="w-4 h-4" />
                              </div>

                              <input
                                type="text"
                                value={sub.kode}
                                onChange={(e) => updateSubBaris(row.id, sub.id, "kode", e.target.value)}
                                disabled={isSubLocked}
                                className={`w-full h-full pl-8 pr-4 py-2.5 bg-transparent outline-none text-sm ${isSubLocked ? "cursor-not-allowed text-gray-500" : "focus:bg-white"}`}
                              />
                            </td>

                            <td className="border-r border-gray-200 p-0">
                              <input
                                type="text"
                                value={sub.ro}
                                onChange={(e) => updateSubBaris(row.id, sub.id, "ro", e.target.value)}
                                disabled={isSubLocked}
                                className={`w-full h-full px-4 py-2.5 bg-transparent outline-none text-sm ${isSubLocked ? "cursor-not-allowed text-gray-600 font-medium" : "focus:bg-white"}`}
                                placeholder="Sub-rincian..."
                              />
                            </td>

                            <td className="border-r border-gray-200 p-0">
                              <input
                                type="number"
                                value={sub.paket === 0 ? "" : sub.paket}
                                onChange={(e) => updateSubBaris(row.id, sub.id, "paket", Number(e.target.value))}
                                disabled={isSubLocked}
                                placeholder="0"
                                className={`w-full h-full px-4 py-2.5 text-center bg-transparent outline-none text-sm ${isSubLocked ? "cursor-not-allowed bg-gray-100/50" : "focus:bg-white"}`}
                              />
                            </td>

                            <td className="border-r border-gray-200 p-0">
                              <input
                                type="number"
                                value={sub.orang === 0 ? "" : sub.orang}
                                onChange={(e) => updateSubBaris(row.id, sub.id, "orang", Number(e.target.value))}
                                disabled={isSubLocked}
                                placeholder="0"
                                className={`w-full h-full px-4 py-2.5 text-center bg-transparent outline-none text-sm ${isSubLocked ? "cursor-not-allowed bg-gray-100/50" : "focus:bg-white"}`}
                              />
                            </td>

                            <td className="border-r border-gray-200 p-0">
                              <input
                                type="number"
                                value={sub.realisasiPaket === 0 ? "" : sub.realisasiPaket}
                                onChange={(e) => updateSubBaris(row.id, sub.id, "realisasiPaket", Number(e.target.value))}
                                disabled={isSubLocked}
                                placeholder="0"
                                className={`w-full h-full px-4 py-2.5 text-center bg-transparent outline-none text-sm ${isSubLocked ? "cursor-not-allowed bg-gray-100/50" : "focus:bg-white"}`}
                              />
                            </td>

                            <td className="border-r border-gray-200 p-0">
                              <input
                                type="number"
                                value={sub.realisasiOrang === 0 ? "" : sub.realisasiOrang}
                                onChange={(e) => updateSubBaris(row.id, sub.id, "realisasiOrang", Number(e.target.value))}
                                disabled={isSubLocked}
                                placeholder="0"
                                className={`w-full h-full px-4 py-2.5 text-center bg-transparent outline-none text-sm ${isSubLocked ? "bg-gray-100/50 cursor-not-allowed" : "focus:bg-white"}`}
                              />
                            </td>

                            <td className="border-r border-gray-200 px-4 py-2.5 text-center bg-gray-50/50 text-[#15406A] font-semibold text-sm">{subPersenPaket}%</td>

                            <td className="border-r border-gray-200 px-4 py-2.5 text-center bg-gray-50/50 text-[#15406A] font-semibold text-sm">{subPersenOrang}%</td>

                            <td className="px-4 py-2 text-center">
                              {isSubLocked ? (
                                <div className="flex justify-center" title="Terkunci">
                                  <Lock className="w-4 h-4 text-gray-400" />
                                </div>
                              ) : (
                                <button onClick={() => hapusSubBaris(row.id, sub.id)} title="Hapus Sub-RO" className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
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
              <tfoot className="bg-amber-400 text-white font-bold tracking-wide">
                <tr>
                  <td colSpan={3} className="border border-[#1a4e82] px-4 py-4 text-right uppercase">
                    Jumlah Total
                  </td>

                  <td className="border border-[#1a4e82] px-4 py-4 text-center bg-amber-500">{totalPaket}</td>

                  <td className="border border-[#1a4e82] px-4 py-4 text-center text-blue-100">{totalOrang}</td>

                  <td className="border border-[#1a4e82] px-4 py-4 text-center bg-amber-500 text-blue-100">{totalRealisasiPaket}</td>

                  <td className="border border-[#1a4e82] px-4 py-4 text-center text-blue-100">{totalRealisasiOrang}</td>

                  <td className="border border-[#1a4e82] px-4 py-4 text-center bg-amber-500 text-blue-100">{totalPersenPaket}%</td>

                  <td className="border border-[#1a4e82] px-4 py-4 text-center text-blue-100">{totalPersenOrang}%</td>

                  <td className="border border-[#1a4e82] bg-amber-400"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="bg-gray-50 p-4 border-t border-gray-200">
          <button onClick={tambahBarisUtama} className="flex items-center gap-2 text-sm font-bold text-[#15406A] hover:text-blue-800 transition-colors">
            <Plus className="w-5 h-5" />
            Tambah RO Baru
          </button>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <motion.button onClick={simpanData} disabled={isSaving} className="flex items-center gap-2 bg-[#15406A] hover:bg-[#0f2f4e] text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-all disabled:opacity-70">
          {isSaving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save className="w-5 h-5" />}

          {isSaving ? "Menyimpan..." : "Simpan Data"}
        </motion.button>
      </div>
    </div>
  );
}
