"use client";

import React, { Fragment, useState, useEffect } from "react";

import { Download, CornerDownRight } from "lucide-react";

import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

import { getAlokasiAnggaran, type AlokasiRowData } from "@/app/actions/data";

export type DashboardMetrics = {
  paket: number;
  orang: number;
  realisasiPaket: number;
  realisasiOrang: number;
  anggaran: number;
};

export type DashboardSubRow = {
  id: string;
  kode: string;
  ro: string;
  abt: DashboardMetrics;
  nonAbt: DashboardMetrics;
};

export type DashboardRow = {
  id: string;
  kode: string;
  ro: string;
  abt: DashboardMetrics;
  nonAbt: DashboardMetrics;
  subRows: DashboardSubRow[];
};

export type DashboardGroupData = {
  groupName: string;
  rows: DashboardRow[];
};

interface RekapanTableProps {
  data: DashboardGroupData[];
}

export default function RekapanTable({ data }: RekapanTableProps) {
  // ============================================================
  // STATE
  // ============================================================

  const [lainnyaData, setLainnyaData] = useState<AlokasiRowData[]>([]);

  // ============================================================
  // LOAD ANGGARAN LAINNYA
  // ============================================================

  useEffect(() => {
    let cancelled = false;

    const fetchLainnya = async () => {
      try {
        const res = await getAlokasiAnggaran();

        if (!cancelled && res.success && res.data?.lainnya) {
          setLainnyaData(res.data.lainnya);
        }
      } catch (error) {
        console.error("Gagal memuat anggaran lainnya:", error);
      }
    };

    void fetchLainnya();

    return () => {
      cancelled = true;
    };
  }, []);

  // ============================================================
  // HELPERS
  // ============================================================

  const hitungPersen = (realisasi: number, target: number) => {
    if (target <= 0) {
      return "0.00";
    }

    return ((realisasi / target) * 100).toFixed(2);
  };

  const formatRp = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  // ============================================================
  // HELPER REALISASI ANGGARAN LAINNYA
  // ============================================================

  const getRealisasiLainnya = (item: AlokasiRowData): number => {
    const value = (
      item as AlokasiRowData & {
        realisasi?: number | null;
        realisasi_anggaran?: number | null;
      }
    ).realisasi;

    const fallback = (
      item as AlokasiRowData & {
        realisasi?: number | null;
        realisasi_anggaran?: number | null;
      }
    ).realisasi_anggaran;

    return Number(value ?? fallback ?? 0);
  };

  // ============================================================
  // HELPER MENGAMBIL TOTAL ROW
  // ============================================================

  const getRowMetrics = (row: DashboardRow) => {
    const hasSub = row.subRows.length > 0;

    if (!hasSub) {
      return {
        abt: row.abt,
        nonAbt: row.nonAbt,
      };
    }

    const abt = row.subRows.reduce(
      (total, sub) => ({
        paket: total.paket + sub.abt.paket,

        orang: total.orang + sub.abt.orang,

        realisasiPaket: total.realisasiPaket + sub.abt.realisasiPaket,

        realisasiOrang: total.realisasiOrang + sub.abt.realisasiOrang,

        anggaran: total.anggaran + sub.abt.anggaran,
      }),
      {
        paket: 0,
        orang: 0,
        realisasiPaket: 0,
        realisasiOrang: 0,
        anggaran: 0,
      },
    );

    const nonAbt = row.subRows.reduce(
      (total, sub) => ({
        paket: total.paket + sub.nonAbt.paket,

        orang: total.orang + sub.nonAbt.orang,

        realisasiPaket: total.realisasiPaket + sub.nonAbt.realisasiPaket,

        realisasiOrang: total.realisasiOrang + sub.nonAbt.realisasiOrang,

        anggaran: total.anggaran + sub.nonAbt.anggaran,
      }),
      {
        paket: 0,
        orang: 0,
        realisasiPaket: 0,
        realisasiOrang: 0,
        anggaran: 0,
      },
    );

    return {
      abt,
      nonAbt,
    };
  };

  // ============================================================
  // GRAND TOTAL
  // ============================================================

  let grandTotalAbtP = 0;
  let grandTotalAbtO = 0;
  let grandTotalAbtRP = 0;
  let grandTotalAbtR = 0;
  let grandTotalAbtA = 0;

  let grandTotalNonP = 0;
  let grandTotalNonO = 0;
  let grandTotalNonRP = 0;
  let grandTotalNonR = 0;
  let grandTotalNonA = 0;

  data.forEach((group) => {
    group.rows.forEach((row) => {
      const metrics = getRowMetrics(row);

      grandTotalAbtP += metrics.abt.paket;

      grandTotalAbtO += metrics.abt.orang;

      grandTotalAbtRP += metrics.abt.realisasiPaket;

      grandTotalAbtR += metrics.abt.realisasiOrang;

      grandTotalAbtA += metrics.abt.anggaran;

      grandTotalNonP += metrics.nonAbt.paket;

      grandTotalNonO += metrics.nonAbt.orang;

      grandTotalNonRP += metrics.nonAbt.realisasiPaket;

      grandTotalNonR += metrics.nonAbt.realisasiOrang;

      grandTotalNonA += metrics.nonAbt.anggaran;
    });
  });

  const totalModul = grandTotalAbtA + grandTotalNonA;

  const totalLainnya = lainnyaData.reduce((sum, item) => sum + Number(item.anggaran || 0), 0);

  const totalRealisasiLainnya = lainnyaData.reduce((sum, item) => sum + getRealisasiLainnya(item), 0);

  const persentaseLainnya = hitungPersen(totalRealisasiLainnya, totalLainnya);

  const superGrandTotal = totalModul + totalLainnya;

  // ============================================================
  // EXPORT EXCEL
  // ============================================================

  const handleDownloadExcel = async () => {
    const workbook = new ExcelJS.Workbook();

    const worksheet = workbook.addWorksheet("Rekapan Dashboard");

    worksheet.columns = [
      { width: 6 },
      { width: 16 },
      { width: 45 },

      // ABT
      { width: 12 },
      { width: 12 },
      { width: 14 },
      { width: 14 },
      { width: 14 },
      { width: 14 },

      // NON-ABT
      { width: 12 },
      { width: 12 },
      { width: 14 },
      { width: 14 },
      { width: 14 },
      { width: 14 },

      // Total Anggaran
      { width: 24 },
    ];

    // ========================================================
    // BORDER
    // ========================================================

    const applyBorder = (row: ExcelJS.Row, alignRightCols: number[] = []) => {
      row.eachCell(
        {
          includeEmpty: true,
        },
        (cell, colNumber) => {
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

            horizontal: alignRightCols.includes(colNumber) ? "right" : colNumber === 3 ? "left" : "center",
          };
        },
      );
    };

    let globalNo = 1;

    // ========================================================
    // EXPORT SETIAP GROUP
    // ========================================================

    data.forEach((group) => {
      const isProd = group.groupName.toLowerCase() === "produktivitas";

      // ----------------------------------------------------
      // GROUP HEADER
      // ----------------------------------------------------

      const groupHeader = worksheet.addRow(["", "", `REKAPITULASI: ${group.groupName.toUpperCase()}`, "", "", "", "", "", "", "", "", "", "", "", "", ""]);

      worksheet.mergeCells(`A${groupHeader.number}:P${groupHeader.number}`);

      groupHeader.getCell(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: "FF15406A",
        },
      };

      groupHeader.getCell(1).font = {
        color: {
          argb: "FFFFFFFF",
        },
        bold: true,
      };

      groupHeader.getCell(1).alignment = {
        vertical: "middle",
        horizontal: "center",
      };

      // ----------------------------------------------------
      // HEADER TABLE
      // ----------------------------------------------------

      const row1 = worksheet.addRow(["NO.", "KODE", "RINCIAN OUTPUT (RO)", "ABT", "", "", "", "", "", "NON-ABT", "", "", "", "", "", "Total Anggaran"]);

      const row2 = worksheet.addRow(["", "", "", "Target", "", "Realisasi", "", "Capaian (%)", "", "Target", "", "Realisasi", "", "Capaian (%)", "", ""]);

      const row3 = worksheet.addRow(["", "", "", isProd ? "-" : "Paket", "Orang", isProd ? "-" : "Paket", "Orang", "Paket", "Orang", isProd ? "-" : "Paket", "Orang", isProd ? "-" : "Paket", "Orang", "Paket", "Orang", ""]);

      [row1, row2, row3].forEach((r) => {
        r.eachCell(
          {
            includeEmpty: true,
          },
          (c) => {
            c.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: {
                argb: "FF184878",
              },
            };

            c.font = {
              color: {
                argb: "FFFFFFFF",
              },
              bold: true,
            };

            c.alignment = {
              vertical: "middle",
              horizontal: "center",
            };

            c.border = {
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
          },
        );
      });

      // ----------------------------------------------------
      // MERGE HEADER
      // ----------------------------------------------------

      worksheet.mergeCells(`A${row1.number}:A${row3.number}`);

      worksheet.mergeCells(`B${row1.number}:B${row3.number}`);

      worksheet.mergeCells(`C${row1.number}:C${row3.number}`);

      worksheet.mergeCells(`D${row1.number}:I${row1.number}`);

      worksheet.mergeCells(`J${row1.number}:O${row1.number}`);

      worksheet.mergeCells(`P${row1.number}:P${row3.number}`);

      worksheet.mergeCells(`D${row2.number}:E${row2.number}`);

      worksheet.mergeCells(`F${row2.number}:G${row2.number}`);

      worksheet.mergeCells(`H${row2.number}:I${row2.number}`);

      worksheet.mergeCells(`J${row2.number}:K${row2.number}`);

      worksheet.mergeCells(`L${row2.number}:M${row2.number}`);

      worksheet.mergeCells(`N${row2.number}:O${row2.number}`);

      // ----------------------------------------------------
      // GROUP TOTAL
      // ----------------------------------------------------

      let gAbtP = 0;
      let gAbtO = 0;
      let gAbtRP = 0;
      let gAbtR = 0;
      let gAbtA = 0;

      let gNonP = 0;
      let gNonO = 0;
      let gNonRP = 0;
      let gNonR = 0;
      let gNonA = 0;

      // ----------------------------------------------------
      // ROW DATA
      // ----------------------------------------------------

      group.rows.forEach((row) => {
        const metrics = getRowMetrics(row);

        const abtP = metrics.abt.paket;

        const abtO = metrics.abt.orang;

        const abtRP = metrics.abt.realisasiPaket;

        const abtR = metrics.abt.realisasiOrang;

        const abtA = metrics.abt.anggaran;

        const nonP = metrics.nonAbt.paket;

        const nonO = metrics.nonAbt.orang;

        const nonRP = metrics.nonAbt.realisasiPaket;

        const nonR = metrics.nonAbt.realisasiOrang;

        const nonA = metrics.nonAbt.anggaran;

        gAbtP += abtP;
        gAbtO += abtO;
        gAbtRP += abtRP;
        gAbtR += abtR;
        gAbtA += abtA;

        gNonP += nonP;
        gNonO += nonO;
        gNonRP += nonRP;
        gNonR += nonR;
        gNonA += nonA;

        const pRow = worksheet.addRow([
          globalNo++,
          row.kode,
          row.ro,

          // ABT TARGET
          isProd ? "-" : abtP,
          abtO,

          // ABT REALISASI
          isProd ? "-" : abtRP,
          abtR,

          // ABT CAPAIAN
          `${hitungPersen(abtRP, abtP)}%`,
          `${hitungPersen(abtR, abtO)}%`,

          // NON-ABT TARGET
          isProd ? "-" : nonP,
          nonO,

          // NON-ABT REALISASI
          isProd ? "-" : nonRP,
          nonR,

          // NON-ABT CAPAIAN
          `${hitungPersen(nonRP, nonP)}%`,
          `${hitungPersen(nonR, nonO)}%`,

          // TOTAL
          abtA + nonA,
        ]);

        applyBorder(pRow, [16]);

        if (row.subRows.length > 0) {
          pRow.font = {
            bold: true,
          };

          pRow.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: {
              argb: "FFF0F8FF",
            },
          };
        }

        // ------------------------------------------------
        // SUB ROW
        // ------------------------------------------------

        row.subRows.forEach((sub) => {
          const sRow = worksheet.addRow([
            "",
            sub.kode,
            `    ↳ ${sub.ro}`,

            // ABT TARGET
            isProd ? "-" : sub.abt.paket,

            sub.abt.orang,

            // ABT REALISASI
            isProd ? "-" : sub.abt.realisasiPaket,

            sub.abt.realisasiOrang,

            // ABT CAPAIAN
            `${hitungPersen(sub.abt.realisasiPaket, sub.abt.paket)}%`,

            `${hitungPersen(sub.abt.realisasiOrang, sub.abt.orang)}%`,

            // NON-ABT TARGET
            isProd ? "-" : sub.nonAbt.paket,

            sub.nonAbt.orang,

            // NON-ABT REALISASI
            isProd ? "-" : sub.nonAbt.realisasiPaket,

            sub.nonAbt.realisasiOrang,

            // NON-ABT CAPAIAN
            `${hitungPersen(sub.nonAbt.realisasiPaket, sub.nonAbt.paket)}%`,

            `${hitungPersen(sub.nonAbt.realisasiOrang, sub.nonAbt.orang)}%`,

            // TOTAL
            sub.abt.anggaran + sub.nonAbt.anggaran,
          ]);

          applyBorder(sRow, [16]);
        });
      });

      // ----------------------------------------------------
      // GROUP TOTAL ROW
      // ----------------------------------------------------

      const tRow = worksheet.addRow([
        "",
        "",
        `TOTAL ${group.groupName.toUpperCase()}`,

        // ABT TARGET
        isProd ? "-" : gAbtP,
        gAbtO,

        // ABT REALISASI
        isProd ? "-" : gAbtRP,
        gAbtR,

        // ABT CAPAIAN
        `${hitungPersen(gAbtRP, gAbtP)}%`,
        `${hitungPersen(gAbtR, gAbtO)}%`,

        // NON-ABT TARGET
        isProd ? "-" : gNonP,
        gNonO,

        // NON-ABT REALISASI
        isProd ? "-" : gNonRP,
        gNonR,

        // NON-ABT CAPAIAN
        `${hitungPersen(gNonRP, gNonP)}%`,
        `${hitungPersen(gNonR, gNonO)}%`,

        // TOTAL
        gAbtA + gNonA,
      ]);

      worksheet.mergeCells(`A${tRow.number}:C${tRow.number}`);

      tRow.eachCell(
        {
          includeEmpty: true,
        },
        (cell, col) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: {
              argb: "FFFFE4B5",
            },
          };

          cell.font = {
            bold: true,
            color: {
              argb: "FF8B4513",
            },
          };

          cell.alignment = {
            vertical: "middle",
            horizontal: col === 16 ? "right" : "center",
          };
        },
      );

      worksheet.addRow([]);
    });

    // ========================================================
    // TOTAL SELURUH MODUL
    // ========================================================

    const modulGrandRow = worksheet.addRow([
      "",
      "",
      "TOTAL KESELURUHAN (MODUL)",

      // ABT TARGET
      grandTotalAbtP,
      grandTotalAbtO,

      // ABT REALISASI
      grandTotalAbtRP,
      grandTotalAbtR,

      // ABT CAPAIAN
      `${hitungPersen(grandTotalAbtRP, grandTotalAbtP)}%`,
      `${hitungPersen(grandTotalAbtR, grandTotalAbtO)}%`,

      // NON-ABT TARGET
      grandTotalNonP,
      grandTotalNonO,

      // NON-ABT REALISASI
      grandTotalNonRP,
      grandTotalNonR,

      // NON-ABT CAPAIAN
      `${hitungPersen(grandTotalNonRP, grandTotalNonP)}%`,
      `${hitungPersen(grandTotalNonR, grandTotalNonO)}%`,

      // TOTAL
      totalModul,
    ]);

    worksheet.mergeCells(`A${modulGrandRow.number}:C${modulGrandRow.number}`);

    modulGrandRow.eachCell(
      {
        includeEmpty: true,
      },
      (cell, colNum) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: {
            argb: "FF15406A",
          },
        };

        cell.font = {
          bold: true,
          color: {
            argb: "FFFFFFFF",
          },
        };

        cell.alignment = {
          vertical: "middle",
          horizontal: colNum === 16 ? "right" : "center",
        };
      },
    );

    worksheet.addRow([]);

    // ========================================================
    // ANGGARAN LAINNYA
    // ========================================================

    if (lainnyaData.length > 0) {
      const titleLainnya = worksheet.addRow(["", "", "ANGGARAN LAINNYA", "", "", "", "", "", "", "", "", "", "", "", "", ""]);

      worksheet.mergeCells(`A${titleLainnya.number}:P${titleLainnya.number}`);

      titleLainnya.getCell(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: "FF10B981",
        },
      };

      titleLainnya.getCell(1).font = {
        bold: true,
        color: {
          argb: "FFFFFFFF",
        },
      };

      titleLainnya.getCell(1).alignment = {
        vertical: "middle",
        horizontal: "center",
      };

      // ----------------------------------------------------
      // HEADER ANGGARAN LAINNYA
      // ----------------------------------------------------

      const lainnyaHeader = worksheet.addRow(["NO.", "-", "Keterangan", "Anggaran (Rp.)", "Realisasi (Rp.)", "Persentase (%)", "", "", "", "", "", "", "", "", "", ""]);

      worksheet.mergeCells(`D${lainnyaHeader.number}:N${lainnyaHeader.number}`);

      worksheet.mergeCells(`F${lainnyaHeader.number}:P${lainnyaHeader.number}`);

      lainnyaHeader.eachCell(
        {
          includeEmpty: true,
        },
        (cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: {
              argb: "FF047857",
            },
          };

          cell.font = {
            bold: true,
            color: {
              argb: "FFFFFFFF",
            },
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
        },
      );

      lainnyaData.forEach((item, idx) => {
        const anggaran = Number(item.anggaran || 0);

        const realisasi = getRealisasiLainnya(item);

        const persentase = hitungPersen(realisasi, anggaran);

        const lRow = worksheet.addRow([idx + 1, "-", item.nama_modul, anggaran, realisasi, `${persentase}%`, "", "", "", "", "", "", "", "", "", ""]);

        worksheet.mergeCells(`F${lRow.number}:P${lRow.number}`);

        lRow.getCell(6).value = `${persentase}%`;

        lRow.getCell(4).numFmt = "#,##0";

        lRow.getCell(5).numFmt = "#,##0";

        lRow.getCell(6).alignment = {
          horizontal: "center",
        };

        applyBorder(lRow, [4, 5]);
      });

      // ----------------------------------------------------
      // TOTAL ANGGARAN LAINNYA
      // ----------------------------------------------------

      const lainnyaTotalRow = worksheet.addRow(["", "", "TOTAL ANGGARAN LAINNYA", totalLainnya, totalRealisasiLainnya, `${persentaseLainnya}%`, "", "", "", "", "", "", "", "", "", ""]);

      worksheet.mergeCells(`A${lainnyaTotalRow.number}:C${lainnyaTotalRow.number}`);

      worksheet.mergeCells(`F${lainnyaTotalRow.number}:P${lainnyaTotalRow.number}`);

      lainnyaTotalRow.eachCell(
        {
          includeEmpty: true,
        },
        (cell, col) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: {
              argb: "FFD1FAE5",
            },
          };

          cell.font = {
            bold: true,
            color: {
              argb: "FF065F46",
            },
          };

          cell.alignment = {
            vertical: "middle",
            horizontal: col === 4 || col === 5 ? "right" : "center",
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
        },
      );
    }

    // ========================================================
    // GRAND TOTAL
    // ========================================================

    worksheet.addRow([]);

    const superRow = worksheet.addRow(["", "", "GRAND TOTAL KESELURUHAN ANGGARAN (MODUL + LAINNYA)", "", "", "", "", "", "", "", "", "", "", "", "", superGrandTotal]);

    worksheet.mergeCells(`A${superRow.number}:O${superRow.number}`);

    superRow.eachCell(
      {
        includeEmpty: true,
      },
      (cell, col) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: {
            argb: "FFF59E0B",
          },
        };

        cell.font = {
          bold: true,
          color: {
            argb: "FFFFFFFF",
          },
        };

        cell.alignment = {
          vertical: "middle",
          horizontal: col === 16 ? "right" : "right",
        };
      },
    );

    // ========================================================
    // DOWNLOAD
    // ========================================================

    const buffer = await workbook.xlsx.writeBuffer();

    saveAs(new Blob([buffer]), "Rekapan_Dashboard_SIMPVN.xlsx");
  };

  // ============================================================
  // GLOBAL ROW NUMBER
  // ============================================================

  let globalRowNumber = 1;

  // ============================================================
  // RENDER STANDARD GROUP
  // ============================================================

  const renderStandardGroup = (group: DashboardGroupData) => {
    let groupAbtP = 0;
    let groupAbtO = 0;
    let groupAbtRP = 0;
    let groupAbtR = 0;
    let groupAbtA = 0;

    let groupNonP = 0;
    let groupNonO = 0;
    let groupNonRP = 0;
    let groupNonR = 0;
    let groupNonA = 0;

    const isProd = group.groupName.toLowerCase() === "produktivitas";

    return (
      <div key={group.groupName} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        {/* ====================================================
            GROUP HEADER
        ==================================================== */}

        <div className="bg-[#15406A] px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white uppercase tracking-wide">{group.groupName}</h2>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm text-left border-collapse min-w-max">
            {/* ==================================================
                TABLE HEADER
            ================================================== */}

            <thead className="bg-[#184878] text-white">
              <tr>
                <th rowSpan={3} className="border border-[#1a4e82] px-4 py-3 text-center w-12">
                  NO.
                </th>

                <th rowSpan={3} className="border border-[#1a4e82] px-4 py-3 w-32">
                  KODE
                </th>

                <th rowSpan={3} className="border border-[#1a4e82] px-4 py-3 w-[300px]">
                  Rincian Output (RO)
                </th>

                <th colSpan={6} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#1c548c]">
                  ABT
                </th>

                <th colSpan={6} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#153a5e]">
                  NON-ABT
                </th>

                <th rowSpan={3} className="border border-[#1a4e82] px-4 py-3 text-center w-40 bg-[#12304d]">
                  Total Anggaran
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

                <th colSpan={2} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#194269]">
                  Target
                </th>

                <th colSpan={2} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#194269]">
                  Realisasi
                </th>

                <th colSpan={2} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#194269]">
                  Capaian (%)
                </th>
              </tr>

              <tr>
                <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#2870b8] w-16">{isProd ? "-" : "Paket"}</th>

                <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#2870b8] w-16">Orang</th>

                <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#2870b8] w-16">{isProd ? "-" : "Paket"}</th>

                <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#2870b8] w-16">Orang</th>

                <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#2870b8] w-16">Paket</th>

                <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#2870b8] w-16">Orang</th>

                <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#1c4b78] w-16">{isProd ? "-" : "Paket"}</th>

                <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#1c4b78] w-16">Orang</th>

                <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#1c4b78] w-16">{isProd ? "-" : "Paket"}</th>

                <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#1c4b78] w-16">Orang</th>

                <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#1c4b78] w-16">Paket</th>

                <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#1c4b78] w-16">Orang</th>
              </tr>
            </thead>

            {/* ==================================================
                TABLE BODY
            ================================================== */}

            <tbody className="text-gray-700">
              {group.rows.map((row) => {
                const hasSub = row.subRows.length > 0;

                const metrics = getRowMetrics(row);

                const abtP = metrics.abt.paket;

                const abtO = metrics.abt.orang;

                const abtRP = metrics.abt.realisasiPaket;

                const abtR = metrics.abt.realisasiOrang;

                const abtA = metrics.abt.anggaran;

                const nonP = metrics.nonAbt.paket;

                const nonO = metrics.nonAbt.orang;

                const nonRP = metrics.nonAbt.realisasiPaket;

                const nonR = metrics.nonAbt.realisasiOrang;

                const nonA = metrics.nonAbt.anggaran;

                groupAbtP += abtP;
                groupAbtO += abtO;
                groupAbtRP += abtRP;
                groupAbtR += abtR;
                groupAbtA += abtA;

                groupNonP += nonP;
                groupNonO += nonO;
                groupNonRP += nonRP;
                groupNonR += nonR;
                groupNonA += nonA;

                const curRowNumber = globalRowNumber++;

                return (
                  <Fragment key={row.id}>
                    {/* ========================================
                          PARENT ROW
                      ======================================== */}

                    <tr className={`border-b border-gray-200 transition-colors ${hasSub ? "bg-blue-50/40 font-semibold text-[#15406A]" : "hover:bg-slate-50"}`}>
                      <td className="border-r border-gray-200 px-4 py-2 text-center">{curRowNumber}</td>

                      <td className="border-r border-gray-200 px-4 py-2">{row.kode}</td>

                      <td className="border-r border-gray-200 px-4 py-2">{row.ro}</td>

                      {/* ABT TARGET */}

                      <td className="border-r border-gray-200 px-3 py-2 text-center">{isProd ? "-" : abtP || "-"}</td>

                      <td className="border-r border-gray-200 px-3 py-2 text-center">{abtO || "-"}</td>

                      {/* ABT REALISASI */}

                      <td className="border-r border-gray-200 px-3 py-2 text-center">{isProd ? "-" : abtRP || "-"}</td>

                      <td className="border-r border-gray-200 px-3 py-2 text-center">{abtR || "-"}</td>

                      {/* ABT CAPAIAN */}

                      <td className="border-r border-gray-200 px-3 py-2 text-center">{hitungPersen(abtRP, abtP)}%</td>

                      <td className="border-r border-gray-200 px-3 py-2 text-center">{hitungPersen(abtR, abtO)}%</td>

                      {/* NON ABT TARGET */}

                      <td className="border-r border-gray-200 px-3 py-2 text-center bg-gray-50/50">{isProd ? "-" : nonP || "-"}</td>

                      <td className="border-r border-gray-200 px-3 py-2 text-center bg-gray-50/50">{nonO || "-"}</td>

                      {/* NON ABT REALISASI */}

                      <td className="border-r border-gray-200 px-3 py-2 text-center bg-gray-50/50">{isProd ? "-" : nonRP || "-"}</td>

                      <td className="border-r border-gray-200 px-3 py-2 text-center bg-gray-50/50">{nonR || "-"}</td>

                      {/* NON ABT CAPAIAN */}

                      <td className="border-r border-gray-200 px-3 py-2 text-center bg-gray-50/50">{hitungPersen(nonRP, nonP)}%</td>

                      <td className="border-r border-gray-200 px-3 py-2 text-center bg-gray-50/50">{hitungPersen(nonR, nonO)}%</td>

                      {/* TOTAL */}

                      <td className="px-4 py-2 text-right bg-amber-50/30 font-bold text-amber-800">{abtA + nonA > 0 ? formatRp(abtA + nonA) : "-"}</td>
                    </tr>

                    {/* ========================================
                          SUB ROW
                      ======================================== */}

                    {row.subRows.map((sub) => (
                      <tr key={sub.id} className="border-b border-gray-100 hover:bg-slate-50 transition-colors text-sm">
                        <td className="border-r border-gray-200 px-4 py-2"></td>

                        <td className="border-r border-gray-200 px-4 py-2">{sub.kode}</td>

                        <td className="border-r border-gray-200 px-4 py-2 relative">
                          <div className="absolute left-2 top-2.5 text-gray-300 pointer-events-none">
                            <CornerDownRight className="w-4 h-4" />
                          </div>

                          <span className="pl-6">{sub.ro}</span>
                        </td>

                        {/* ABT TARGET */}

                        <td className="border-r border-gray-200 px-3 py-2 text-center text-gray-500">{isProd ? "-" : sub.abt.paket || "-"}</td>

                        <td className="border-r border-gray-200 px-3 py-2 text-center text-gray-500">{sub.abt.orang || "-"}</td>

                        {/* ABT REALISASI */}

                        <td className="border-r border-gray-200 px-3 py-2 text-center text-gray-500">{isProd ? "-" : sub.abt.realisasiPaket || "-"}</td>

                        <td className="border-r border-gray-200 px-3 py-2 text-center text-gray-500">{sub.abt.realisasiOrang || "-"}</td>

                        {/* ABT CAPAIAN */}

                        <td className="border-r border-gray-200 px-3 py-2 text-center text-[#15406A]">{hitungPersen(sub.abt.realisasiPaket, sub.abt.paket)}%</td>

                        <td className="border-r border-gray-200 px-3 py-2 text-center text-[#15406A]">{hitungPersen(sub.abt.realisasiOrang, sub.abt.orang)}%</td>

                        {/* NON ABT TARGET */}

                        <td className="border-r border-gray-200 px-3 py-2 text-center bg-gray-50/50 text-gray-500">{isProd ? "-" : sub.nonAbt.paket || "-"}</td>

                        <td className="border-r border-gray-200 px-3 py-2 text-center bg-gray-50/50 text-gray-500">{sub.nonAbt.orang || "-"}</td>

                        {/* NON ABT REALISASI */}

                        <td className="border-r border-gray-200 px-3 py-2 text-center bg-gray-50/50 text-gray-500">{isProd ? "-" : sub.nonAbt.realisasiPaket || "-"}</td>

                        <td className="border-r border-gray-200 px-3 py-2 text-center bg-gray-50/50 text-gray-500">{sub.nonAbt.realisasiOrang || "-"}</td>

                        {/* NON ABT CAPAIAN */}

                        <td className="border-r border-gray-200 px-3 py-2 text-center bg-gray-50/50 text-[#15406A]">{hitungPersen(sub.nonAbt.realisasiPaket, sub.nonAbt.paket)}%</td>

                        <td className="border-r border-gray-200 px-3 py-2 text-center bg-gray-50/50 text-[#15406A]">{hitungPersen(sub.nonAbt.realisasiOrang, sub.nonAbt.orang)}%</td>

                        {/* TOTAL */}

                        <td className="px-4 py-2 text-right bg-amber-50/30 text-amber-700 font-medium">{sub.abt.anggaran + sub.nonAbt.anggaran > 0 ? formatRp(sub.abt.anggaran + sub.nonAbt.anggaran) : "-"}</td>
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>

            {/* ==================================================
                GROUP FOOTER
            ================================================== */}

            <tfoot className="bg-amber-100 font-bold uppercase text-amber-900 border-b-2 border-white">
              <tr>
                <td colSpan={3} className="border-r border-amber-200 px-4 py-3 text-right">
                  TOTAL {group.groupName}
                </td>

                {/* ABT TARGET */}

                <td className="border-r border-amber-200 px-3 py-3 text-center">{isProd ? "-" : groupAbtP}</td>

                <td className="border-r border-amber-200 px-3 py-3 text-center">{groupAbtO}</td>

                {/* ABT REALISASI */}

                <td className="border-r border-amber-200 px-3 py-3 text-center">{isProd ? "-" : groupAbtRP}</td>

                <td className="border-r border-amber-200 px-3 py-3 text-center">{groupAbtR}</td>

                {/* ABT CAPAIAN */}

                <td className="border-r border-amber-200 px-3 py-3 text-center">{hitungPersen(groupAbtRP, groupAbtP)}%</td>

                <td className="border-r border-amber-200 px-3 py-3 text-center">{hitungPersen(groupAbtR, groupAbtO)}%</td>

                {/* NON-ABT TARGET */}

                <td className="border-r border-amber-200 px-3 py-3 text-center bg-amber-200/40">{isProd ? "-" : groupNonP}</td>

                <td className="border-r border-amber-200 px-3 py-3 text-center bg-amber-200/40">{groupNonO}</td>

                {/* NON-ABT REALISASI */}

                <td className="border-r border-amber-200 px-3 py-3 text-center bg-amber-200/40">{isProd ? "-" : groupNonRP}</td>

                <td className="border-r border-amber-200 px-3 py-3 text-center bg-amber-200/40">{groupNonR}</td>

                {/* NON-ABT CAPAIAN */}

                <td className="border-r border-amber-200 px-3 py-3 text-center bg-amber-200/40">{hitungPersen(groupNonRP, groupNonP)}%</td>

                <td className="border-r border-amber-200 px-3 py-3 text-center bg-amber-200/40">{hitungPersen(groupNonR, groupNonO)}%</td>

                {/* TOTAL ANGGARAN */}

                <td className="px-4 py-3 text-right bg-amber-400 text-white shadow-inner">{formatRp(groupAbtA + groupNonA)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-6">
      {/* ======================================================
          BUTTON EXCEL
      ====================================================== */}

      <div className="flex justify-end">
        <button onClick={handleDownloadExcel} className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-5 py-2.5 rounded-xl font-bold border border-emerald-200 transition-all hover:bg-emerald-100 shadow-sm hover:shadow">
          <Download className="w-5 h-5" />
          Cetak Excel Rekapan
        </button>
      </div>

      {/* ======================================================
          SEMUA GROUP
      ====================================================== */}

      {data.map((group) => renderStandardGroup(group))}

      {/* ======================================================
          TOTAL KESELURUHAN MODUL
      ====================================================== */}

      {data.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border-2 border-[#1a4e82] overflow-hidden mb-8">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm text-left border-collapse min-w-max">
              <thead className="bg-[#15406A] text-white">
                <tr>
                  <th rowSpan={3} className="border border-[#1a4e82] px-4 py-3 text-center w-12">
                    NO.
                  </th>

                  <th rowSpan={3} className="border border-[#1a4e82] px-4 py-3 w-32">
                    KODE
                  </th>

                  <th rowSpan={3} className="border border-[#1a4e82] px-4 py-3 w-[300px]">
                    Rincian Output (RO)
                  </th>

                  <th colSpan={6} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#184878]">
                    ABT
                  </th>

                  <th colSpan={6} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#153a5e]">
                    NON-ABT
                  </th>

                  <th rowSpan={3} className="border border-[#1a4e82] px-4 py-3 text-center w-40 bg-[#12304d]">
                    Total Anggaran
                  </th>
                </tr>

                <tr>
                  <th colSpan={2} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#1c548c]">
                    Target
                  </th>

                  <th colSpan={2} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#1c548c]">
                    Realisasi
                  </th>

                  <th colSpan={2} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#1c548c]">
                    Capaian (%)
                  </th>

                  <th colSpan={2} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#194269]">
                    Target
                  </th>

                  <th colSpan={2} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#194269]">
                    Realisasi
                  </th>

                  <th colSpan={2} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#194269]">
                    Capaian (%)
                  </th>
                </tr>

                <tr>
                  <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#2060a0] w-16">Paket</th>

                  <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#2060a0] w-16">Orang</th>

                  <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#2060a0] w-16">Paket</th>

                  <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#2060a0] w-16">Orang</th>

                  <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#2060a0] w-16">Paket</th>

                  <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#2060a0] w-16">Orang</th>

                  <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#1c4b78] w-16">Paket</th>

                  <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#1c4b78] w-16">Orang</th>

                  <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#1c4b78] w-16">Paket</th>

                  <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#1c4b78] w-16">Orang</th>

                  <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#1c4b78] w-16">Paket</th>

                  <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#1c4b78] w-16">Orang</th>
                </tr>
              </thead>

              <tbody className="bg-[#15406A] text-white font-bold tracking-wide">
                <tr>
                  <td colSpan={3} className="border-r border-[#1a4e82] px-4 py-5 text-right uppercase text-[15px]">
                    TOTAL KESELURUHAN
                  </td>

                  {/* ABT TARGET */}

                  <td className="border-r border-[#1a4e82] px-3 py-5 text-center">{grandTotalAbtP}</td>

                  <td className="border-r border-[#1a4e82] px-3 py-5 text-center text-blue-200">{grandTotalAbtO}</td>

                  {/* ABT REALISASI */}

                  <td className="border-r border-[#1a4e82] px-3 py-5 text-center">{grandTotalAbtRP}</td>

                  <td className="border-r border-[#1a4e82] px-3 py-5 text-center">{grandTotalAbtR}</td>

                  {/* ABT CAPAIAN */}

                  <td className="border-r border-[#1a4e82] px-3 py-5 text-center text-emerald-300">{hitungPersen(grandTotalAbtRP, grandTotalAbtP)}%</td>

                  <td className="border-r border-[#1a4e82] px-3 py-5 text-center text-emerald-300">{hitungPersen(grandTotalAbtR, grandTotalAbtO)}%</td>

                  {/* NON-ABT TARGET */}

                  <td className="border-r border-[#1a4e82] px-3 py-5 text-center bg-[#12304d]">{grandTotalNonP}</td>

                  <td className="border-r border-[#1a4e82] px-3 py-5 text-center bg-[#12304d] text-blue-200">{grandTotalNonO}</td>

                  {/* NON-ABT REALISASI */}

                  <td className="border-r border-[#1a4e82] px-3 py-5 text-center bg-[#12304d]">{grandTotalNonRP}</td>

                  <td className="border-r border-[#1a4e82] px-3 py-5 text-center bg-[#12304d]">{grandTotalNonR}</td>

                  {/* NON-ABT CAPAIAN */}

                  <td className="border-r border-[#1a4e82] px-3 py-5 text-center bg-[#12304d] text-emerald-300">{hitungPersen(grandTotalNonRP, grandTotalNonP)}%</td>

                  <td className="border-r border-[#1a4e82] px-3 py-5 text-center bg-[#12304d] text-emerald-300">{hitungPersen(grandTotalNonR, grandTotalNonO)}%</td>

                  <td className="px-4 py-5 text-right bg-amber-500 shadow-inner text-[15px]">{formatRp(totalModul)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================
          ANGGARAN LAINNYA
      ====================================================== */}

      {lainnyaData.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-emerald-200 overflow-hidden mb-8">
          <div className="bg-emerald-700 px-6 py-4">
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">Anggaran Lainnya</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-emerald-800 text-emerald-50">
                <tr>
                  <th className="border-y border-emerald-900 px-4 py-3 text-center w-16">NO.</th>

                  <th className="border-y border-emerald-900 px-4 py-3 text-center w-32">-</th>

                  <th className="border-y border-emerald-900 px-4 py-3 w-[300px]">Keterangan</th>

                  <th className="border-y border-emerald-900 px-4 py-3 text-right w-40">Anggaran (Rp.)</th>

                  <th className="border-y border-emerald-900 px-4 py-3 text-right w-40">Realisasi (Rp.)</th>

                  <th className="border-y border-emerald-900 px-4 py-3 text-center w-32">Persentase (%)</th>
                </tr>
              </thead>

              <tbody className="text-gray-700">
                {lainnyaData.map((item, idx) => {
                  const anggaran = Number(item.anggaran || 0);

                  const realisasi = getRealisasiLainnya(item);

                  const persentase = hitungPersen(realisasi, anggaran);

                  return (
                    <tr key={item.id} className="border-b border-emerald-50 hover:bg-emerald-50/50 transition-colors">
                      <td className="border-r border-emerald-50 px-4 py-3 text-center font-semibold">{idx + 1}</td>

                      <td className="border-r border-emerald-50 px-4 py-3 text-center text-gray-400">-</td>

                      <td className="border-r border-emerald-50 px-4 py-3 font-medium text-emerald-900">{item.nama_modul}</td>

                      <td className="border-r border-emerald-50 px-4 py-3 text-right font-bold text-emerald-700 bg-emerald-50/30">{formatRp(anggaran)}</td>

                      <td className="border-r border-emerald-50 px-4 py-3 text-right font-bold text-blue-700 bg-emerald-50/30">{formatRp(realisasi)}</td>

                      <td className="px-4 py-3 text-center font-bold text-emerald-700 bg-emerald-50/30">{persentase}%</td>
                    </tr>
                  );
                })}
              </tbody>

              <tfoot className="bg-emerald-100 font-bold uppercase text-emerald-900 border-t-2 border-white">
                <tr>
                  <td colSpan={3} className="px-4 py-4 text-right">
                    TOTAL ANGGARAN LAINNYA
                  </td>

                  <td className="px-4 py-4 text-right text-emerald-800">{formatRp(totalLainnya)}</td>

                  <td className="px-4 py-4 text-right text-blue-800">{formatRp(totalRealisasiLainnya)}</td>

                  <td className="px-4 py-4 text-center text-emerald-800">{persentaseLainnya}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================
          GRAND TOTAL
      ====================================================== */}

      <div className="mt-8 bg-gradient-to-br from-[#15406A] to-[#1e5891] rounded-2xl shadow-xl border border-blue-800 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.64-2.25 1.64-1.74 0-2.1-.96-2.17-1.92H8.01c.08 1.84 1.25 2.92 2.89 3.28V19h2.38v-1.63c1.5-.28 2.86-1.12 2.86-2.8 0-2.31-1.34-2.57-3.03-2.57z" />
          </svg>
        </div>

        <div className="p-8 sm:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div>
            <h3 className="text-blue-200 font-bold tracking-widest text-sm mb-2 uppercase">Rekapitulasi Akhir</h3>

            <h2 className="text-2xl sm:text-3xl font-black text-white">GRAND TOTAL KESELURUHAN</h2>

            <p className="text-blue-100/70 text-sm mt-2 max-w-md">Kalkulasi akhir dari seluruh Modul Anggaran (ABT & NON-ABT) ditambah dengan Anggaran Lainnya.</p>
          </div>

          <div className="bg-black/20 backdrop-blur-sm border border-white/10 p-6 rounded-2xl md:text-right min-w-[300px]">
            <p className="text-blue-200 text-sm font-semibold mb-1 uppercase">Total Anggaran (Rp)</p>

            <p className="text-3xl sm:text-5xl font-black text-amber-400 drop-shadow-md">{formatRp(superGrandTotal)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
