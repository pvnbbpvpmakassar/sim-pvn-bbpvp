"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Save,
  Download,
  Trash2,
  Plus,
  AlertCircle,
  RefreshCw,
  CheckCircle,
} from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

import {
  getRincianOutput,
  simpanBulkRincianOutput,
} from "@/app/actions/data";

// ============================================================
// TYPES
// ============================================================

type NonBatchRow = {
  id: string;
  realisasiPaket: number;
  realisasiOrang: number;
};

type ModalConfig = {
  isOpen: boolean;
  type: "confirm" | "success" | "error";
  title: string;
  message: string;
  onConfirm?: () => void;
};

// ============================================================
// HELPERS
// ============================================================

const formatInputAngka = (value: number) => {
  return Number(value || 0).toLocaleString("id-ID");
};

const parseAngka = (value: string) => {
  const cleaned = value.replace(/[^\d]/g, "");
  return Number(cleaned || 0);
};

// ============================================================
// NORMALIZER
// ============================================================

function normalizeNonBatchRow(row: {
  id?: string | number | null;
  realisasiPaket?: number | null;
  realisasiOrang?: number | null;
}): NonBatchRow {
  return {
    id: String(row.id ?? crypto.randomUUID()),
    realisasiPaket: Number(row.realisasiPaket ?? 0),
    realisasiOrang: Number(row.realisasiOrang ?? 0),
  };
}

// ============================================================
// FETCH DATA
// ============================================================

async function fetchNonBatchData(): Promise<NonBatchRow[]> {
  const result = await getRincianOutput("NON-ABT", "non-batch");

  if (!result.success) {
    const errorMessage =
      "error" in result && result.error
        ? result.error
        : "Gagal mengambil data Non Batch.";

    throw new Error(errorMessage);
  }

  if (!Array.isArray(result.data)) {
    return [];
  }

  return result.data.map((row) =>
    normalizeNonBatchRow({
      id: row.id,
      realisasiPaket: row.realisasiPaket,
      realisasiOrang: row.realisasiOrang,
    }),
  );
}

// ============================================================
// PAGE
// ============================================================

