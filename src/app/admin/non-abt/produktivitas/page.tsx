"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Download, Trash2, Plus, PlusCircle, AlertCircle, RefreshCw, CornerDownRight, CheckCircle } from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

import { getRincianOutput, simpanBulkRincianOutput, RowData } from "@/app/actions/data";

// ============================================================
// TIPE DATA
// ============================================================

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

type ModalConfig = {
  isOpen: boolean;
  type: "confirm" | "success" | "error";
  title: string;
  message: string;
  onConfirm?: () => void;
};

// ============================================================
// HELPER
// ============================================================

const hitungPersen = (realisasi: number, target: number) => {
  if (target <= 0) return "0.00";

  return ((realisasi / target) * 100).toFixed(2);
};

const sortByKode = <T extends { kode: string }>(items: T[]) => {
  return [...items].sort((a, b) =>
    a.kode.localeCompare(b.kode, undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );
};

// ============================================================
// COMPONENT
// ============================================================

export default function ProduktivitasKompetensiPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [modal, setModal] = useState<ModalConfig>({
    isOpen: false,
    type: "confirm",
    title: "",
    message: "",
  });

  const closeModal = () => {
    setModal((prev) => ({
      ...prev,
      isOpen: false,
    }));
  };

  // ============================================================
  // LOAD DATA
  // ============================================================

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setIsLoading(true);

      try {
        const response = await getRincianOutput("NON-ABT", "produktivitas");

        if (cancelled) return;

        if (response.success && response.data) {
          const rawData = response.data as RowData[];

          const mappedData: Row[] = rawData.map((row) => ({
            id: row.id,
            kode: row.kode || "-",
            ro: row.ro || "-",
            orang: Number(row.orang ?? 0),
            realisasiOrang: Number(row.realisasiOrang ?? 0),
            isReadOnly: row.isReadOnly ?? false,

            subRows: sortByKode(
              (row.subRows ?? []).map((sub) => ({
                id: sub.id,
                kode: sub.kode || "-",
                ro: sub.ro || "-",
                orang: Number(sub.orang ?? 0),
                realisasiOrang: Number(sub.realisasiOrang ?? 0),
                isReadOnly: sub.isReadOnly ?? false,
              })),
            ),
          }));

          setRows(sortByKode(mappedData));
        } else {
          setModal({
            isOpen: true,
            type: "error",
            title: "Gagal Memuat",
            message: "Gagal mengambil data Produktivitas dari database.",
          });
        }
      } catch (error) {
        console.error("Gagal memuat data Produktivitas:", error);

        if (!cancelled) {
          setModal({
            isOpen: true,
            type: "error",
            title: "Gagal Memuat",
            message: "Terjadi kesalahan saat mengambil data dari database.",
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, []);

  // ============================================================
  // TAMBAH DATA
  // ============================================================

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
        isReadOnly: false,
      },
    ]);
  };

  const tambahSubBaris = (parentId: string) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== parentId) return row;

        return {
          ...row,

          // Parent menjadi agregat sub-RO
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
              isReadOnly: false,
            },
          ],
        };
      }),
    );
  };

  // ============================================================
  // HAPUS DATA
  // ============================================================

  const hapusBarisUtama = (id: string) => {
    setModal({
      isOpen: true,
      type: "confirm",
      title: "Hapus RO?",
      message: "Lanjutkan menghapus rincian ini beserta seluruh sub-RO di dalamnya?",
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
      message: "Data sub-RO ini akan dihapus dari tabel.",
      onConfirm: () => {
        setRows((prev) =>
          prev.map((row) => {
            if (row.id !== parentId) return row;

            return {
              ...row,
              subRows: row.subRows.filter((sub) => sub.id !== subId),
            };
          }),
        );

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
      message: "Semua data akan dihapus dari layar. Tekan Simpan Data untuk memperbarui database.",
      onConfirm: () => {
        setRows([]);
        closeModal();
      },
    });
  };

  // ============================================================
  // UPDATE DATA
  // ============================================================

  const updateBarisUtama = (id: string, field: "kode" | "ro" | "orang" | "realisasiOrang", value: string | number) => {
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

  const updateSubBaris = (parentId: string, subId: string, field: "kode" | "ro" | "orang" | "realisasiOrang", value: string | number) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== parentId) return row;

        return {
          ...row,
          subRows: row.subRows.map((sub) =>
            sub.id === subId
              ? {
                  ...sub,
                  [field]: value,
                }
              : sub,
          ),
        };
      }),
    );
  };

  // ============================================================
  // DISPLAY METRICS
  // ============================================================

  const getDisplayMetrics = (row: Row) => {
    const hasSub = row.subRows.length > 0;

    if (!hasSub) {
      return {
        target: Number(row.orang ?? 0),
        realisasi: Number(row.realisasiOrang ?? 0),
      };
    }

    return {
      target: row.subRows.reduce((sum, sub) => sum + Number(sub.orang ?? 0), 0),
      realisasi: row.subRows.reduce((sum, sub) => sum + Number(sub.realisasiOrang ?? 0), 0),
    };
  };

  // ============================================================
  // TOTAL
  // ============================================================

  const totalOrang = rows.reduce((sum, row) => {
    const metrics = getDisplayMetrics(row);
    return sum + metrics.target;
  }, 0);

  const totalRealisasi = rows.reduce((sum, row) => {
    const metrics = getDisplayMetrics(row);
    return sum + metrics.realisasi;
  }, 0);

  const totalPersen = hitungPersen(totalRealisasi, totalOrang);

  // ============================================================
  // SIMPAN DATA
  // ============================================================

  const simpanData = async () => {
    if (isSaving) return;

    setIsSaving(true);

    try {
      const rowsToSave: RowData[] = rows.map((row) => {
        const hasSub = row.subRows.length > 0;

        const sortedSubRows = sortByKode(row.subRows).map((sub) => ({
          id: sub.id,
          kode: sub.kode,
          ro: sub.ro,
          orang: Number(sub.orang ?? 0),
          realisasiOrang: Number(sub.realisasiOrang ?? 0),
          isReadOnly: sub.isReadOnly,
        }));

        const targetOrang = hasSub ? sortedSubRows.reduce((sum, sub) => sum + sub.orang, 0) : Number(row.orang ?? 0);

        const realisasiOrang = hasSub ? sortedSubRows.reduce((sum, sub) => sum + sub.realisasiOrang, 0) : Number(row.realisasiOrang ?? 0);

        return {
          id: row.id,
          kode: row.kode,
          ro: row.ro,

          // Tidak digunakan oleh Produktivitas,
          // tetapi dibuat 0 agar kompatibel dengan RowData.
          paket: 0,
          realisasiPaket: 0,

          orang: targetOrang,
          realisasiOrang,

          isReadOnly: row.isReadOnly,

          subRows: sortedSubRows.map((sub) => ({
            ...sub,
            paket: 0,
            realisasiPaket: 0,
          })),
        };
      });

      const result = await simpanBulkRincianOutput("NON-ABT", "produktivitas", rowsToSave);

      if (result.success) {
        setModal({
          isOpen: true,
          type: "success",
          title: "Berhasil",
          message: "Data Produktivitas berhasil disimpan ke database.",
        });
      } else {
        setModal({
          isOpen: true,
          type: "error",
          title: "Gagal",
          message: result.error || "Terjadi kesalahan saat menyimpan data ke database.",
        });
      }
    } catch (error) {
      console.error("Gagal menyimpan Produktivitas:", error);

      setModal({
        isOpen: true,
        type: "error",
        title: "Gagal",
        message: "Terjadi kesalahan saat menyimpan data ke database.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================================
  // EXPORT EXCEL
  // ============================================================

  const handleDownloadExcel = async () => {
    if (rows.length === 0) {
      setModal({
        isOpen: true,
        type: "error",
        title: "Gagal",
        message: "Tabel masih kosong.",
      });

      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Produktivitas");

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
        header: "REALISASI",
        key: "realisasi",
        width: 18,
      },
      {
        header: "PERSEN (%)",
        key: "persen",
        width: 15,
      },
    ];

    // ==========================================================
    // BORDER
    // ==========================================================

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

    // ==========================================================
    // HEADER
    // ==========================================================

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

    // ==========================================================
    // DATA
    // ==========================================================

    const sortedRows = sortByKode(rows);

    sortedRows.forEach((row, index) => {
      const metrics = getDisplayMetrics(row);
      const persen = hitungPersen(metrics.realisasi, metrics.target);

      const hasSub = row.subRows.length > 0;

      const parentRow = worksheet.addRow({
        no: index + 1,
        kode: row.kode,
        ro: row.ro,
        orang: metrics.target,
        realisasi: metrics.realisasi,
        persen: `${persen}%`,
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

      const sortedSubRows = sortByKode(row.subRows);

      sortedSubRows.forEach((sub) => {
        const subPersen = hitungPersen(sub.realisasiOrang, sub.orang);

        const subRow = worksheet.addRow({
          no: "",
          kode: sub.kode,
          ro: `    ↳ ${sub.ro}`,
          orang: sub.orang,
          realisasi: sub.realisasiOrang,
          persen: `${subPersen}%`,
        });

        applyBorder(subRow);
      });
    });

    // ==========================================================
    // TOTAL
    // ==========================================================

    const totalRow = worksheet.addRow({
      no: "",
      kode: "",
      ro: "JUMLAH TOTAL",
      orang: totalOrang,
      realisasi: totalRealisasi,
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

    const buffer = await workbook.xlsx.writeBuffer();

    saveAs(new Blob([buffer]), "Data_Produktivitas_Kompetensi.xlsx");
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <div className="mb-6 flex h-12 items-end gap-1.5">
          <div className="w-2 rounded-full bg-[#15406A] animate-[loadingBar_1s_ease-in-out_infinite]" />
          <div className="w-2 rounded-full bg-[#15406A]/80 animate-[loadingBar_1s_ease-in-out_0.15s_infinite]" />
          <div className="w-2 rounded-full bg-[#15406A]/60 animate-[loadingBar_1s_ease-in-out_0.3s_infinite]" />
          <div className="w-2 rounded-full bg-[#15406A]/40 animate-[loadingBar_1s_ease-in-out_0.45s_infinite]" />
          <div className="w-2 rounded-full bg-[#15406A]/30 animate-[loadingBar_1s_ease-in-out_0.6s_infinite]" />
        </div>

        <p className="text-sm font-semibold text-[#15406A]">Memuat data Produktivitas</p>

        <p className="mt-1 text-xs text-slate-400">Menghubungkan ke database...</p>
      </div>
    );
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="relative space-y-6">
      {/* ========================================================
          MODAL
      ======================================================== */}

      <AnimatePresence>
        {modal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
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
              className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
            >
              <div className={`p-6 ${modal.type === "error" ? "bg-red-50" : modal.type === "success" ? "bg-emerald-50" : "bg-blue-50"}`}>
                <div className="flex items-center gap-4">
                  {modal.type === "confirm" && <AlertCircle className="h-8 w-8 text-blue-600" />}

                  {modal.type === "error" && <AlertCircle className="h-8 w-8 text-red-600" />}

                  {modal.type === "success" && <CheckCircle className="h-8 w-8 text-emerald-600" />}

                  <h3 className={`text-xl font-bold ${modal.type === "error" ? "text-red-900" : modal.type === "success" ? "text-emerald-900" : "text-blue-900"}`}>{modal.title}</h3>
                </div>

                <p className="mt-3 leading-relaxed text-gray-700">{modal.message}</p>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
                {modal.type === "confirm" ? (
                  <>
                    <button onClick={closeModal} className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                      Batal
                    </button>

                    <button onClick={modal.onConfirm} className="rounded-lg bg-[#15406A] px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-900">
                      Ya, Lanjutkan
                    </button>
                  </>
                ) : (
                  <button onClick={closeModal} className={`rounded-lg px-5 py-2.5 text-sm font-medium text-white ${modal.type === "error" ? "bg-red-600" : "bg-emerald-600"}`}>
                    Tutup
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================
          HEADER
      ======================================================== */}

      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#15406A]">Produktivitas (NON-ABT)</h1>

          <p className="mt-1 text-sm text-gray-500">Kelola data target dan realisasi output Produktivitas</p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handleDownloadExcel} className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 font-medium text-emerald-600 transition-colors hover:bg-emerald-100">
            <Download className="h-4 w-4" />
            Excel
          </button>

          <button onClick={bersihkanTabel} className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 font-medium text-red-600 transition-colors hover:bg-red-100">
            <RefreshCw className="h-4 w-4" />
            Bersihkan
          </button>
        </div>
      </div>

      {/* ========================================================
          WARNING
      ======================================================== */}

      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

        <p className="text-sm font-medium leading-relaxed text-amber-800">
          <span className="font-bold">Peringatan:</span> Pastikan Anda selalu menekan tombol <b className="text-[#15406A]">Simpan Data</b> di bagian bawah tabel setelah selesai menambah atau mengedit rincian.
        </p>
      </div>

      {/* ========================================================
          TABLE
      ======================================================== */}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-[#15406A] text-white">
              <tr>
                <th rowSpan={2} className="w-16 border border-[#1a4e82] px-4 py-3 text-center">
                  NO.
                </th>

                <th rowSpan={2} className="w-32 border border-[#1a4e82] px-4 py-3">
                  Kode
                </th>

                <th rowSpan={2} className="min-w-[250px] border border-[#1a4e82] px-4 py-3">
                  Rincian Output (RO)
                </th>

                <th colSpan={3} className="border border-[#1a4e82] px-4 py-2 text-center">
                  NON-ABT
                </th>

                <th rowSpan={2} className="w-32 border border-[#1a4e82] px-4 py-3 text-center">
                  Aksi
                </th>
              </tr>

              <tr>
                <th className="border border-[#1a4e82] px-4 py-2 text-center bg-[#184878] w-32">Target Orang</th>

                <th className="border border-[#1a4e82] px-4 py-3 text-center bg-[#184878] w-32">Realisasi Orang</th>

                <th className="border border-[#1a4e82] px-4 py-3 text-center bg-[#184878] w-28">Capaian (%)</th>
              </tr>
            </thead>

            <tbody className="text-gray-700">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center font-medium text-gray-400">
                    Tabel masih kosong. Klik Tambah RO untuk memulai.
                  </td>
                </tr>
              ) : (
                sortByKode(rows).map((row, index) => {
                  const hasSub = row.subRows.length > 0;

                  const display = getDisplayMetrics(row);

                  const displayPersen = hitungPersen(display.realisasi, display.target);

                  const sortedSubRows = sortByKode(row.subRows);

                  return (
                    <React.Fragment key={row.id}>
                      {/* ==================================================
                          PARENT ROW
                      ================================================== */}

                      <tr className={`border-b border-gray-200 transition-colors ${hasSub ? "bg-gray-50/50 font-semibold" : "hover:bg-blue-50/30"}`}>
                        <td className="border-r border-gray-200 px-4 py-2 text-center">{index + 1}</td>

                        <td className="border-r border-gray-200 p-0">
                          <input
                            type="text"
                            value={row.kode}
                            onChange={(e) => updateBarisUtama(row.id, "kode", e.target.value)}
                            disabled={row.isReadOnly}
                            className={`h-full w-full px-4 py-3 outline-none ${row.isReadOnly ? "cursor-not-allowed bg-gray-100" : "bg-transparent focus:bg-blue-50/50"}`}
                          />
                        </td>

                        <td className="border-r border-gray-200 p-0">
                          <input
                            type="text"
                            value={row.ro}
                            onChange={(e) => updateBarisUtama(row.id, "ro", e.target.value)}
                            disabled={row.isReadOnly}
                            className={`h-full w-full px-4 py-3 outline-none ${row.isReadOnly ? "cursor-not-allowed bg-gray-100" : "bg-transparent focus:bg-blue-50/50"}`}
                          />
                        </td>

                        <td className="border-r border-gray-200 p-0">
                          <input
                            type="number"
                            value={display.target === 0 ? "" : display.target}
                            onChange={(e) => updateBarisUtama(row.id, "orang", Number(e.target.value))}
                            disabled={hasSub || row.isReadOnly}
                            placeholder="0"
                            className={`h-full w-full px-4 py-3 text-center outline-none ${hasSub || row.isReadOnly ? "cursor-not-allowed bg-gray-100" : "bg-transparent focus:bg-blue-50/50"}`}
                          />
                        </td>

                        <td className="border-r border-gray-200 p-0">
                          <input
                            type="number"
                            value={display.realisasi === 0 ? "" : display.realisasi}
                            onChange={(e) => updateBarisUtama(row.id, "realisasiOrang", Number(e.target.value))}
                            disabled={hasSub || row.isReadOnly}
                            placeholder="0"
                            className={`h-full w-full px-4 py-3 text-center outline-none ${hasSub || row.isReadOnly ? "cursor-not-allowed bg-gray-100" : "bg-transparent focus:bg-blue-50/50"}`}
                          />
                        </td>

                        <td className="border-r border-gray-200 bg-gray-50 px-4 py-3 text-center font-bold text-[#15406A]">{displayPersen}%</td>

                        <td className="px-4 py-2 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {!row.isReadOnly && (
                              <button onClick={() => tambahSubBaris(row.id)} title="Tambah Sub-RO" className="rounded bg-blue-100 p-1.5 text-[#15406A] hover:bg-blue-200">
                                <PlusCircle className="h-4 w-4" />
                              </button>
                            )}

                            {!row.isReadOnly && (
                              <button onClick={() => hapusBarisUtama(row.id)} title="Hapus RO" className="rounded bg-red-100 p-1.5 text-red-600 hover:bg-red-200">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* ==================================================
                          SUB ROW
                      ================================================== */}

                      {sortedSubRows.map((sub) => {
                        const subPersen = hitungPersen(sub.realisasiOrang, sub.orang);

                        return (
                          <tr key={sub.id} className="border-b border-gray-100 hover:bg-blue-50/30">
                            <td className="border-r border-gray-200 bg-gray-50" />

                            <td className="relative border-r border-gray-200 p-0">
                              <div className="pointer-events-none absolute left-2 top-3.5 text-gray-300">
                                <CornerDownRight className="h-4 w-4" />
                              </div>

                              <input
                                type="text"
                                value={sub.kode}
                                onChange={(e) => updateSubBaris(row.id, sub.id, "kode", e.target.value)}
                                disabled={sub.isReadOnly}
                                className={`h-full w-full py-2.5 pl-8 pr-4 text-sm outline-none ${sub.isReadOnly ? "cursor-not-allowed bg-gray-100" : "bg-transparent focus:bg-white"}`}
                              />
                            </td>

                            <td className="border-r border-gray-200 p-0">
                              <input
                                type="text"
                                value={sub.ro}
                                onChange={(e) => updateSubBaris(row.id, sub.id, "ro", e.target.value)}
                                disabled={sub.isReadOnly}
                                placeholder="Sub-rincian..."
                                className={`h-full w-full px-4 py-2.5 text-sm outline-none ${sub.isReadOnly ? "cursor-not-allowed bg-gray-100" : "bg-transparent focus:bg-white"}`}
                              />
                            </td>

                            <td className="border-r border-gray-200 p-0">
                              <input
                                type="number"
                                value={sub.orang === 0 ? "" : sub.orang}
                                onChange={(e) => updateSubBaris(row.id, sub.id, "orang", Number(e.target.value))}
                                disabled={sub.isReadOnly}
                                placeholder="0"
                                className={`h-full w-full px-4 py-2.5 text-center text-sm outline-none ${sub.isReadOnly ? "cursor-not-allowed bg-gray-100" : "bg-transparent focus:bg-white"}`}
                              />
                            </td>

                            <td className="border-r border-gray-200 p-0">
                              <input
                                type="number"
                                value={sub.realisasiOrang === 0 ? "" : sub.realisasiOrang}
                                onChange={(e) => updateSubBaris(row.id, sub.id, "realisasiOrang", Number(e.target.value))}
                                disabled={sub.isReadOnly}
                                placeholder="0"
                                className={`h-full w-full px-4 py-2.5 text-center text-sm outline-none ${sub.isReadOnly ? "cursor-not-allowed bg-gray-100" : "bg-transparent focus:bg-white"}`}
                              />
                            </td>

                            <td className="border-r border-gray-200 bg-gray-50/50 px-4 py-2.5 text-center text-sm font-semibold text-[#15406A]">{subPersen}%</td>

                            <td className="px-4 py-2 text-center">
                              {!sub.isReadOnly && (
                                <button onClick={() => hapusSubBaris(row.id, sub.id)} title="Hapus Sub-RO" className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>

            {/* ======================================================
                FOOTER
            ======================================================= */}

            {rows.length > 0 && (
              <tfoot className="bg-amber-400 font-bold tracking-wide text-white">
                <tr>
                  <td colSpan={3} className="border border-[#1a4e82] px-4 py-4 text-right uppercase">
                    Jumlah Total
                  </td>

                  <td className="border border-[#1a4e82] bg-amber-500 px-4 py-4 text-center">{totalOrang}</td>

                  <td className="border border-[#1a4e82] bg-amber-500 px-4 py-4 text-center text-emerald-300">{totalRealisasi}</td>

                  <td className="border border-[#1a4e82] px-4 py-4 text-center text-blue-200">{totalPersen}%</td>

                  <td className="border border-[#1a4e82] bg-amber-400" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* ========================================================
            ADD RO
        ======================================================== */}

        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <button onClick={tambahBarisUtama} className="flex items-center gap-2 text-sm font-bold text-[#15406A] transition-colors hover:text-blue-800">
            <Plus className="h-5 w-5" />
            Tambah RO Baru
          </button>
        </div>
      </div>

      {/* ========================================================
          SAVE BUTTON
      ======================================================== */}

      <div className="flex justify-end pt-4">
        <motion.button
          onClick={simpanData}
          disabled={isSaving}
          whileTap={{
            scale: 0.98,
          }}
          className="flex items-center gap-2 rounded-xl bg-[#15406A] px-8 py-3 font-bold text-white transition-all hover:bg-[#0f2f4e] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSaving ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Save className="h-5 w-5" />}

          {isSaving ? "Menyimpan..." : "Simpan Data"}
        </motion.button>
      </div>
    </div>
  );
}
