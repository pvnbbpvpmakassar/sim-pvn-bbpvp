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
  realisasiAnggaran: number;
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

  const [lainnyaData, setLainnyaData] = useState<AlokasiRowData[]>([]);

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
        realisasiAnggaran: total.realisasiAnggaran + sub.abt.realisasiAnggaran,
      }),
      {
        paket: 0,
        orang: 0,
        realisasiPaket: 0,
        realisasiOrang: 0,
        anggaran: 0,
        realisasiAnggaran: 0,
      },
    );

    const nonAbt = row.subRows.reduce(
      (total, sub) => ({
        paket: total.paket + sub.nonAbt.paket,
        orang: total.orang + sub.nonAbt.orang,
        realisasiPaket: total.realisasiPaket + sub.nonAbt.realisasiPaket,
        realisasiOrang: total.realisasiOrang + sub.nonAbt.realisasiOrang,
        anggaran: total.anggaran + sub.nonAbt.anggaran,
        realisasiAnggaran: total.realisasiAnggaran + sub.nonAbt.realisasiAnggaran,
      }),
      {
        paket: 0,
        orang: 0,
        realisasiPaket: 0,
        realisasiOrang: 0,
        anggaran: 0,
        realisasiAnggaran: 0,
      },
    );

    return {
      abt,
      nonAbt,
    };
  };

  let grandTotalAbtP = 0;
  let grandTotalAbtO = 0;
  let grandTotalAbtRP = 0;
  let grandTotalAbtR = 0;
  let grandTotalAbtA = 0;
  let grandTotalAbtRA = 0;
  let grandTotalNonP = 0;
  let grandTotalNonO = 0;
  let grandTotalNonRP = 0;
  let grandTotalNonR = 0;
  let grandTotalNonA = 0;
  let grandTotalNonRA = 0;

  data.forEach((group) => {
    group.rows.forEach((row) => {
      const metrics = getRowMetrics(row);
      grandTotalAbtP += metrics.abt.paket;
      grandTotalAbtO += metrics.abt.orang;
      grandTotalAbtRP += metrics.abt.realisasiPaket;
      grandTotalAbtR += metrics.abt.realisasiOrang;
      grandTotalAbtA += metrics.abt.anggaran;
      grandTotalAbtRA += metrics.abt.realisasiAnggaran;
      grandTotalNonP += metrics.nonAbt.paket;
      grandTotalNonO += metrics.nonAbt.orang;
      grandTotalNonRP += metrics.nonAbt.realisasiPaket;
      grandTotalNonR += metrics.nonAbt.realisasiOrang;
      grandTotalNonA += metrics.nonAbt.anggaran;
      grandTotalNonRA += metrics.nonAbt.realisasiAnggaran;
    });
  });

  const totalModul = grandTotalAbtA + grandTotalNonA;
  const totalRealisasiModul = grandTotalAbtRA + grandTotalNonRA;
  const persentaseModul = hitungPersen(totalRealisasiModul, totalModul);
  const totalLainnya = lainnyaData.reduce((sum, item) => sum + Number(item.anggaran || 0), 0);
  const totalRealisasiLainnya = lainnyaData.reduce((sum, item) => sum + getRealisasiLainnya(item), 0);
  const persentaseLainnya = hitungPersen(totalRealisasiLainnya, totalLainnya);
  const superGrandTotal = totalModul + totalLainnya;
  const superGrandRealisasi = totalRealisasiModul + totalRealisasiLainnya;
  const superGrandPersentase = hitungPersen(superGrandRealisasi, superGrandTotal);

  const handleDownloadExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Rekapan Dashboard");

    worksheet.columns = [
      { width: 6 },
      { width: 16 },
      { width: 45 },

      { width: 12 },
      { width: 12 },
      { width: 14 },
      { width: 14 },
      { width: 14 },
      { width: 14 },
      { width: 18 },
      { width: 18 },
      { width: 16 },

      // NON-ABT
      { width: 12 },
      { width: 12 },
      { width: 14 },
      { width: 14 },
      { width: 14 },
      { width: 14 },
      { width: 18 },
      { width: 18 },
      { width: 16 },

      // Total Anggaran
      { width: 18 },
      { width: 18 },
      { width: 16 },
    ];

    const applyBorder = (row: ExcelJS.Row, alignRightCols: number[] = []) => {
      row.eachCell(
        { includeEmpty: true },
        (cell, colNumber) => {
          cell.border = {
            top: { style: "thin", color: { argb: "FFCCCCCC" } },
            left: { style: "thin", color: { argb: "FFCCCCCC" } },
            bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
            right: { style: "thin", color: { argb: "FFCCCCCC" } },
          };

          cell.alignment = {
            vertical: "middle",
            horizontal: alignRightCols.includes(colNumber)
              ? "right"
              : colNumber === 3
                ? "left"
                : "center",
          };
        },
      );
    };

    const applyHeaderStyle = (row: ExcelJS.Row) => {
      row.eachCell(
        { includeEmpty: true },
        (cell) => {
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
            wrapText: true,
          };
          cell.border = {
            top: { style: "thin", color: { argb: "FFFFFFFF" } },
            left: { style: "thin", color: { argb: "FFFFFFFF" } },
            bottom: { style: "thin", color: { argb: "FFFFFFFF" } },
            right: { style: "thin", color: { argb: "FFFFFFFF" } },
          };
        },
      );
    };

    let globalNo = 1;

    data.forEach((group) => {
      const isProd = group.groupName.toLowerCase() === "produktivitas";

      const groupHeader = worksheet.addRow([
        "",
        "",
        `REKAPITULASI: ${group.groupName.toUpperCase()}`,
        ...Array(21).fill(""),
      ]);

      worksheet.mergeCells(`A${groupHeader.number}:X${groupHeader.number}`);

      groupHeader.getCell(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF15406A" },
      };
      groupHeader.getCell(1).font = {
        color: { argb: "FFFFFFFF" },
        bold: true,
      };
      groupHeader.getCell(1).alignment = {
        vertical: "middle",
        horizontal: "center",
      };

      const row1 = worksheet.addRow([
        "NO.",
        "KODE",
        "RINCIAN OUTPUT (RO)",
        "ABT", "", "", "", "", "", "", "", "",
        "NON-ABT", "", "", "", "", "", "", "", "",
        "Total Anggaran", "", "",
      ]);

      const row2 = worksheet.addRow([
        "",
        "",
        "",
        "Target", "",
        "Realisasi", "",
        "Capaian (%)", "",
        "Anggaran", "", "",
        "Target", "",
        "Realisasi", "",
        "Capaian (%)", "",
        "Anggaran", "", "",
        "Anggaran", "", "",
      ]);

      const row3 = worksheet.addRow([
        "",
        "",
        "",
        isProd ? "-" : "Paket",
        "Orang",
        isProd ? "-" : "Paket",
        "Orang",
        "Paket",
        "Orang",
        "Alokasi",
        "Realisasi",
        "Persentase (%)",
        isProd ? "-" : "Paket",
        "Orang",
        isProd ? "-" : "Paket",
        "Orang",
        "Paket",
        "Orang",
        "Alokasi",
        "Realisasi",
        "Persentase (%)",
        "Alokasi",
        "Realisasi",
        "Persentase (%)",
      ]);

      [row1, row2, row3].forEach(applyHeaderStyle);

      worksheet.mergeCells(`A${row1.number}:A${row3.number}`);
      worksheet.mergeCells(`B${row1.number}:B${row3.number}`);
      worksheet.mergeCells(`C${row1.number}:C${row3.number}`);

      worksheet.mergeCells(`D${row1.number}:L${row1.number}`);
      worksheet.mergeCells(`M${row1.number}:U${row1.number}`);
      worksheet.mergeCells(`V${row1.number}:X${row1.number}`);

      worksheet.mergeCells(`D${row2.number}:E${row2.number}`);
      worksheet.mergeCells(`F${row2.number}:G${row2.number}`);
      worksheet.mergeCells(`H${row2.number}:I${row2.number}`);
      worksheet.mergeCells(`J${row2.number}:L${row2.number}`);

      worksheet.mergeCells(`M${row2.number}:N${row2.number}`);
      worksheet.mergeCells(`O${row2.number}:P${row2.number}`);
      worksheet.mergeCells(`Q${row2.number}:R${row2.number}`);
      worksheet.mergeCells(`S${row2.number}:U${row2.number}`);

      worksheet.mergeCells(`V${row2.number}:X${row2.number}`);

      let gAbtP = 0;
      let gAbtO = 0;
      let gAbtRP = 0;
      let gAbtR = 0;
      let gAbtA = 0;
      let gAbtRA = 0;

      let gNonP = 0;
      let gNonO = 0;
      let gNonRP = 0;
      let gNonR = 0;
      let gNonA = 0;
      let gNonRA = 0;

      group.rows.forEach((row) => {
        const metrics = getRowMetrics(row);

        const abtP = metrics.abt.paket;
        const abtO = metrics.abt.orang;
        const abtRP = metrics.abt.realisasiPaket;
        const abtR = metrics.abt.realisasiOrang;
        const abtA = metrics.abt.anggaran;
        const abtRA = metrics.abt.realisasiAnggaran;

        const nonP = metrics.nonAbt.paket;
        const nonO = metrics.nonAbt.orang;
        const nonRP = metrics.nonAbt.realisasiPaket;
        const nonR = metrics.nonAbt.realisasiOrang;
        const nonA = metrics.nonAbt.anggaran;
        const nonRA = metrics.nonAbt.realisasiAnggaran;

        gAbtP += abtP;
        gAbtO += abtO;
        gAbtRP += abtRP;
        gAbtR += abtR;
        gAbtA += abtA;
        gAbtRA += abtRA;

        gNonP += nonP;
        gNonO += nonO;
        gNonRP += nonRP;
        gNonR += nonR;
        gNonA += nonA;
        gNonRA += nonRA;

        const pRow = worksheet.addRow([
          globalNo++,
          row.kode,
          row.ro,

          isProd ? "-" : abtP,
          abtO,
          isProd ? "-" : abtRP,
          abtR,
          `${hitungPersen(abtRP, abtP)}%`,
          `${hitungPersen(abtR, abtO)}%`,
          abtA,
          abtRA,
          `${hitungPersen(abtRA, abtA)}%`,

          isProd ? "-" : nonP,
          nonO,
          isProd ? "-" : nonRP,
          nonR,
          `${hitungPersen(nonRP, nonP)}%`,
          `${hitungPersen(nonR, nonO)}%`,
          nonA,
          nonRA,
          `${hitungPersen(nonRA, nonA)}%`,

          abtA + nonA,
          abtRA + nonRA,
          `${hitungPersen(abtRA + nonRA, abtA + nonA)}%`,
        ]);

        applyBorder(pRow, [10, 11, 19, 20, 22, 23]);

        [10, 11, 19, 20, 22, 23].forEach((col) => {
          pRow.getCell(col).numFmt = "#,##0";
        });

        if (row.subRows.length > 0) {
          pRow.font = { bold: true };
          pRow.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF0F8FF" },
          };
        }

        row.subRows.forEach((sub) => {
          const sRow = worksheet.addRow([
            "",
            sub.kode,
            `    ↳ ${sub.ro}`,

            isProd ? "-" : sub.abt.paket,
            sub.abt.orang,
            isProd ? "-" : sub.abt.realisasiPaket,
            sub.abt.realisasiOrang,
            `${hitungPersen(sub.abt.realisasiPaket, sub.abt.paket)}%`,
            `${hitungPersen(sub.abt.realisasiOrang, sub.abt.orang)}%`,
            sub.abt.anggaran,
            sub.abt.realisasiAnggaran,
            `${hitungPersen(sub.abt.realisasiAnggaran, sub.abt.anggaran)}%`,

            isProd ? "-" : sub.nonAbt.paket,
            sub.nonAbt.orang,
            isProd ? "-" : sub.nonAbt.realisasiPaket,
            sub.nonAbt.realisasiOrang,
            `${hitungPersen(sub.nonAbt.realisasiPaket, sub.nonAbt.paket)}%`,
            `${hitungPersen(sub.nonAbt.realisasiOrang, sub.nonAbt.orang)}%`,
            sub.nonAbt.anggaran,
            sub.nonAbt.realisasiAnggaran,
            `${hitungPersen(sub.nonAbt.realisasiAnggaran, sub.nonAbt.anggaran)}%`,

            sub.abt.anggaran + sub.nonAbt.anggaran,
            sub.abt.realisasiAnggaran + sub.nonAbt.realisasiAnggaran,
            `${hitungPersen(
              sub.abt.realisasiAnggaran + sub.nonAbt.realisasiAnggaran,
              sub.abt.anggaran + sub.nonAbt.anggaran,
            )}%`,
          ]);

          applyBorder(sRow, [10, 11, 19, 20, 22, 23]);

          [10, 11, 19, 20, 22, 23].forEach((col) => {
            sRow.getCell(col).numFmt = "#,##0";
          });
        });
      });

      const tRow = worksheet.addRow([
        "",
        "",
        `TOTAL ${group.groupName.toUpperCase()}`,

        isProd ? "-" : gAbtP,
        gAbtO,
        isProd ? "-" : gAbtRP,
        gAbtR,
        `${hitungPersen(gAbtRP, gAbtP)}%`,
        `${hitungPersen(gAbtR, gAbtO)}%`,
        gAbtA,
        gAbtRA,
        `${hitungPersen(gAbtRA, gAbtA)}%`,

        isProd ? "-" : gNonP,
        gNonO,
        isProd ? "-" : gNonRP,
        gNonR,
        `${hitungPersen(gNonRP, gNonP)}%`,
        `${hitungPersen(gNonR, gNonO)}%`,
        gNonA,
        gNonRA,
        `${hitungPersen(gNonRA, gNonA)}%`,

        gAbtA + gNonA,
        gAbtRA + gNonRA,
        `${hitungPersen(gAbtRA + gNonRA, gAbtA + gNonA)}%`,
      ]);

      worksheet.mergeCells(`A${tRow.number}:C${tRow.number}`);

      tRow.eachCell(
        { includeEmpty: true },
        (cell, col) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFFE4B5" },
          };
          cell.font = {
            bold: true,
            color: { argb: "FF8B4513" },
          };
          cell.alignment = {
            vertical: "middle",
            horizontal: [10, 11, 19, 20, 22, 23].includes(col) ? "right" : "center",
          };
          cell.border = {
            top: { style: "thin", color: { argb: "FFFFFFFF" } },
            left: { style: "thin", color: { argb: "FFFFFFFF" } },
            bottom: { style: "thin", color: { argb: "FFFFFFFF" } },
            right: { style: "thin", color: { argb: "FFFFFFFF" } },
          };
        },
      );

      [10, 11, 19, 20, 22, 23].forEach((col) => {
        tRow.getCell(col).numFmt = "#,##0";
      });

      worksheet.addRow([]);
    });

    const modulGrandRow = worksheet.addRow([
      "",
      "",
      "TOTAL KESELURUHAN (MODUL)",

      grandTotalAbtP,
      grandTotalAbtO,
      grandTotalAbtRP,
      grandTotalAbtR,
      `${hitungPersen(grandTotalAbtRP, grandTotalAbtP)}%`,
      `${hitungPersen(grandTotalAbtR, grandTotalAbtO)}%`,
      grandTotalAbtA,
      grandTotalAbtRA,
      `${hitungPersen(grandTotalAbtRA, grandTotalAbtA)}%`,

      grandTotalNonP,
      grandTotalNonO,
      grandTotalNonRP,
      grandTotalNonR,
      `${hitungPersen(grandTotalNonRP, grandTotalNonP)}%`,
      `${hitungPersen(grandTotalNonR, grandTotalNonO)}%`,
      grandTotalNonA,
      grandTotalNonRA,
      `${hitungPersen(grandTotalNonRA, grandTotalNonA)}%`,

      totalModul,
      totalRealisasiModul,
      `${persentaseModul}%`,
    ]);

    worksheet.mergeCells(`A${modulGrandRow.number}:C${modulGrandRow.number}`);

    modulGrandRow.eachCell(
      { includeEmpty: true },
      (cell, colNum) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF15406A" },
        };
        cell.font = {
          bold: true,
          color: { argb: "FFFFFFFF" },
        };
        cell.alignment = {
          vertical: "middle",
          horizontal: [10, 11, 19, 20, 22, 23].includes(colNum) ? "right" : "center",
        };
      },
    );

    [10, 11, 19, 20, 22, 23].forEach((col) => {
      modulGrandRow.getCell(col).numFmt = "#,##0";
    });

    worksheet.addRow([]);

    if (lainnyaData.length > 0) {
      const titleLainnya = worksheet.addRow([
        "",
        "",
        "ANGGARAN LAINNYA",
        ...Array(21).fill(""),
      ]);

      worksheet.mergeCells(`A${titleLainnya.number}:X${titleLainnya.number}`);

      titleLainnya.getCell(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF10B981" },
      };
      titleLainnya.getCell(1).font = {
        bold: true,
        color: { argb: "FFFFFFFF" },
      };
      titleLainnya.getCell(1).alignment = {
        vertical: "middle",
        horizontal: "center",
      };

      const lainnyaHeader = worksheet.addRow([
        "NO.",
        "-",
        "Keterangan",
        "Anggaran (Rp.)",
        "Realisasi (Rp.)",
        "Persentase (%)",
        ...Array(18).fill(""),
      ]);

      [4, 5, 6].forEach((col) => {
        lainnyaHeader.getCell(col).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF047857" },
        };
      });

      lainnyaHeader.eachCell(
        { includeEmpty: true },
        (cell) => {
          cell.font = {
            bold: true,
            color: { argb: "FFFFFFFF" },
          };
          cell.alignment = {
            vertical: "middle",
            horizontal: "center",
          };
          cell.border = {
            top: { style: "thin", color: { argb: "FFFFFFFF" } },
            left: { style: "thin", color: { argb: "FFFFFFFF" } },
            bottom: { style: "thin", color: { argb: "FFFFFFFF" } },
            right: { style: "thin", color: { argb: "FFFFFFFF" } },
          };
        },
      );

      lainnyaData.forEach((item, idx) => {
        const anggaran = Number(item.anggaran || 0);
        const realisasi = getRealisasiLainnya(item);
        const persentase = hitungPersen(realisasi, anggaran);

        const lRow = worksheet.addRow([
          idx + 1,
          "-",
          item.nama_modul,
          anggaran,
          realisasi,
          `${persentase}%`,
          ...Array(18).fill(""),
        ]);

        lRow.getCell(4).numFmt = "#,##0";
        lRow.getCell(5).numFmt = "#,##0";
        applyBorder(lRow, [4, 5]);
      });

      const lainnyaTotalRow = worksheet.addRow([
        "",
        "",
        "TOTAL ANGGARAN LAINNYA",
        totalLainnya,
        totalRealisasiLainnya,
        `${persentaseLainnya}%`,
        ...Array(18).fill(""),
      ]);

      worksheet.mergeCells(`A${lainnyaTotalRow.number}:C${lainnyaTotalRow.number}`);

      lainnyaTotalRow.eachCell(
        { includeEmpty: true },
        (cell, col) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFD1FAE5" },
          };
          cell.font = {
            bold: true,
            color: { argb: "FF065F46" },
          };
          cell.alignment = {
            vertical: "middle",
            horizontal: [4, 5].includes(col) ? "right" : "center",
          };
        },
      );

      lainnyaTotalRow.getCell(4).numFmt = "#,##0";
      lainnyaTotalRow.getCell(5).numFmt = "#,##0";
    }

    worksheet.addRow([]);

    const grandExcelRow = worksheet.addRow([
      "",
      "",
      "GRAND TOTAL KESELURUHAN",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "Alokasi",
      "Realisasi",
      "Persentase (%)",
    ]);

    worksheet.mergeCells(`A${grandExcelRow.number}:U${grandExcelRow.number}`);
    grandExcelRow.getCell(1).value = "GRAND TOTAL KESELURUHAN";

    grandExcelRow.eachCell(
      { includeEmpty: true },
      (cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF15406A" },
        };
        cell.font = {
          bold: true,
          color: { argb: "FFFFFFFF" },
        };
        cell.alignment = {
          vertical: "middle",
          horizontal: "center",
        };
      },
    );

    grandExcelRow.getCell(22).value = superGrandTotal;
    grandExcelRow.getCell(23).value = superGrandRealisasi;
    grandExcelRow.getCell(24).value = `${superGrandPersentase}%`;

    grandExcelRow.getCell(22).numFmt = "#,##0";
    grandExcelRow.getCell(23).numFmt = "#,##0";

    const buffer = await workbook.xlsx.writeBuffer();

    saveAs(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      "Rekapan-Dashboard.xlsx",
    );
  };

   let globalRowNumber = 1;
  // RENDER STANDARD GROUP
  // ============================================================



  const renderStandardGroup = (group: DashboardGroupData) => {
    let groupAbtP = 0;
    let groupAbtO = 0;
    let groupAbtRP = 0;
    let groupAbtR = 0;
    let groupAbtA = 0;
    let groupAbtRA = 0;

    let groupNonP = 0;
    let groupNonO = 0;
    let groupNonRP = 0;
    let groupNonR = 0;
    let groupNonA = 0;
    let groupNonRA = 0;

    const isProd = group.groupName.toLowerCase() === "produktivitas";

    return (
      <div key={group.groupName} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="bg-[#15406A] px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white uppercase tracking-wide">{group.groupName}</h2>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm text-left border-separate border-spacing-0 min-w-max">
            <thead className="bg-[#184878] text-white">
              <tr>
                <th rowSpan={3} className="sticky left-0 z-40 border border-[#1a4e82] bg-[#184878] px-4 py-3 text-center w-12">NO.</th>
                <th rowSpan={3} className="sticky left-12 z-40 border border-[#1a4e82] bg-[#184878] px-4 py-3 w-32">KODE</th>
                <th rowSpan={3} className="sticky left-[176px] z-40 border border-[#1a4e82] bg-[#184878] px-4 py-3 w-[300px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.25)]">Rincian Output (RO)</th>

                <th colSpan={9} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#1c548c]">ABT</th>
                <th colSpan={9} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#153a5e]">NON-ABT</th>
                <th colSpan={3} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#12304d]">Total Anggaran</th>
              </tr>

              <tr>
                <th colSpan={2} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#2060a0]">Target</th>
                <th colSpan={2} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#2060a0]">Realisasi</th>
                <th colSpan={2} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#2060a0]">Capaian (%)</th>
                <th colSpan={3} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#2060a0]">Anggaran</th>

                <th colSpan={2} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#194269]">Target</th>
                <th colSpan={2} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#194269]">Realisasi</th>
                <th colSpan={2} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#194269]">Capaian (%)</th>
                <th colSpan={3} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#194269]">Anggaran</th>

                <th colSpan={3} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#12304d]">Anggaran</th>
              </tr>

              <tr>
                <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#2870b8] w-16">{isProd ? "-" : "Paket"}</th>
                <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#2870b8] w-16">Orang</th>
                <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#2870b8] w-16">{isProd ? "-" : "Paket"}</th>
                <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#2870b8] w-16">Orang</th>
                <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#2870b8] w-16">Paket</th>
                <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#2870b8] w-16">Orang</th>
                <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#2870b8] w-28">Alokasi</th>
                <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#2870b8] w-28">Realisasi</th>
                <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#2870b8] w-24">Persentase (%)</th>

                <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#1c4b78] w-16">{isProd ? "-" : "Paket"}</th>
                <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#1c4b78] w-16">Orang</th>
                <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#1c4b78] w-16">{isProd ? "-" : "Paket"}</th>
                <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#1c4b78] w-16">Orang</th>
                <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#1c4b78] w-16">Paket</th>
                <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#1c4b78] w-16">Orang</th>
                <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#1c4b78] w-28">Alokasi</th>
                <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#1c4b78] w-28">Realisasi</th>
                <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#1c4b78] w-24">Persentase (%)</th>

                <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#12304d] w-28">Alokasi</th>
                <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#12304d] w-28">Realisasi</th>
                <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#12304d] w-24">Persentase (%)</th>
              </tr>
            </thead>

            <tbody className="text-gray-700">
              {group.rows.map((row) => {
                const hasSub = row.subRows.length > 0;
                const metrics = getRowMetrics(row);

                const abtP = metrics.abt.paket;
                const abtO = metrics.abt.orang;
                const abtRP = metrics.abt.realisasiPaket;
                const abtR = metrics.abt.realisasiOrang;
                const abtA = metrics.abt.anggaran;
                const abtRA = metrics.abt.realisasiAnggaran;

                const nonP = metrics.nonAbt.paket;
                const nonO = metrics.nonAbt.orang;
                const nonRP = metrics.nonAbt.realisasiPaket;
                const nonR = metrics.nonAbt.realisasiOrang;
                const nonA = metrics.nonAbt.anggaran;
                const nonRA = metrics.nonAbt.realisasiAnggaran;

                groupAbtP += abtP;
                groupAbtO += abtO;
                groupAbtRP += abtRP;
                groupAbtR += abtR;
                groupAbtA += abtA;
                groupAbtRA += abtRA;

                groupNonP += nonP;
                groupNonO += nonO;
                groupNonRP += nonRP;
                groupNonR += nonR;
                groupNonA += nonA;
                groupNonRA += nonRA;

                const curRowNumber = globalRowNumber++;

                return (
                  <Fragment key={row.id}>
                    <tr className={`border-b border-gray-200 transition-colors ${hasSub ? "bg-blue-50/40 font-semibold text-[#15406A]" : "hover:bg-slate-50"}`}>
                      <td className={`sticky left-0 z-30 border-r border-gray-200 px-4 py-2 text-center ${hasSub ? "bg-blue-50" : "bg-white"}`}>{curRowNumber}</td>
                      <td className={`sticky left-12 z-30 border-r border-gray-200 px-4 py-2 ${hasSub ? "bg-blue-50" : "bg-white"}`}>{row.kode}</td>
                      <td className={`sticky left-[176px] z-30 border-r border-gray-200 px-4 py-2 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.18)] ${hasSub ? "bg-blue-50" : "bg-white"}`}>{row.ro}</td>

                      <td className="border-r border-gray-200 px-3 py-2 text-center">{isProd ? "-" : abtP || "-"}</td>
                      <td className="border-r border-gray-200 px-3 py-2 text-center">{abtO || "-"}</td>
                      <td className="border-r border-gray-200 px-3 py-2 text-center">{isProd ? "-" : abtRP || "-"}</td>
                      <td className="border-r border-gray-200 px-3 py-2 text-center">{abtR || "-"}</td>
                      <td className="border-r border-gray-200 px-3 py-2 text-center">{hitungPersen(abtRP, abtP)}%</td>
                      <td className="border-r border-gray-200 px-3 py-2 text-center">{hitungPersen(abtR, abtO)}%</td>
                      <td className="border-r border-gray-200 px-3 py-2 text-right font-semibold text-[#15406A]">{abtA > 0 ? formatRp(abtA) : "-"}</td>
                      <td className="border-r border-gray-200 px-3 py-2 text-right font-semibold text-blue-700">{abtRA > 0 ? formatRp(abtRA) : "-"}</td>
                      <td className="border-r border-gray-200 px-3 py-2 text-center font-semibold text-emerald-700">{hitungPersen(abtRA, abtA)}%</td>

                      <td className="border-r border-gray-200 px-3 py-2 text-center bg-gray-50/50">{isProd ? "-" : nonP || "-"}</td>
                      <td className="border-r border-gray-200 px-3 py-2 text-center bg-gray-50/50">{nonO || "-"}</td>
                      <td className="border-r border-gray-200 px-3 py-2 text-center bg-gray-50/50">{isProd ? "-" : nonRP || "-"}</td>
                      <td className="border-r border-gray-200 px-3 py-2 text-center bg-gray-50/50">{nonR || "-"}</td>
                      <td className="border-r border-gray-200 px-3 py-2 text-center bg-gray-50/50">{hitungPersen(nonRP, nonP)}%</td>
                      <td className="border-r border-gray-200 px-3 py-2 text-center bg-gray-50/50">{hitungPersen(nonR, nonO)}%</td>
                      <td className="border-r border-gray-200 px-3 py-2 text-right bg-gray-50/50 font-semibold text-[#15406A]">{nonA > 0 ? formatRp(nonA) : "-"}</td>
                      <td className="border-r border-gray-200 px-3 py-2 text-right bg-gray-50/50 font-semibold text-blue-700">{nonRA > 0 ? formatRp(nonRA) : "-"}</td>
                      <td className="border-r border-gray-200 px-3 py-2 text-center bg-gray-50/50 font-semibold text-emerald-700">{hitungPersen(nonRA, nonA)}%</td>

                      <td className="border-r border-gray-200 px-3 py-2 text-right bg-amber-50/30 font-bold text-amber-800">{abtA + nonA > 0 ? formatRp(abtA + nonA) : "-"}</td>
                      <td className="border-r border-gray-200 px-3 py-2 text-right bg-amber-50/30 font-bold text-blue-800">{abtRA + nonRA > 0 ? formatRp(abtRA + nonRA) : "-"}</td>
                      <td className="px-3 py-2 text-center bg-amber-50/30 font-bold text-emerald-700">{hitungPersen(abtRA + nonRA, abtA + nonA)}%</td>
                    </tr>

                    {row.subRows.map((sub) => (
                      <tr key={sub.id} className="border-b border-gray-100 hover:bg-slate-50 transition-colors text-sm">
                        <td className="sticky left-0 z-30 border-r border-gray-200 bg-white px-4 py-2"></td>
                        <td className="sticky left-12 z-30 border-r border-gray-200 bg-white px-4 py-2">{sub.kode}</td>
                        <td className="sticky left-[176px] z-30 border-r border-gray-200 bg-white px-4 py-2 relative shadow-[2px_0_4px_-2px_rgba(0,0,0,0.18)]">
                          <div className="absolute left-2 top-2.5 text-gray-300 pointer-events-none">
                            <CornerDownRight className="w-4 h-4" />
                          </div>
                          <span className="pl-6">{sub.ro}</span>
                        </td>

                        <td className="border-r border-gray-200 px-3 py-2 text-center text-gray-500">{isProd ? "-" : sub.abt.paket || "-"}</td>
                        <td className="border-r border-gray-200 px-3 py-2 text-center text-gray-500">{sub.abt.orang || "-"}</td>
                        <td className="border-r border-gray-200 px-3 py-2 text-center text-gray-500">{isProd ? "-" : sub.abt.realisasiPaket || "-"}</td>
                        <td className="border-r border-gray-200 px-3 py-2 text-center text-gray-500">{sub.abt.realisasiOrang || "-"}</td>
                        <td className="border-r border-gray-200 px-3 py-2 text-center text-[#15406A]">{hitungPersen(sub.abt.realisasiPaket, sub.abt.paket)}%</td>
                        <td className="border-r border-gray-200 px-3 py-2 text-center text-[#15406A]">{hitungPersen(sub.abt.realisasiOrang, sub.abt.orang)}%</td>
                        <td className="border-r border-gray-200 px-3 py-2 text-right font-semibold text-[#15406A]">{sub.abt.anggaran > 0 ? formatRp(sub.abt.anggaran) : "-"}</td>
                        <td className="border-r border-gray-200 px-3 py-2 text-right font-semibold text-blue-700">{sub.abt.realisasiAnggaran > 0 ? formatRp(sub.abt.realisasiAnggaran) : "-"}</td>
                        <td className="border-r border-gray-200 px-3 py-2 text-center font-semibold text-emerald-700">{hitungPersen(sub.abt.realisasiAnggaran, sub.abt.anggaran)}%</td>

                        <td className="border-r border-gray-200 px-3 py-2 text-center bg-gray-50/50 text-gray-500">{isProd ? "-" : sub.nonAbt.paket || "-"}</td>
                        <td className="border-r border-gray-200 px-3 py-2 text-center bg-gray-50/50 text-gray-500">{sub.nonAbt.orang || "-"}</td>
                        <td className="border-r border-gray-200 px-3 py-2 text-center bg-gray-50/50 text-gray-500">{isProd ? "-" : sub.nonAbt.realisasiPaket || "-"}</td>
                        <td className="border-r border-gray-200 px-3 py-2 text-center bg-gray-50/50 text-gray-500">{sub.nonAbt.realisasiOrang || "-"}</td>
                        <td className="border-r border-gray-200 px-3 py-2 text-center bg-gray-50/50 text-[#15406A]">{hitungPersen(sub.nonAbt.realisasiPaket, sub.nonAbt.paket)}%</td>
                        <td className="border-r border-gray-200 px-3 py-2 text-center bg-gray-50/50 text-[#15406A]">{hitungPersen(sub.nonAbt.realisasiOrang, sub.nonAbt.orang)}%</td>
                        <td className="border-r border-gray-200 px-3 py-2 text-right bg-gray-50/50 font-semibold text-[#15406A]">{sub.nonAbt.anggaran > 0 ? formatRp(sub.nonAbt.anggaran) : "-"}</td>
                        <td className="border-r border-gray-200 px-3 py-2 text-right bg-gray-50/50 font-semibold text-blue-700">{sub.nonAbt.realisasiAnggaran > 0 ? formatRp(sub.nonAbt.realisasiAnggaran) : "-"}</td>
                        <td className="border-r border-gray-200 px-3 py-2 text-center bg-gray-50/50 font-semibold text-emerald-700">{hitungPersen(sub.nonAbt.realisasiAnggaran, sub.nonAbt.anggaran)}%</td>

                        <td className="border-r border-gray-200 px-3 py-2 text-right bg-amber-50/30 text-amber-700 font-medium">{sub.abt.anggaran + sub.nonAbt.anggaran > 0 ? formatRp(sub.abt.anggaran + sub.nonAbt.anggaran) : "-"}</td>
                        <td className="border-r border-gray-200 px-3 py-2 text-right bg-amber-50/30 text-blue-700 font-medium">{sub.abt.realisasiAnggaran + sub.nonAbt.realisasiAnggaran > 0 ? formatRp(sub.abt.realisasiAnggaran + sub.nonAbt.realisasiAnggaran) : "-"}</td>
                        <td className="px-3 py-2 text-center bg-amber-50/30 text-emerald-700 font-medium">{hitungPersen(sub.abt.realisasiAnggaran + sub.nonAbt.realisasiAnggaran, sub.abt.anggaran + sub.nonAbt.anggaran)}%</td>
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>

            <tfoot className="bg-amber-100 font-bold uppercase text-amber-900 border-b-2 border-white">
              <tr>
                <td colSpan={3} className="sticky left-0 z-30 border-r border-amber-200 bg-amber-100 px-4 py-3 text-right">TOTAL {group.groupName}</td>

                <td className="border-r border-amber-200 px-3 py-3 text-center">{isProd ? "-" : groupAbtP}</td>
                <td className="border-r border-amber-200 px-3 py-3 text-center">{groupAbtO}</td>
                <td className="border-r border-amber-200 px-3 py-3 text-center">{isProd ? "-" : groupAbtRP}</td>
                <td className="border-r border-amber-200 px-3 py-3 text-center">{groupAbtR}</td>
                <td className="border-r border-amber-200 px-3 py-3 text-center">{hitungPersen(groupAbtRP, groupAbtP)}%</td>
                <td className="border-r border-amber-200 px-3 py-3 text-center">{hitungPersen(groupAbtR, groupAbtO)}%</td>
                <td className="border-r border-amber-200 px-3 py-3 text-right">{formatRp(groupAbtA)}</td>
                <td className="border-r border-amber-200 px-3 py-3 text-right text-blue-800">{formatRp(groupAbtRA)}</td>
                <td className="border-r border-amber-200 px-3 py-3 text-center text-emerald-800">{hitungPersen(groupAbtRA, groupAbtA)}%</td>

                <td className="border-r border-amber-200 px-3 py-3 text-center bg-amber-200/40">{isProd ? "-" : groupNonP}</td>
                <td className="border-r border-amber-200 px-3 py-3 text-center bg-amber-200/40">{groupNonO}</td>
                <td className="border-r border-amber-200 px-3 py-3 text-center bg-amber-200/40">{isProd ? "-" : groupNonRP}</td>
                <td className="border-r border-amber-200 px-3 py-3 text-center bg-amber-200/40">{groupNonR}</td>
                <td className="border-r border-amber-200 px-3 py-3 text-center bg-amber-200/40">{hitungPersen(groupNonRP, groupNonP)}%</td>
                <td className="border-r border-amber-200 px-3 py-3 text-center bg-amber-200/40">{hitungPersen(groupNonR, groupNonO)}%</td>
                <td className="border-r border-amber-200 px-3 py-3 text-right bg-amber-200/40">{formatRp(groupNonA)}</td>
                <td className="border-r border-amber-200 px-3 py-3 text-right bg-amber-200/40 text-blue-800">{formatRp(groupNonRA)}</td>
                <td className="border-r border-amber-200 px-3 py-3 text-center bg-amber-200/40 text-emerald-800">{hitungPersen(groupNonRA, groupNonA)}%</td>

                <td className="border-r border-amber-200 px-3 py-3 text-right bg-amber-400 text-white shadow-inner">{formatRp(groupAbtA + groupNonA)}</td>
                <td className="border-r border-amber-200 px-3 py-3 text-right bg-amber-400 text-blue-100 shadow-inner">{formatRp(groupAbtRA + groupNonRA)}</td>
                <td className="px-3 py-3 text-center bg-amber-400 text-white shadow-inner">{hitungPersen(groupAbtRA + groupNonRA, groupAbtA + groupNonA)}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  return (

    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={handleDownloadExcel} className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-5 py-2.5 rounded-xl font-bold border border-emerald-200 transition-all hover:bg-emerald-100 shadow-sm hover:shadow">
          <Download className="w-5 h-5" />
          Cetak Excel Rekapan
        </button>
      </div>
      {data.map((group) => renderStandardGroup(group))}

      {data.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border-2 border-[#1a4e82] overflow-hidden mb-8">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm text-left border-separate border-spacing-0 min-w-max">
              <thead className="bg-[#15406A] text-white">
                <tr>
                  <th rowSpan={3} className="sticky left-0.5 z-40 border border-[#1a4e82] bg-[#184878] px-4 py-3 text-center w-12">NO.</th>
                  <th rowSpan={3} className="sticky left-15 z-40 border border-[#1a4e82] bg-[#184878] px-4 py-3 w-32">KODE</th>
                  <th rowSpan={3} className="sticky left-[186px] z-40 border border-[#1a4e82] bg-[#184878] px-4 py-3 w-[300px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.25)]">Rincian Output (RO)</th>

                  <th colSpan={9} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#184878]">ABT</th>
                  <th colSpan={9} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#153a5e]">NON-ABT</th>
                  <th colSpan={3} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#12304d]">Total Anggaran</th>
                </tr>

                <tr>
                  <th colSpan={2} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#1c548c]">Target</th>
                  <th colSpan={2} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#1c548c]">Realisasi</th>
                  <th colSpan={2} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#1c548c]">Capaian (%)</th>
                  <th colSpan={3} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#1c548c]">Anggaran</th>

                  <th colSpan={2} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#194269]">Target</th>
                  <th colSpan={2} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#194269]">Realisasi</th>
                  <th colSpan={2} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#194269]">Capaian (%)</th>
                  <th colSpan={3} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#194269]">Anggaran</th>

                  <th colSpan={3} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#12304d]">Anggaran</th>
                </tr>

                <tr>
                  <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#2060a0] w-16">Paket</th>
                  <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#2060a0] w-16">Orang</th>
                  <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#2060a0] w-16">Paket</th>
                  <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#2060a0] w-16">Orang</th>
                  <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#2060a0] w-16">Paket</th>
                  <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#2060a0] w-16">Orang</th>
                  <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#2060a0] w-28">Alokasi</th>
                  <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#2060a0] w-28">Realisasi</th>
                  <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#2060a0] w-24">Persentase (%)</th>

                  <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#1c4b78] w-16">Paket</th>
                  <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#1c4b78] w-16">Orang</th>
                  <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#1c4b78] w-16">Paket</th>
                  <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#1c4b78] w-16">Orang</th>
                  <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#1c4b78] w-16">Paket</th>
                  <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#1c4b78] w-16">Orang</th>
                  <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#1c4b78] w-28">Alokasi</th>
                  <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#1c4b78] w-28">Realisasi</th>
                  <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#1c4b78] w-24">Persentase (%)</th>

                  <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#12304d] w-28">Alokasi</th>
                  <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#12304d] w-28">Realisasi</th>
                  <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#12304d] w-24">Persentase (%)</th>
                </tr>
              </thead>

              <tbody className="bg-[#15406A] text-white font-bold tracking-wide">
                <tr>
                  <td colSpan={3} className="sticky left-0 z-30 border-r border-[#1a4e82] bg-[#15406A] px-4 py-5 text-right uppercase text-[15px]">TOTAL KESELURUHAN</td>

                  <td className="border-r border-[#1a4e82] px-3 py-5 text-center">{grandTotalAbtP}</td>
                  <td className="border-r border-[#1a4e82] px-3 py-5 text-center text-blue-200">{grandTotalAbtO}</td>
                  <td className="border-r border-[#1a4e82] px-3 py-5 text-center">{grandTotalAbtRP}</td>
                  <td className="border-r border-[#1a4e82] px-3 py-5 text-center">{grandTotalAbtR}</td>
                  <td className="border-r border-[#1a4e82] px-3 py-5 text-center text-emerald-300">{hitungPersen(grandTotalAbtRP, grandTotalAbtP)}%</td>
                  <td className="border-r border-[#1a4e82] px-3 py-5 text-center text-emerald-300">{hitungPersen(grandTotalAbtR, grandTotalAbtO)}%</td>
                  <td className="border-r border-[#1a4e82] px-3 py-5 text-right">{formatRp(grandTotalAbtA)}</td>
                  <td className="border-r border-[#1a4e82] px-3 py-5 text-right text-blue-200">{formatRp(grandTotalAbtRA)}</td>
                  <td className="border-r border-[#1a4e82] px-3 py-5 text-center text-emerald-300">{hitungPersen(grandTotalAbtRA, grandTotalAbtA)}%</td>

                  <td className="border-r border-[#1a4e82] px-3 py-5 text-center bg-[#12304d]">{grandTotalNonP}</td>
                  <td className="border-r border-[#1a4e82] px-3 py-5 text-center bg-[#12304d] text-blue-200">{grandTotalNonO}</td>
                  <td className="border-r border-[#1a4e82] px-3 py-5 text-center bg-[#12304d]">{grandTotalNonRP}</td>
                  <td className="border-r border-[#1a4e82] px-3 py-5 text-center bg-[#12304d]">{grandTotalNonR}</td>
                  <td className="border-r border-[#1a4e82] px-3 py-5 text-center bg-[#12304d] text-emerald-300">{hitungPersen(grandTotalNonRP, grandTotalNonP)}%</td>
                  <td className="border-r border-[#1a4e82] px-3 py-5 text-center bg-[#12304d] text-emerald-300">{hitungPersen(grandTotalNonR, grandTotalNonO)}%</td>
                  <td className="border-r border-[#1a4e82] px-3 py-5 text-right bg-[#12304d]">{formatRp(grandTotalNonA)}</td>
                  <td className="border-r border-[#1a4e82] px-3 py-5 text-right bg-[#12304d] text-blue-200">{formatRp(grandTotalNonRA)}</td>
                  <td className="border-r border-[#1a4e82] px-3 py-5 text-center bg-[#12304d] text-emerald-300">{hitungPersen(grandTotalNonRA, grandTotalNonA)}%</td>

                  <td className="border-r border-[#1a4e82] px-3 py-5 text-right bg-amber-500 shadow-inner text-[15px]">{formatRp(totalModul)}</td>
                  <td className="border-r border-[#1a4e82] px-3 py-5 text-right bg-amber-500 shadow-inner text-blue-100">{formatRp(totalRealisasiModul)}</td>
                  <td className="px-3 py-5 text-center bg-amber-500 shadow-inner text-[15px]">{persentaseModul}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
     
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

      <div className="mt-8 bg-gradient-to-br from-[#15406A] to-[#1e5891] rounded-2xl shadow-xl border border-blue-800 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor" xmlns="http\://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.64-2.25 1.64-1.74 0-2.1-.96-2.17-1.92H8.01c.08 1.84 1.25 2.92 2.89 3.28V19h2.38v-1.63c1.5-.28 2.86-1.12 2.86-2.8 0-2.31-1.34-2.57-3.03-2.57z" />
          </svg>
        </div>
        <div className="p-8 sm:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div>
            <h3 className="text-blue-200 font-bold tracking-widest text-sm mb-2 uppercase">Rekapitulasi Akhir</h3>
            <h2 className="text-2xl sm:text-3xl font-black text-white">GRAND TOTAL KESELURUHAN</h2>
            <p className="text-blue-100/70 text-sm mt-2 max-w-md">Kalkulasi akhir dari seluruh Modul Anggaran (ABT & NON-ABT) ditambah dengan Anggaran Lainnya.</p>
          </div>

          <div className="bg-black/20 backdrop-blur-sm border border-white/10 p-6 rounded-2xl min-w-[300px]">
            <div className="grid grid-cols-1 gap-5 text-right">
              <div>
                <p className="text-blue-200 text-xs font-semibold mb-1 uppercase">Total Alokasi (Rp)</p>
                <p className="text-2xl sm:text-3xl font-black text-amber-400 drop-shadow-md">{formatRp(superGrandTotal)} </p>
              </div>
              <div>
                <p className="text-blue-200 text-xs font-semibold mb-1 uppercase">Total Realisasi (Rp)</p>
                <p className="text-2xl sm:text-2xl font-black text-blue-200 drop-shadow-md">{formatRp(superGrandRealisasi)}</p>
              </div>
              <div>
                <p className="text-blue-200 text-xs font-semibold mb-1 uppercase">Persentase (%)</p>
                <p className="text-2xl sm:text-3xl font-black text-emerald-300 drop-shadow-md">{superGrandPersentase}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

}