export default function NonBatchPage() {
  const [rows, setRows] = useState<NonBatchRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [modal, setModal] = useState<ModalConfig>({
    isOpen: false,
    type: "confirm",
    title: "",
    message: "",
  });

  // ==========================================================
  // MODAL
  // ==========================================================

  const closeModal = () => {
    setModal((prev) => ({
      ...prev,
      isOpen: false,
    }));
  };

  // ==========================================================
  // LOAD DATA
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    const initialLoad = async () => {
      try {
        const data = await fetchNonBatchData();

        if (cancelled) return;

        setRows(data);
      } catch (error: unknown) {
        if (cancelled) return;

        const errorMessage =
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan tidak diketahui.";

        setRows([]);

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
  // TAMBAH BARIS
  // ==========================================================

  const tambahBaris = () => {
    setRows((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        realisasiPaket: 0,
        realisasiOrang: 0,
      },
    ]);
  };

  // ==========================================================
  // UPDATE ANGKA
  // ==========================================================

  const handleAngkaChange = (
    value: string,
    id: string,
    field: "realisasiPaket" | "realisasiOrang",
  ) => {
    const angka = parseAngka(value);

    setRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]: angka,
            }
          : row,
      ),
    );
  };

  // ==========================================================
  // HAPUS BARIS
  // ==========================================================

  const hapusBaris = (id: string) => {
    setModal({
      isOpen: true,
      type: "confirm",
      title: "Hapus Baris?",
      message: "Data Non Batch pada baris ini akan dihapus.",
      onConfirm: () => {
        setRows((prev) => prev.filter((row) => row.id !== id));

        closeModal();
      },
    });
  };

  // ==========================================================
  // BERSIHKAN
  // ==========================================================

  const bersihkanTabel = () => {
    if (rows.length === 0) return;

    setModal({
      isOpen: true,
      type: "confirm",
      title: "Bersihkan Tabel?",
      message: "Hapus semua data Non Batch dari tabel?",
      onConfirm: () => {
        setRows([]);

        closeModal();
      },
    });
  };

  // ==========================================================
  // TOTAL
  // ==========================================================

  const grandTotalPaket = rows.reduce(
    (sum, row) => sum + Number(row.realisasiPaket || 0),
    0,
  );

  const grandTotalOrang = rows.reduce(
    (sum, row) => sum + Number(row.realisasiOrang || 0),
    0,
  );

  // ==========================================================
  // SIMPAN
  // ==========================================================

  const simpanData = async () => {
    try {
      setIsSaving(true);

      const rowsToSave = rows.map((row) => ({
        id: row.id,
        kode: "",
        ro: "",
        paket: 0,
        orang: 0,
        realisasiPaket: Number(row.realisasiPaket || 0),
        realisasiOrang: Number(row.realisasiOrang || 0),
        isReadOnly: false,
        subRows: [],
      }));

      const result = await simpanBulkRincianOutput(
        "NON-ABT",
        "non-batch",
        rowsToSave,
      );

      if (result.success) {
        setModal({
          isOpen: true,
          type: "success",
          title: "Berhasil",
          message: "Data Non Batch berhasil disimpan ke Database!",
        });
      } else {
        const errorMessage =
          "error" in result && result.error
            ? result.error
            : "Terjadi kesalahan saat menyimpan data.";

        setModal({
          isOpen: true,
          type: "error",
          title: "Gagal",
          message: errorMessage,
        });
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan tidak diketahui.";

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

    const worksheet = workbook.addWorksheet("Non Batch");

    worksheet.columns = [
      {
        header: "NO.",
        key: "no",
        width: 8,
      },
      {
        header: "REALISASI PAKET",
        key: "realisasiPaket",
        width: 25,
      },
      {
        header: "REALISASI ORANG",
        key: "realisasiOrang",
        width: 25,
      },
    ];

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

    rows.forEach((row, index) => {
      const excelRow = worksheet.addRow({
        no: index + 1,
        realisasiPaket: Number(row.realisasiPaket || 0),
        realisasiOrang: Number(row.realisasiOrang || 0),
      });

      excelRow.eachCell((cell) => {
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
    });

    const totalRow = worksheet.addRow({
      no: "TOTAL",
      realisasiPaket: grandTotalPaket,
      realisasiOrang: grandTotalOrang,
    });

    totalRow.eachCell((cell) => {
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
        horizontal: "center",
      };
    });

    const buffer = await workbook.xlsx.writeBuffer();

    saveAs(
      new Blob([buffer]),
      "Data_Non-Batch_NON-ABT.xlsx",
    );
  };

  // ==========================================================
  // LOADING
  // ==========================================================

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

        <p className="text-sm font-semibold text-[#15406A]">
          Memuat data Non Batch
        </p>

        <p className="mt-1 text-xs text-slate-400">
          Menghubungkan ke database...
        </p>
      </div>
    );
  }

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
              <div
                className={`p-6 ${
                  modal.type === "error"
                    ? "bg-red-50"
                    : modal.type === "success"
                      ? "bg-emerald-50"
                      : "bg-blue-50"
                }`}
              >
                <div className="flex items-center gap-4">
                  {modal.type === "confirm" ? (
                    <AlertCircle className="w-8 h-8 text-blue-600" />
                  ) : modal.type === "error" ? (
                    <AlertCircle className="w-8 h-8 text-red-600" />
                  ) : (
                    <CheckCircle className="w-8 h-8 text-emerald-600" />
                  )}

                  <h3
                    className={`text-xl font-bold ${
                      modal.type === "error"
                        ? "text-red-900"
                        : modal.type === "success"
                          ? "text-emerald-900"
                          : "text-blue-900"
                    }`}
                  >
                    {modal.title}
                  </h3>
                </div>

                <p className="mt-3 text-gray-700 leading-relaxed">
                  {modal.message}
                </p>
              </div>

              <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
                {modal.type === "confirm" ? (
                  <>
                    <button
                      onClick={closeModal}
                      className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                    >
                      Batal
                    </button>

                    <button
                      onClick={modal.onConfirm}
                      className="px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-[#15406A] hover:bg-blue-900"
                    >
                      Ya, Lanjutkan
                    </button>
                  </>
                ) : (
                  <button
                    onClick={closeModal}
                    className={`px-5 py-2.5 rounded-lg text-sm font-medium text-white ${
                      modal.type === "error"
                        ? "bg-red-600"
                        : "bg-emerald-600"
                    }`}
                  >
                    Tutup
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* HEADER */}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#15406A]">
            Non Batch (NON-ABT)
          </h1>

          <p className="text-gray-500 text-sm mt-1">
            Kelola data realisasi Non Batch.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadExcel}
            className="flex items-center gap-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-4 py-2 rounded-lg font-medium transition-colors border border-emerald-200"
          >
            <Download className="w-4 h-4" />
            Excel
          </button>

          <button
            onClick={bersihkanTabel}
            className="flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg font-medium transition-colors border border-red-200"
          >
            <RefreshCw className="w-4 h-4" />
            Bersihkan
          </button>
        </div>
      </div>

      {/* INFORMATION */}

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />

        <p className="text-amber-800 text-sm font-medium leading-relaxed">
          <span className="font-bold">Informasi:</span> Masukkan
          realisasi paket dan realisasi orang untuk setiap data Non Batch.
        </p>
      </div>

      {/* TABLE */}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-[#15406A] text-white">
              <tr>
                <th className="border border-[#1a4e82] px-4 py-3 text-center w-16">
                  NO.
                </th>

                <th className="border border-[#1a4e82] px-4 py-3 text-center w-1/3">
                  Realisasi Paket
                </th>

                <th className="border border-[#1a4e82] px-4 py-3 text-center w-1/3">
                  Realisasi Orang
                </th>

                <th className="border border-[#1a4e82] px-4 py-3 text-center w-24">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody className="text-gray-700">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-12 text-center text-gray-400 font-medium"
                  >
                    Tabel masih kosong. Klik Tambah Baris untuk memulai.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr
                    key={row.id}
                    className="border-b border-gray-200 hover:bg-blue-50/30 transition-colors"
                  >
                    <td className="border-r border-gray-200 px-4 py-2 text-center font-bold text-gray-500">
                      {index + 1}
                    </td>

                    <td className="border-r border-gray-200 p-0">
                      <input
                        type="text"
                        value={formatInputAngka(row.realisasiPaket)}
                        onChange={(e) =>
                          handleAngkaChange(
                            e.target.value,
                            row.id,
                            "realisasiPaket",
                          )
                        }
                        placeholder="0"
                        className="w-full h-full px-4 py-3 text-center font-semibold bg-transparent outline-none focus:bg-white"
                      />
                    </td>

                    <td className="border-r border-gray-200 p-0">
                      <input
                        type="text"
                        value={formatInputAngka(row.realisasiOrang)}
                        onChange={(e) =>
                          handleAngkaChange(
                            e.target.value,
                            row.id,
                            "realisasiOrang",
                          )
                        }
                        placeholder="0"
                        className="w-full h-full px-4 py-3 text-center font-semibold bg-transparent outline-none focus:bg-white"
                      />
                    </td>

                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => hapusBaris(row.id)}
                        title="Hapus Baris"
                        className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {rows.length > 0 && (
              <tfoot className="bg-amber-400 text-white font-bold tracking-wide">
                <tr>
                  <td className="border border-[#1a4e82] px-4 py-4 text-right uppercase">
                    Total
                  </td>

                  <td className="border border-[#1a4e82] px-4 py-4 text-center bg-amber-500 text-[15px]">
                    {formatInputAngka(grandTotalPaket)}
                  </td>

                  <td className="border border-[#1a4e82] px-4 py-4 text-center bg-amber-500 text-emerald-100 text-[15px]">
                    {formatInputAngka(grandTotalOrang)}
                  </td>

                  <td className="border border-[#1a4e82] px-4 py-4 text-center text-blue-900 text-base"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="bg-gray-50 p-4 border-t border-gray-200">
          <button
            onClick={tambahBaris}
            className="flex items-center gap-2 text-sm font-bold text-[#15406A] hover:text-blue-800 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Tambah Baris
          </button>
        </div>
      </div>

      {/* SAVE */}

      <div className="flex justify-end pt-4">
        <motion.button
          onClick={simpanData}
          disabled={isSaving}
          className="flex items-center gap-2 bg-[#15406A] hover:bg-[#0f2f4e] text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-all disabled:opacity-70"
        >
          {isSaving ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}

          {isSaving ? "Menyimpan..." : "Simpan Data"}
        </motion.button>
      </div>
    </div>
  );
}