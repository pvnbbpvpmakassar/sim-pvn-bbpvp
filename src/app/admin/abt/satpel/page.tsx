"use client";

import React, { useState, useEffect, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Download, Trash2, Plus, PlusCircle, AlertCircle, RefreshCw, CornerDownRight, MapPin, CheckCircle } from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

import { getSatpelData, simpanSatpelData } from "@/app/actions/data";

type DataValue = {
  paket: number;
  orang?: number;
  realisasiOrang: number;
  realisasiPaket: number;
};

type SubRow = {
  id: string;
  kode: string;
  ro: string;
  data: Record<string, DataValue>;
};

type Row = {
  id: string;
  kode: string;
  ro: string;
  data: Record<string, DataValue>;
  subRows: SubRow[];
};

type LocationCol = {
  id: string;
  name: string;
};

type ModalConfig = {
  isOpen: boolean;
  type: "confirm" | "success" | "error";
  title: string;
  message: string;
  onConfirm?: () => void;
};

export default function SatpelPage() {
  const [locations, setLocations] = useState<LocationCol[]>([{ id: crypto.randomUUID(), name: "Satpel 1" }]);

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

  // =========================================================
  // HELPER
  // =========================================================

  const hitungOrang = (paket: number) => paket * 16;

  const hitungPersen = (realisasi: number, target: number) => (target > 0 ? ((realisasi / target) * 100).toFixed(2) : "0.00");

  const createEmptyData = (): DataValue => ({
    paket: 0,
    orang: 0,
    realisasiPaket: 0,
    realisasiOrang: 0,
  });

  // =========================================================
  // LOAD DATA
  // =========================================================

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        const res = await getSatpelData("ABT");

        if (cancelled) return;

        if (res.success) {
          if (res.locations && res.locations.length > 0) {
            setLocations(
              res.locations.map((loc) => ({
                id: loc.id,
                name: loc.name,
              })),
            );
          }

          if (res.data) {
            setRows(
              res.data.map((row) => ({
                id: row.id,
                kode: row.kode,
                ro: row.ro,
                data: row.data,
                subRows: row.subRows,
              })),
            );
          }
        } else {
          setModal({
            isOpen: true,
            type: "error",
            title: "Error",
            message: `Gagal menarik data dari database: ${res.error}`,
          });
        }
      } catch (error: unknown) {
        if (cancelled) return;

        const message = error instanceof Error ? error.message : "Gagal menarik data dari database.";

        setModal({
          isOpen: true,
          type: "error",
          title: "Error",
          message,
        });
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchData();

    return () => {
      cancelled = true;
    };
  }, []);

  // =========================================================
  // LOKASI
  // =========================================================

  const tambahLokasi = () => {
    setLocations((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: `Satpel ${prev.length + 1}`,
      },
    ]);
  };

  const updateNamaLokasi = (id: string, newName: string) => {
    setLocations((prev) =>
      prev.map((loc) =>
        loc.id === id
          ? {
              ...loc,
              name: newName,
            }
          : loc,
      ),
    );
  };

  const hapusLokasi = (id: string) => {
    if (locations.length === 1) {
      setModal({
        isOpen: true,
        type: "error",
        title: "Gagal",
        message: "Halaman ini harus memiliki minimal satu tabel lokasi.",
      });

      return;
    }

    setModal({
      isOpen: true,
      type: "confirm",
      title: "Hapus Tabel Lokasi?",
      message: "Tabel lokasi ini beserta datanya akan dihapus dari layar.",
      onConfirm: () => {
        setLocations((prev) => prev.filter((loc) => loc.id !== id));

        closeModal();
      },
    });
  };

  // =========================================================
  // BARIS
  // =========================================================

  const tambahBarisUtama = () => {
    setRows((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        kode: "-",
        ro: "-",
        data: {},
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
              subRows: [
                ...row.subRows,
                {
                  id: crypto.randomUUID(),
                  kode: "-",
                  ro: "-",
                  data: {},
                },
              ],
            }
          : row,
      ),
    );
  };

  const hapusBarisUtama = (id: string) => {
    setModal({
      isOpen: true,
      type: "confirm",
      title: "Hapus RO?",
      message: "Lanjutkan menghapus rincian ini beserta sub-rinciannya dari seluruh lokasi?",
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
      message: "Hapus sub-rincian ini dari seluruh lokasi?",
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

  // =========================================================
  // UPDATE TEXT
  // =========================================================

  const updateBarisUtamaText = (id: string, field: "kode" | "ro", value: string) => {
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

  const updateSubBarisText = (parentId: string, subId: string, field: "kode" | "ro", value: string) => {
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

  // =========================================================
  // UPDATE DATA UTAMA
  // =========================================================

  const updateBarisUtamaData = (rowId: string, locId: string, field: "paket" | "realisasiPaket" | "realisasiOrang", value: number) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;

        const current = row.data[locId] || createEmptyData();

        const newValue = {
          ...current,
          [field]: value,
        };

        // Target orang otomatis = paket x 16
        newValue.orang = hitungOrang(Number(newValue.paket || 0));

        return {
          ...row,
          data: {
            ...row.data,
            [locId]: newValue,
          },
        };
      }),
    );
  };

  // =========================================================
  // UPDATE DATA SUB
  // =========================================================

  const updateSubBarisData = (rowId: string, subId: string, locId: string, field: "paket" | "realisasiPaket" | "realisasiOrang", value: number) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;

        return {
          ...row,
          subRows: row.subRows.map((sub) => {
            if (sub.id !== subId) return sub;

            const current = sub.data[locId] || createEmptyData();

            const newValue = {
              ...current,
              [field]: value,
            };

            // Target orang otomatis = paket x 16
            newValue.orang = hitungOrang(Number(newValue.paket || 0));

            return {
              ...sub,
              data: {
                ...sub.data,
                [locId]: newValue,
              },
            };
          }),
        };
      }),
    );
  };

  // =========================================================
  // DISPLAY DATA PARENT
  // =========================================================

  const getDisplayData = (row: Row, locId: string): DataValue => {
    const hasSub = row.subRows.length > 0;

    if (hasSub) {
      const paket = row.subRows.reduce((sum, sub) => sum + (sub.data[locId]?.paket || 0), 0);

      const orang = row.subRows.reduce((sum, sub) => sum + (sub.data[locId]?.orang ?? hitungOrang(sub.data[locId]?.paket || 0)), 0);

      const realisasiPaket = row.subRows.reduce((sum, sub) => sum + (sub.data[locId]?.realisasiPaket || 0), 0);

      const realisasiOrang = row.subRows.reduce((sum, sub) => sum + (sub.data[locId]?.realisasiOrang || 0), 0);

      return {
        paket,
        orang,
        realisasiPaket,
        realisasiOrang,
      };
    }

    const data = row.data[locId];

    if (!data) return createEmptyData();

    return {
      paket: data.paket || 0,
      orang: data.orang ?? hitungOrang(data.paket || 0),
      realisasiPaket: data.realisasiPaket || 0,
      realisasiOrang: data.realisasiOrang || 0,
    };
  };

  // =========================================================
  // SIMPAN
  // =========================================================

  const simpanData = async () => {
    setIsSaving(true);

    try {
      const rowsToSave = rows.map((row) => {
        const newData = {
          ...row.data,
        };

        locations.forEach((loc) => {
          if (newData[loc.id]) {
            newData[loc.id] = {
              ...newData[loc.id],
              orang: hitungOrang(newData[loc.id].paket || 0),
            };
          }
        });

        const newSubRows = row.subRows.map((sub) => {
          const newSubData = {
            ...sub.data,
          };

          locations.forEach((loc) => {
            if (newSubData[loc.id]) {
              newSubData[loc.id] = {
                ...newSubData[loc.id],
                orang: hitungOrang(newSubData[loc.id].paket || 0),
              };
            }
          });

          return {
            ...sub,
            data: newSubData,
          };
        });

        return {
          ...row,
          data: newData,
          subRows: newSubRows,
        };
      });

      const result = await simpanSatpelData("ABT", locations, rowsToSave);

      if (result.success) {
        setModal({
          isOpen: true,
          type: "success",
          title: "Berhasil",
          message: "Data Satpel berhasil disimpan ke Database!",
        });
      } else {
        setModal({
          isOpen: true,
          type: "error",
          title: "Gagal",
          message: `Terjadi kesalahan: ${result.error}`,
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan data.";

      setModal({
        isOpen: true,
        type: "error",
        title: "Gagal",
        message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // =========================================================
  // EXPORT EXCEL
  // =========================================================

  const handleDownloadExcel = async () => {
    if (rows.length === 0) {
      setModal({
        isOpen: true,
        type: "error",
        title: "Gagal Mengunduh",
        message: "Data masih kosong.",
      });

      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Satpel");

    worksheet.columns = [{ width: 6 }, { width: 15 }, { width: 45 }, { width: 18 }, { width: 18 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }];

    const applyBorder = (row: ExcelJS.Row) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: {
            style: "thin",
            color: { argb: "FFCCCCCC" },
          },
          left: {
            style: "thin",
            color: { argb: "FFCCCCCC" },
          },
          bottom: {
            style: "thin",
            color: { argb: "FFCCCCCC" },
          },
          right: {
            style: "thin",
            color: { argb: "FFCCCCCC" },
          },
        };

        cell.alignment = {
          vertical: "middle",
          horizontal: "center",
        };
      });

      const roCell = row.getCell(3);

      roCell.alignment = {
        vertical: "middle",
        horizontal: "left",
      };
    };

    const createTable = (title: string, locId: string | "TOTAL") => {
      // TITLE
      const headerTitle = worksheet.addRow(["", "", title.toUpperCase(), "", "", "", "", "", ""]);

      worksheet.mergeCells(`C${headerTitle.number}:I${headerTitle.number}`);

      headerTitle.getCell(3).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: locId === "TOTAL" ? "FFF59E0B" : "FF15406A",
        },
      };

      headerTitle.getCell(3).font = {
        color: { argb: "FFFFFFFF" },
        bold: true,
      };

      headerTitle.getCell(3).alignment = {
        vertical: "middle",
        horizontal: "center",
      };

      // HEADER 1
      const h1 = worksheet.addRow(["NO.", "KODE", "RINCIAN OUTPUT (RO)", "Target", "", "Realisasi", "", "Capaian (%)", ""]);

      // HEADER 2
      const h2 = worksheet.addRow(["", "", "", "Paket", "Orang", "Paket", "Orang", "Paket", "Orang"]);

      worksheet.mergeCells(`A${h1.number}:A${h2.number}`);
      worksheet.mergeCells(`B${h1.number}:B${h2.number}`);
      worksheet.mergeCells(`C${h1.number}:C${h2.number}`);
      worksheet.mergeCells(`D${h1.number}:E${h1.number}`);
      worksheet.mergeCells(`F${h1.number}:G${h1.number}`);
      worksheet.mergeCells(`H${h1.number}:I${h1.number}`);

      [h1, h2].forEach((header) => {
        header.eachCell({ includeEmpty: true }, (cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF184878" },
          };

          cell.font = {
            color: { argb: "FFFFFFFF" },
            bold: true,
          };

          cell.alignment = {
            vertical: "middle",
            horizontal: "center",
          };

          cell.border = {
            top: {
              style: "thin",
              color: { argb: "FFFFFFFF" },
            },
            left: {
              style: "thin",
              color: { argb: "FFFFFFFF" },
            },
            bottom: {
              style: "thin",
              color: { argb: "FFFFFFFF" },
            },
            right: {
              style: "thin",
              color: { argb: "FFFFFFFF" },
            },
          };
        });
      });

      let sumPaket = 0;
      let sumOrang = 0;
      let sumRealisasiPaket = 0;
      let sumRealisasiOrang = 0;

      rows.forEach((row, idx) => {
        const hasSub = row.subRows.length > 0;

        let paket = 0;
        let orang = 0;
        let realisasiPaket = 0;
        let realisasiOrang = 0;

        if (locId === "TOTAL") {
          locations.forEach((loc) => {
            const d = getDisplayData(row, loc.id);

            paket += d.paket;
            orang += d.orang || 0;
            realisasiPaket += d.realisasiPaket;
            realisasiOrang += d.realisasiOrang;
          });
        } else {
          const d = getDisplayData(row, locId);

          paket = d.paket;
          orang = d.orang || 0;
          realisasiPaket = d.realisasiPaket;
          realisasiOrang = d.realisasiOrang;
        }

        sumPaket += paket;
        sumOrang += orang;
        sumRealisasiPaket += realisasiPaket;
        sumRealisasiOrang += realisasiOrang;

        const rMain = worksheet.addRow([idx + 1, row.kode, row.ro, paket, orang, realisasiPaket, realisasiOrang, `${hitungPersen(realisasiPaket, paket)}%`, `${hitungPersen(realisasiOrang, orang)}%`]);

        applyBorder(rMain);

        if (hasSub) {
          rMain.font = {
            bold: true,
          };

          rMain.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF9FAFB" },
          };
        }

        row.subRows.forEach((sub) => {
          let sp = 0;
          let so = 0;
          let srp = 0;
          let sro = 0;

          if (locId === "TOTAL") {
            locations.forEach((loc) => {
              const d = sub.data[loc.id];

              if (!d) return;

              sp += d.paket || 0;
              so += d.orang ?? hitungOrang(d.paket || 0);
              srp += d.realisasiPaket || 0;
              sro += d.realisasiOrang || 0;
            });
          } else {
            const d = sub.data[locId];

            sp = d?.paket || 0;
            so = d?.orang ?? hitungOrang(d?.paket || 0);
            srp = d?.realisasiPaket || 0;
            sro = d?.realisasiOrang || 0;
          }

          const rSub = worksheet.addRow(["", sub.kode, `    ↳ ${sub.ro}`, sp, so, srp, sro, `${hitungPersen(srp, sp)}%`, `${hitungPersen(sro, so)}%`]);

          applyBorder(rSub);
        });
      });

      // TOTAL
      const rTot = worksheet.addRow(["", "", "JUMLAH TOTAL", sumPaket, sumOrang, sumRealisasiPaket, sumRealisasiOrang, `${hitungPersen(sumRealisasiPaket, sumPaket)}%`, `${hitungPersen(sumRealisasiOrang, sumOrang)}%`]);

      worksheet.mergeCells(`A${rTot.number}:C${rTot.number}`);

      rTot.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: {
            argb: locId === "TOTAL" ? "FFF59E0B" : "FFFFE4B5",
          },
        };

        cell.font = {
          color: {
            argb: locId === "TOTAL" ? "FFFFFFFF" : "FF8B4513",
          },
          bold: true,
        };

        cell.alignment = {
          vertical: "middle",
          horizontal: "center",
        };
      });

      worksheet.addRow([]);
    };

    locations.forEach((loc) => createTable(`LOKASI: ${loc.name}`, loc.id));

    createTable("REKAPITULASI KESELURUHAN (TOTAL SEMUA SATPEL)", "TOTAL");

    const buffer = await workbook.xlsx.writeBuffer();

    saveAs(new Blob([buffer]), "Data_Satpel_Terpisah.xlsx");
  };

  // =========================================================
  // LOADING
  // =========================================================

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

        <p className="text-sm font-semibold text-[#15406A]">Memuat data Satpel</p>

        <p className="mt-1 text-xs text-slate-400">Menghubungkan ke database...</p>
      </div>
    );
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="space-y-6 relative">
      {/* =====================================================
          MODAL
      ====================================================== */}

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

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#15406A]">Satpel (ABT)</h1>

          <p className="text-gray-500 text-sm mt-1">Kelola data target dan realisasi di masing-masing lokasi secara terpisah.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={tambahLokasi} className="flex items-center gap-2 bg-blue-50 text-[#15406A] hover:bg-blue-100 px-4 py-2 rounded-lg font-bold transition-colors border border-blue-200 shadow-sm">
            <MapPin className="w-4 h-4" />
            Tambah Tabel Lokasi
          </button>

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

      {/* =====================================================
          INFO
      ====================================================== */}

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />

        <p className="text-amber-800 text-sm font-medium leading-relaxed">
          <span className="font-bold">Informasi:</span> RO dan Kode tersinkronisasi di seluruh tabel. Mengubah/Menambah RO di satu tabel akan mengubahnya di tabel lokasi lain.
        </p>
      </div>

      {/* =====================================================
          TABEL PER LOKASI
      ====================================================== */}

      {locations.map((loc) => {
        const totalPaketLoc = rows.reduce((sum, row) => sum + getDisplayData(row, loc.id).paket, 0);

        const totalOrangLoc = rows.reduce((sum, row) => sum + (getDisplayData(row, loc.id).orang || 0), 0);

        const totalRealisasiPaketLoc = rows.reduce((sum, row) => sum + getDisplayData(row, loc.id).realisasiPaket, 0);

        const totalRealisasiOrangLoc = rows.reduce((sum, row) => sum + getDisplayData(row, loc.id).realisasiOrang, 0);

        return (
          <div key={loc.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
            {/* HEADER LOKASI */}
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
                  <Trash2 className="w-4 h-4" />
                  Hapus Tabel
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                {/* =================================================
                    HEADER BARU
                ================================================== */}

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

                    <th colSpan={6} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#1c548c]">
                      ABT
                    </th>

                    <th rowSpan={2} className="border border-[#1a4e82] px-4 py-3 text-center w-32">
                      Aksi
                    </th>
                  </tr>

                  <tr>
                    <th colSpan={2} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#2060a0]">
                      Target
                    </th>

                    <th colSpan={2} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#2060a0]">
                      Realisasi
                    </th>

                    <th colSpan={2} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#2060a0]">
                      Capaian (%)
                    </th>
                  </tr>

                  <tr>
                    <th className="border border-[#1a4e82] px-4 py-2 text-center">&nbsp;</th>
                    <th className="border border-[#1a4e82] px-4 py-2 text-center">&nbsp;</th>
                    <th className="border border-[#1a4e82] px-4 py-2 text-center">&nbsp;</th>

                    <th className="border border-[#1a4e82] px-4 py-2 text-center bg-[#2060a0]">Paket</th>

                    <th className="border border-[#1a4e82] px-4 py-2 text-center bg-[#2060a0]">Orang</th>

                    <th className="border border-[#1a4e82] px-4 py-2 text-center bg-[#2060a0]">Paket</th>

                    <th className="border border-[#1a4e82] px-4 py-2 text-center bg-[#2060a0]">Orang</th>

                    <th className="border border-[#1a4e82] px-4 py-2 text-center bg-[#2060a0]">Paket</th>

                    <th className="border border-[#1a4e82] px-4 py-2 text-center bg-[#2060a0]">Orang</th>

                    <th className="border border-[#1a4e82] px-4 py-2 text-center">&nbsp;</th>
                  </tr>
                </thead>

                <tbody className="text-gray-700">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center text-gray-400 font-medium bg-white">
                        Belum ada RO. Klik Tambah RO di bawah.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, index) => {
                      const hasSub = row.subRows.length > 0;

                      const displayData = getDisplayData(row, loc.id);

                      const displayPaket = displayData.paket;

                      const displayOrang = displayData.orang || 0;

                      const displayRealisasiPaket = displayData.realisasiPaket;

                      const displayRealisasiOrang = displayData.realisasiOrang;

                      const sortedSubRows = [...row.subRows].sort((a, b) =>
                        a.kode.localeCompare(b.kode, undefined, {
                          numeric: true,
                          sensitivity: "base",
                        }),
                      );

                      const capaianPaket = hitungPersen(displayRealisasiPaket, displayPaket);

                      const capaianOrang = hitungPersen(displayRealisasiOrang, displayOrang);

                      return (
                        <Fragment key={`${loc.id}-${row.id}`}>
                          {/* PARENT */}
                          <tr className={`border-b border-gray-200 transition-colors ${hasSub ? "bg-gray-100 font-semibold" : "bg-white hover:bg-blue-50/30"}`}>
                            <td className="border-r border-gray-200 px-4 py-2 text-center">{index + 1}</td>

                            <td className="border-r border-gray-200 p-0">
                              <input type="text" value={row.kode} onChange={(e) => updateBarisUtamaText(row.id, "kode", e.target.value)} className="w-full h-full px-4 py-3 bg-transparent outline-none focus:bg-white" />
                            </td>

                            <td className="border-r border-gray-200 p-0">
                              <input type="text" value={row.ro} onChange={(e) => updateBarisUtamaText(row.id, "ro", e.target.value)} className="w-full h-full px-4 py-3 bg-transparent outline-none focus:bg-white" />
                            </td>

                            {/* TARGET PAKET */}
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

                            {/* TARGET ORANG */}
                            <td className="border-r border-gray-200 px-4 py-3 text-center bg-gray-50/50">{displayOrang}</td>

                            {/* REALISASI PAKET */}
                            <td className="border-r border-gray-200 p-0">
                              <input
                                type="number"
                                value={displayRealisasiPaket === 0 ? "" : displayRealisasiPaket}
                                onChange={(e) => updateBarisUtamaData(row.id, loc.id, "realisasiPaket", Number(e.target.value))}
                                disabled={hasSub}
                                placeholder="0"
                                className={`w-full h-full px-4 py-3 text-center outline-none ${hasSub ? "bg-transparent cursor-not-allowed text-gray-500" : "bg-transparent focus:bg-white"}`}
                              />
                            </td>

                            {/* REALISASI ORANG */}
                            <td className="border-r border-gray-200 p-0">
                              <input
                                type="number"
                                value={displayRealisasiOrang === 0 ? "" : displayRealisasiOrang}
                                onChange={(e) => updateBarisUtamaData(row.id, loc.id, "realisasiOrang", Number(e.target.value))}
                                disabled={hasSub}
                                placeholder="0"
                                className={`w-full h-full px-4 py-3 text-center outline-none ${hasSub ? "bg-transparent cursor-not-allowed text-gray-500" : "bg-transparent focus:bg-white"}`}
                              />
                            </td>

                            {/* CAPAIAN PAKET */}
                            <td className="border-r border-gray-200 px-4 py-3 text-center bg-gray-50/50 text-[#15406A] font-bold">{capaianPaket}%</td>

                            {/* CAPAIAN ORANG */}
                            <td className="border-r border-gray-200 px-4 py-3 text-center bg-gray-50/50 text-[#15406A] font-bold">{capaianOrang}%</td>

                            {/* AKSI */}
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

                          {/* SUB ROW */}
                          {sortedSubRows.map((sub) => {
                            const data = sub.data[loc.id];

                            const sp = data?.paket || 0;

                            const so = data?.orang ?? hitungOrang(sp);

                            const srp = data?.realisasiPaket || 0;

                            const sro = data?.realisasiOrang || 0;

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

                                {/* TARGET PAKET */}
                                <td className="border-r border-gray-200 p-0">
                                  <input
                                    type="number"
                                    value={sp === 0 ? "" : sp}
                                    onChange={(e) => updateSubBarisData(row.id, sub.id, loc.id, "paket", Number(e.target.value))}
                                    placeholder="0"
                                    className="w-full h-full px-4 py-2.5 text-center bg-transparent outline-none focus:bg-white text-sm"
                                  />
                                </td>

                                {/* TARGET ORANG */}
                                <td className="border-r border-gray-200 px-4 py-2.5 text-center bg-gray-50/50 text-sm text-gray-500">{so}</td>

                                {/* REALISASI PAKET */}
                                <td className="border-r border-gray-200 p-0">
                                  <input
                                    type="number"
                                    value={srp === 0 ? "" : srp}
                                    onChange={(e) => updateSubBarisData(row.id, sub.id, loc.id, "realisasiPaket", Number(e.target.value))}
                                    placeholder="0"
                                    className="w-full h-full px-4 py-2.5 text-center bg-transparent outline-none focus:bg-white text-sm"
                                  />
                                </td>

                                {/* REALISASI ORANG */}
                                <td className="border-r border-gray-200 p-0">
                                  <input
                                    type="number"
                                    value={sro === 0 ? "" : sro}
                                    onChange={(e) => updateSubBarisData(row.id, sub.id, loc.id, "realisasiOrang", Number(e.target.value))}
                                    placeholder="0"
                                    className="w-full h-full px-4 py-2.5 text-center bg-transparent outline-none focus:bg-white text-sm"
                                  />
                                </td>

                                {/* CAPAIAN PAKET */}
                                <td className="border-r border-gray-200 px-4 py-2.5 text-center bg-gray-50/50 text-[#15406A] font-semibold text-sm">{hitungPersen(srp, sp)}%</td>

                                {/* CAPAIAN ORANG */}
                                <td className="border-r border-gray-200 px-4 py-2.5 text-center bg-gray-50/50 text-[#15406A] font-semibold text-sm">{hitungPersen(sro, so)}%</td>

                                {/* AKSI */}
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

                {/* =================================================
                    FOOTER LOKASI
                ================================================== */}

                {rows.length > 0 && (
                  <tfoot className="bg-amber-100 text-amber-900 font-bold tracking-wide">
                    <tr>
                      <td colSpan={3} className="border border-amber-200 px-4 py-4 text-right uppercase">
                        Total {loc.name}
                      </td>

                      <td className="border border-amber-200 px-4 py-4 text-center">{totalPaketLoc}</td>

                      <td className="border border-amber-200 px-4 py-4 text-center">{totalOrangLoc}</td>

                      <td className="border border-amber-200 px-4 py-4 text-center bg-amber-200/40">{totalRealisasiPaketLoc}</td>

                      <td className="border border-amber-200 px-4 py-4 text-center bg-amber-200/40">{totalRealisasiOrangLoc}</td>

                      <td className="border border-amber-200 px-4 py-4 text-center bg-amber-200/40">{hitungPersen(totalRealisasiPaketLoc, totalPaketLoc)}%</td>

                      <td className="border border-amber-200 px-4 py-4 text-center bg-amber-200/40">{hitungPersen(totalRealisasiOrangLoc, totalOrangLoc)}%</td>

                      <td className="border border-amber-200"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* TAMBAH RO */}
            <div className="bg-gray-50 p-4 border-t border-gray-200">
              <button onClick={tambahBarisUtama} className="flex items-center gap-2 text-sm font-bold text-[#15406A] hover:text-blue-800 transition-colors">
                <Plus className="w-5 h-5" />
                Tambah RO (Teraplikasi ke semua tabel)
              </button>
            </div>
          </div>
        );
      })}

      {/* =====================================================
          REKAPITULASI KESELURUHAN
      ====================================================== */}

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

                  <th colSpan={6} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#1c548c]">
                    ABT
                  </th>
                </tr>

                <tr>
                  <th colSpan={2} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#2060a0]">
                    Target
                  </th>

                  <th colSpan={2} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#2060a0]">
                    Realisasi
                  </th>

                  <th colSpan={2} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#2060a0]">
                    Capaian (%)
                  </th>
                </tr>

                <tr>
                  <th className="border border-[#1a4e82] px-4 py-2">&nbsp;</th>

                  <th className="border border-[#1a4e82] px-4 py-2">&nbsp;</th>

                  <th className="border border-[#1a4e82] px-4 py-2">&nbsp;</th>

                  <th className="border border-[#1a4e82] px-4 py-2 text-center bg-[#2060a0]">Paket</th>

                  <th className="border border-[#1a4e82] px-4 py-2 text-center bg-[#2060a0]">Orang</th>

                  <th className="border border-[#1a4e82] px-4 py-2 text-center bg-[#2060a0]">Paket</th>

                  <th className="border border-[#1a4e82] px-4 py-2 text-center bg-[#2060a0]">Orang</th>

                  <th className="border border-[#1a4e82] px-4 py-2 text-center bg-[#2060a0]">Paket</th>

                  <th className="border border-[#1a4e82] px-4 py-2 text-center bg-[#2060a0]">Orang</th>
                </tr>
              </thead>

              <tbody className="text-gray-700">
                {rows.map((row, index) => {
                  const hasSub = row.subRows.length > 0;

                  const totalPaket = locations.reduce((sum, loc) => sum + getDisplayData(row, loc.id).paket, 0);

                  const totalOrang = locations.reduce((sum, loc) => sum + (getDisplayData(row, loc.id).orang || 0), 0);

                  const totalRealisasiPaket = locations.reduce((sum, loc) => sum + getDisplayData(row, loc.id).realisasiPaket, 0);

                  const totalRealisasiOrang = locations.reduce((sum, loc) => sum + getDisplayData(row, loc.id).realisasiOrang, 0);

                  const sortedSubRows = [...row.subRows].sort((a, b) =>
                    a.kode.localeCompare(b.kode, undefined, {
                      numeric: true,
                      sensitivity: "base",
                    }),
                  );

                  return (
                    <Fragment key={`total-${row.id}`}>
                      <tr className={`border-b border-gray-200 transition-colors ${hasSub ? "bg-amber-50/40 font-semibold" : "bg-white"}`}>
                        <td className="border-r border-gray-200 px-4 py-3 text-center">{index + 1}</td>

                        <td className="border-r border-gray-200 px-4 py-3">{row.kode}</td>

                        <td className="border-r border-gray-200 px-4 py-3">{row.ro}</td>

                        <td className="border-r border-gray-200 px-4 py-3 text-center">{totalPaket}</td>

                        <td className="border-r border-gray-200 px-4 py-3 text-center bg-gray-50/50">{totalOrang}</td>

                        <td className="border-r border-gray-200 px-4 py-3 text-center">{totalRealisasiPaket}</td>

                        <td className="border-r border-gray-200 px-4 py-3 text-center">{totalRealisasiOrang}</td>

                        <td className="border-r border-gray-200 px-4 py-3 text-center bg-gray-50/50 text-[#15406A] font-bold">{hitungPersen(totalRealisasiPaket, totalPaket)}%</td>

                        <td className="px-4 py-3 text-center bg-gray-50/50 text-[#15406A] font-bold">{hitungPersen(totalRealisasiOrang, totalOrang)}%</td>
                      </tr>

                      {sortedSubRows.map((sub) => {
                        const sPaket = locations.reduce((sum, loc) => sum + (sub.data[loc.id]?.paket || 0), 0);

                        const sOrang = locations.reduce((sum, loc) => sum + (sub.data[loc.id]?.orang ?? hitungOrang(sub.data[loc.id]?.paket || 0)), 0);

                        const sRealisasiPaket = locations.reduce((sum, loc) => sum + (sub.data[loc.id]?.realisasiPaket || 0), 0);

                        const sRealisasiOrang = locations.reduce((sum, loc) => sum + (sub.data[loc.id]?.realisasiOrang || 0), 0);

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

                            <td className="border-r border-gray-200 px-4 py-2 text-center text-gray-600">{sRealisasiPaket}</td>

                            <td className="border-r border-gray-200 px-4 py-2 text-center text-gray-600">{sRealisasiOrang}</td>

                            <td className="border-r border-gray-200 px-4 py-2 text-center bg-gray-50/50 text-[#15406A] font-semibold">{hitungPersen(sRealisasiPaket, sPaket)}%</td>

                            <td className="px-4 py-2 text-center bg-gray-50/50 text-[#15406A] font-semibold">{hitungPersen(sRealisasiOrang, sOrang)}%</td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  );
                })}
              </tbody>

              {/* GRAND TOTAL */}
              <tfoot className="bg-[#15406A] text-white font-bold tracking-wide">
                {(() => {
                  const grandTotalPaket = rows.reduce((sum, row) => sum + locations.reduce((locSum, loc) => locSum + getDisplayData(row, loc.id).paket, 0), 0);

                  const grandTotalOrang = rows.reduce((sum, row) => sum + locations.reduce((locSum, loc) => locSum + (getDisplayData(row, loc.id).orang || 0), 0), 0);

                  const grandTotalRealisasiPaket = rows.reduce((sum, row) => sum + locations.reduce((locSum, loc) => locSum + getDisplayData(row, loc.id).realisasiPaket, 0), 0);

                  const grandTotalRealisasiOrang = rows.reduce((sum, row) => sum + locations.reduce((locSum, loc) => locSum + getDisplayData(row, loc.id).realisasiOrang, 0), 0);

                  return (
                    <tr>
                      <td colSpan={3} className="border-r border-[#1a4e82] px-4 py-4 text-right uppercase">
                        GRAND TOTAL KESELURUHAN
                      </td>

                      <td className="border-r border-[#1a4e82] px-4 py-4 text-center">{grandTotalPaket}</td>

                      <td className="border-r border-[#1a4e82] px-4 py-4 text-center text-blue-200">{grandTotalOrang}</td>

                      <td className="border-r border-[#1a4e82] px-4 py-4 text-center text-emerald-300">{grandTotalRealisasiPaket}</td>

                      <td className="border-r border-[#1a4e82] px-4 py-4 text-center text-emerald-300">{grandTotalRealisasiOrang}</td>

                      <td className="border-r border-[#1a4e82] px-4 py-4 text-center text-amber-300">{hitungPersen(grandTotalRealisasiPaket, grandTotalPaket)}%</td>

                      <td className="px-4 py-4 text-center text-amber-300">{hitungPersen(grandTotalRealisasiOrang, grandTotalOrang)}%</td>
                    </tr>
                  );
                })()}
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================
          SAVE
      ====================================================== */}

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
