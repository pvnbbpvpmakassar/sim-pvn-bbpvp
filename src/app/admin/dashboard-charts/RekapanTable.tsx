"use client";

import React, { Fragment, useState, useEffect } from "react";
import { Download, CornerDownRight } from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { getAlokasiAnggaran, AlokasiRowData } from "@/app/actions/data";

// --- Penyesuaian Tipe Data agar sinkron dengan Backend baru ---
export type DashboardMetrics = { paket: number; orang: number; realisasiOrang: number; anggaran: number };
export type DashboardSubRow = { id: string; kode: string; ro: string; abt: DashboardMetrics; nonAbt: DashboardMetrics };
export type DashboardRow = { id: string; kode: string; ro: string; abt: DashboardMetrics; nonAbt: DashboardMetrics; subRows: DashboardSubRow[] };
export type DashboardGroupData = { groupName: string; rows: DashboardRow[] };

interface RekapanTableProps {
  data: DashboardGroupData[];
}

export default function RekapanTable({ data }: RekapanTableProps) {
  const [lainnyaData, setLainnyaData] = useState<AlokasiRowData[]>([]);

  // Menarik data "Anggaran Lainnya" dari database saat tabel rekap dimuat
  useEffect(() => {
    const fetchLainnya = async () => {
      const res = await getAlokasiAnggaran();
      if (res.success && res.data?.lainnya) {
        setLainnyaData(res.data.lainnya);
      }
    };
    fetchLainnya();
  }, []);

  // --- Fungsi Utilitas ---
  const hitungPersen = (realisasi: number, orang: number) => orang > 0 ? ((realisasi / orang) * 100).toFixed(2) : "0.00";
  const formatRp = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);

  // --- Kalkulasi Total Modul (Untuk Grand Total Paling Bawah) ---
  let totalAnggaranModul = 0;
  data.forEach(group => {
    group.rows.forEach(row => {
      const hasSub = row.subRows.length > 0;
      totalAnggaranModul += hasSub ? row.subRows.reduce((sum, s) => sum + s.abt.anggaran, 0) : row.abt.anggaran;
      totalAnggaranModul += hasSub ? row.subRows.reduce((sum, s) => sum + s.nonAbt.anggaran, 0) : row.nonAbt.anggaran;
    });
  });

  const totalLainnya = lainnyaData.reduce((sum, item) => sum + item.anggaran, 0);
  const superGrandTotal = totalAnggaranModul + totalLainnya;

  // --- Fungsi Download Excel (Disesuaikan agar mendukung semua format) ---
  const handleDownloadExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Rekapan Dashboard");

    worksheet.columns = [
      { width: 6 }, { width: 16 }, { width: 45 },
      { width: 10 }, { width: 12 }, { width: 16 }, { width: 15 }, { width: 22 },
      { width: 10 }, { width: 12 }, { width: 16 }, { width: 15 }, { width: 22 },
      { width: 24 }
    ];

    const applyBorder = (row: ExcelJS.Row, alignRightCols: number[] = []) => {
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.border = { top: { style: "thin", color: { argb: "FFCCCCCC" } }, left: { style: "thin", color: { argb: "FFCCCCCC" } }, bottom: { style: "thin", color: { argb: "FFCCCCCC" } }, right: { style: "thin", color: { argb: "FFCCCCCC" } } };
        cell.alignment = { vertical: "middle", horizontal: alignRightCols.includes(colNumber) ? "right" : (colNumber === 3 ? "left" : "center") };
      });
    };

    let globalNo = 1;

    data.forEach(group => {
      // Header Tiap Grup
      const groupHeader = worksheet.addRow(["", "", `REKAPITULASI: ${group.groupName.toUpperCase()}`, "", "", "", "", "", "", "", "", "", "", ""]);
      worksheet.mergeCells(`A${groupHeader.number}:N${groupHeader.number}`);
      groupHeader.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF15406A" } };
      groupHeader.getCell(1).font = { color: { argb: "FFFFFFFF" }, bold: true };
      groupHeader.getCell(1).alignment = { vertical: "middle", horizontal: "center" };

      // Header Kolom
      const isProd = group.groupName.toLowerCase() === "produktivitas";
      const row1 = worksheet.addRow(["NO.", "KODE", "RINCIAN OUTPUT (RO)", "ABT", "", "", "", "", "NON-ABT", "", "", "", "", "Total Anggaran"]);
      const row2 = worksheet.addRow(["", "", "", "Target", "", "Realisasi Orang", "Persentase (%)", "Anggaran (Rp.)", "Target", "", "Realisasi Orang", "Persentase (%)", "Anggaran (Rp.)", ""]);
      const row3 = worksheet.addRow(["", "", "", isProd ? "-" : "Paket", "Orang", "", "", "", isProd ? "-" : "Paket", "Orang", "", "", "", ""]);
      
      [row1, row2, row3].forEach(r => {
        r.eachCell({ includeEmpty: true }, c => {
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF184878" } };
          c.font = { color: { argb: "FFFFFFFF" }, bold: true };
          c.alignment = { vertical: "middle", horizontal: "center" };
          c.border = { top: { style: "thin", color: { argb: "FFFFFFFF" } }, left: { style: "thin", color: { argb: "FFFFFFFF" } }, bottom: { style: "thin", color: { argb: "FFFFFFFF" } }, right: { style: "thin", color: { argb: "FFFFFFFF" } } };
        });
      });

      worksheet.mergeCells(`A${row1.number}:A${row3.number}`); worksheet.mergeCells(`B${row1.number}:B${row3.number}`); worksheet.mergeCells(`C${row1.number}:C${row3.number}`);
      worksheet.mergeCells(`D${row1.number}:H${row1.number}`); worksheet.mergeCells(`I${row1.number}:M${row1.number}`); worksheet.mergeCells(`N${row1.number}:N${row3.number}`);
      worksheet.mergeCells(`D${row2.number}:E${row2.number}`); worksheet.mergeCells(`F${row2.number}:F${row3.number}`); worksheet.mergeCells(`G${row2.number}:G${row3.number}`); worksheet.mergeCells(`H${row2.number}:H${row3.number}`);
      worksheet.mergeCells(`I${row2.number}:J${row2.number}`); worksheet.mergeCells(`K${row2.number}:K${row3.number}`); worksheet.mergeCells(`L${row2.number}:L${row3.number}`); worksheet.mergeCells(`M${row2.number}:M${row3.number}`);

      let gAbtA = 0, gNonA = 0;

      group.rows.forEach(row => {
        const hasSub = row.subRows.length > 0;
        const abtP = hasSub ? row.subRows.reduce((s, c) => s + c.abt.paket, 0) : row.abt.paket;
        const abtO = hasSub ? row.subRows.reduce((s, c) => s + c.abt.orang, 0) : row.abt.orang;
        const abtR = hasSub ? row.subRows.reduce((s, c) => s + c.abt.realisasiOrang, 0) : row.abt.realisasiOrang;
        const abtA = hasSub ? row.subRows.reduce((s, c) => s + c.abt.anggaran, 0) : row.abt.anggaran;
        
        const nonP = hasSub ? row.subRows.reduce((s, c) => s + c.nonAbt.paket, 0) : row.nonAbt.paket;
        const nonO = hasSub ? row.subRows.reduce((s, c) => s + c.nonAbt.orang, 0) : row.nonAbt.orang;
        const nonR = hasSub ? row.subRows.reduce((s, c) => s + c.nonAbt.realisasiOrang, 0) : row.nonAbt.realisasiOrang;
        const nonA = hasSub ? row.subRows.reduce((s, c) => s + c.nonAbt.anggaran, 0) : row.nonAbt.anggaran;

        gAbtA += abtA; gNonA += nonA;

        const pRow = worksheet.addRow([
          globalNo++, row.kode, row.ro,
          isProd ? "-" : abtP, abtO, isProd ? "-" : abtR, isProd ? "-" : `${hitungPersen(abtR, abtO)}%`, abtA,
          isProd ? "-" : nonP, nonO, isProd ? "-" : nonR, isProd ? "-" : `${hitungPersen(nonR, nonO)}%`, nonA,
          abtA + nonA
        ]);
        applyBorder(pRow, [8, 13, 14]);
        if (hasSub) { pRow.font = { bold: true }; pRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F8FF" } }; }

        row.subRows.forEach(sub => {
          const sRow = worksheet.addRow([
            "", sub.kode, `    ↳ ${sub.ro}`,
            isProd ? "-" : sub.abt.paket, sub.abt.orang, isProd ? "-" : sub.abt.realisasiOrang, isProd ? "-" : `${hitungPersen(sub.abt.realisasiOrang, sub.abt.orang)}%`, sub.abt.anggaran,
            isProd ? "-" : sub.nonAbt.paket, sub.nonAbt.orang, isProd ? "-" : sub.nonAbt.realisasiOrang, isProd ? "-" : `${hitungPersen(sub.nonAbt.realisasiOrang, sub.nonAbt.orang)}%`, sub.nonAbt.anggaran,
            sub.abt.anggaran + sub.nonAbt.anggaran
          ]);
          applyBorder(sRow, [8, 13, 14]);
        });
      });

      // Total Per Grup
      const tRow = worksheet.addRow(["", "", `TOTAL ${group.groupName.toUpperCase()}`, "", "", "", "", gAbtA, "", "", "", "", gNonA, gAbtA + gNonA]);
      worksheet.mergeCells(`A${tRow.number}:C${tRow.number}`);
      worksheet.mergeCells(`D${tRow.number}:G${tRow.number}`);
      worksheet.mergeCells(`I${tRow.number}:L${tRow.number}`);
      tRow.eachCell({ includeEmpty: true }, (cell, col) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE4B5" } };
        cell.font = { bold: true, color: { argb: "FF8B4513" } };
        cell.alignment = { vertical: "middle", horizontal: [8, 13, 14].includes(col as number) ? "right" : "center" };
      });
      worksheet.addRow([]); // Spacer
    });

    // Excel Lainnya
    if (lainnyaData.length > 0) {
      const titleLainnya = worksheet.addRow(["", "", "ANGGARAN LAINNYA", "", "", "", "", "", "", "", "", "", "", ""]);
      worksheet.mergeCells(`A${titleLainnya.number}:N${titleLainnya.number}`);
      titleLainnya.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF10B981" } };
      titleLainnya.getCell(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      titleLainnya.getCell(1).alignment = { vertical: "middle", horizontal: "center" };

      lainnyaData.forEach((item, idx) => {
        const lRow = worksheet.addRow([idx + 1, "-", item.nama_modul, "", "", "", "", "", "", "", "", "", "", item.anggaran]);
        worksheet.mergeCells(`D${lRow.number}:M${lRow.number}`);
        lRow.getCell(4).value = "Hanya Anggaran";
        lRow.getCell(4).alignment = { horizontal: "center" };
        applyBorder(lRow, [14]);
      });
    }

    // Excel Super Grand Total
    const superRow = worksheet.addRow(["", "", "GRAND TOTAL KESELURUHAN ANGGARAN (MODUL + LAINNYA)", "", "", "", "", "", "", "", "", "", "", superGrandTotal]);
    worksheet.mergeCells(`A${superRow.number}:M${superRow.number}`);
    superRow.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF59E0B" } };
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.alignment = { vertical: "middle", horizontal: col === 14 ? "right" : "right" };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), "Rekapan_Dashboard_SIMPVN.xlsx");
  };

  let globalRowNumber = 1;

  // =========================================================================
  // RENDERER: TABEL STANDAR (Sertifikasi & UPTP)
  // =========================================================================
  const renderStandardGroup = (group: DashboardGroupData) => {
    let groupAbtP = 0, groupAbtO = 0, groupAbtR = 0, groupAbtA = 0;
    let groupNonP = 0, groupNonO = 0, groupNonR = 0, groupNonA = 0;

    return (
      <div key={group.groupName} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="bg-[#15406A] px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white uppercase tracking-wide">{group.groupName}</h2>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm text-left border-collapse min-w-max">
            <thead className="bg-[#184878] text-white">
              <tr>
                <th rowSpan={3} className="border border-[#1a4e82] px-4 py-3 text-center w-12">NO.</th>
                <th rowSpan={3} className="border border-[#1a4e82] px-4 py-3 w-32">KODE</th>
                <th rowSpan={3} className="border border-[#1a4e82] px-4 py-3 min-w-[250px]">Rincian Output (RO)</th>
                <th colSpan={5} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#1c548c]">ABT</th>
                <th colSpan={5} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#153a5e]">NON-ABT</th>
                <th rowSpan={3} className="border border-[#1a4e82] px-4 py-3 text-center w-40 bg-[#12304d]">Total Anggaran</th>
              </tr>
              <tr>
                <th colSpan={2} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#2060a0]">Target</th>
                <th rowSpan={2} className="border border-[#1a4e82] px-3 py-3 text-center bg-[#2060a0] w-24">Realisasi Orang</th>
                <th rowSpan={2} className="border border-[#1a4e82] px-3 py-3 text-center bg-[#2060a0] w-24">Persentase (%)</th>
                <th rowSpan={2} className="border border-[#1a4e82] px-4 py-3 text-center bg-[#2060a0] w-32">Anggaran (Rp.)</th>
                
                <th colSpan={2} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#194269]">Target</th>
                <th rowSpan={2} className="border border-[#1a4e82] px-3 py-3 text-center bg-[#194269] w-24">Realisasi Orang</th>
                <th rowSpan={2} className="border border-[#1a4e82] px-3 py-3 text-center bg-[#194269] w-24">Persentase (%)</th>
                <th rowSpan={2} className="border border-[#1a4e82] px-4 py-3 text-center bg-[#194269] w-32">Anggaran (Rp.)</th>
              </tr>
              <tr>
                <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#2870b8] w-16">Paket</th>
                <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#2870b8] w-16">Orang</th>
                <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#1c4b78] w-16">Paket</th>
                <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#1c4b78] w-16">Orang</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {group.rows.map((row) => {
                const hasSub = row.subRows.length > 0;
                
                const abtP = hasSub ? row.subRows.reduce((sum, s) => sum + s.abt.paket, 0) : row.abt.paket;
                const abtO = hasSub ? row.subRows.reduce((sum, s) => sum + s.abt.orang, 0) : row.abt.orang;
                const abtR = hasSub ? row.subRows.reduce((sum, s) => sum + s.abt.realisasiOrang, 0) : row.abt.realisasiOrang;
                const abtA = hasSub ? row.subRows.reduce((sum, s) => sum + s.abt.anggaran, 0) : row.abt.anggaran;

                const nonP = hasSub ? row.subRows.reduce((sum, s) => sum + s.nonAbt.paket, 0) : row.nonAbt.paket;
                const nonO = hasSub ? row.subRows.reduce((sum, s) => sum + s.nonAbt.orang, 0) : row.nonAbt.orang;
                const nonR = hasSub ? row.subRows.reduce((sum, s) => sum + s.nonAbt.realisasiOrang, 0) : row.nonAbt.realisasiOrang;
                const nonA = hasSub ? row.subRows.reduce((sum, s) => sum + s.nonAbt.anggaran, 0) : row.nonAbt.anggaran;

                groupAbtP += abtP; groupAbtO += abtO; groupAbtR += abtR; groupAbtA += abtA;
                groupNonP += nonP; groupNonO += nonO; groupNonR += nonR; groupNonA += nonA;

                const curRowNumber = globalRowNumber++;

                return (
                  <Fragment key={row.id}>
                    <tr className={`border-b border-gray-200 transition-colors ${hasSub ? 'bg-blue-50/40 font-semibold text-[#15406A]' : 'hover:bg-slate-50'}`}>
                      <td className="border-r border-gray-200 px-4 py-2 text-center">{curRowNumber}</td>
                      <td className="border-r border-gray-200 px-4 py-2">{row.kode}</td>
                      <td className="border-r border-gray-200 px-4 py-2">{row.ro}</td>
                      
                      <td className="border-r border-gray-200 px-3 py-2 text-center">{abtP || "-"}</td>
                      <td className="border-r border-gray-200 px-3 py-2 text-center">{abtO || "-"}</td>
                      <td className="border-r border-gray-200 px-3 py-2 text-center">{abtR || "-"}</td>
                      <td className="border-r border-gray-200 px-3 py-2 text-center">{hitungPersen(abtR, abtO)}%</td>
                      <td className="border-r border-gray-200 px-4 py-2 text-right">{abtA > 0 ? formatRp(abtA) : "-"}</td>

                      <td className="border-r border-gray-200 px-3 py-2 text-center bg-gray-50/50">{nonP || "-"}</td>
                      <td className="border-r border-gray-200 px-3 py-2 text-center bg-gray-50/50">{nonO || "-"}</td>
                      <td className="border-r border-gray-200 px-3 py-2 text-center bg-gray-50/50">{nonR || "-"}</td>
                      <td className="border-r border-gray-200 px-3 py-2 text-center bg-gray-50/50">{hitungPersen(nonR, nonO)}%</td>
                      <td className="border-r border-gray-200 px-4 py-2 text-right bg-gray-50/50">{nonA > 0 ? formatRp(nonA) : "-"}</td>

                      <td className="px-4 py-2 text-right bg-amber-50/30 font-bold text-amber-800">
                        {abtA + nonA > 0 ? formatRp(abtA + nonA) : "-"}
                      </td>
                    </tr>

                    {row.subRows.map((sub) => (
                      <tr key={sub.id} className="border-b border-gray-100 hover:bg-slate-50 transition-colors text-sm">
                        <td className="border-r border-gray-200 px-4 py-2"></td>
                        <td className="border-r border-gray-200 px-4 py-2">{sub.kode}</td>
                        <td className="border-r border-gray-200 px-4 py-2 relative">
                          <div className="absolute left-2 top-2.5 text-gray-300 pointer-events-none"><CornerDownRight className="w-4 h-4" /></div>
                          <span className="pl-6">{sub.ro}</span>
                        </td>

                        <td className="border-r border-gray-200 px-3 py-2 text-center text-gray-500">{sub.abt.paket || "-"}</td>
                        <td className="border-r border-gray-200 px-3 py-2 text-center text-gray-500">{sub.abt.orang || "-"}</td>
                        <td className="border-r border-gray-200 px-3 py-2 text-center text-gray-500">{sub.abt.realisasiOrang || "-"}</td>
                        <td className="border-r border-gray-200 px-3 py-2 text-center text-[#15406A]">{hitungPersen(sub.abt.realisasiOrang, sub.abt.orang)}%</td>
                        <td className="border-r border-gray-200 px-4 py-2 text-right text-gray-600">{sub.abt.anggaran > 0 ? formatRp(sub.abt.anggaran) : "-"}</td>

                        <td className="border-r border-gray-200 px-3 py-2 text-center bg-gray-50/50 text-gray-500">{sub.nonAbt.paket || "-"}</td>
                        <td className="border-r border-gray-200 px-3 py-2 text-center bg-gray-50/50 text-gray-500">{sub.nonAbt.orang || "-"}</td>
                        <td className="border-r border-gray-200 px-3 py-2 text-center bg-gray-50/50 text-gray-500">{sub.nonAbt.realisasiOrang || "-"}</td>
                        <td className="border-r border-gray-200 px-3 py-2 text-center bg-gray-50/50 text-[#15406A]">{hitungPersen(sub.nonAbt.realisasiOrang, sub.nonAbt.orang)}%</td>
                        <td className="border-r border-gray-200 px-4 py-2 text-right bg-gray-50/50 text-gray-600">{sub.nonAbt.anggaran > 0 ? formatRp(sub.nonAbt.anggaran) : "-"}</td>

                        <td className="px-4 py-2 text-right bg-amber-50/30 text-amber-700 font-medium">
                          {sub.abt.anggaran + sub.nonAbt.anggaran > 0 ? formatRp(sub.abt.anggaran + sub.nonAbt.anggaran) : "-"}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
            
            <tfoot className="bg-amber-100 font-bold uppercase text-amber-900 border-b-2 border-white">
              <tr>
                <td colSpan={3} className="border-r border-amber-200 px-4 py-3 text-right">TOTAL {group.groupName}</td>
                
                <td className="border-r border-amber-200 px-3 py-3 text-center">{groupAbtP}</td>
                <td className="border-r border-amber-200 px-3 py-3 text-center">{groupAbtO}</td>
                <td className="border-r border-amber-200 px-3 py-3 text-center">{groupAbtR}</td>
                <td className="border-r border-amber-200 px-3 py-3 text-center">{hitungPersen(groupAbtR, groupAbtO)}%</td>
                <td className="border-r border-amber-200 px-4 py-3 text-right">{formatRp(groupAbtA)}</td>

                <td className="border-r border-amber-200 px-3 py-3 text-center bg-amber-200/40">{groupNonP}</td>
                <td className="border-r border-amber-200 px-3 py-3 text-center bg-amber-200/40">{groupNonO}</td>
                <td className="border-r border-amber-200 px-3 py-3 text-center bg-amber-200/40">{groupNonR}</td>
                <td className="border-r border-amber-200 px-3 py-3 text-center bg-amber-200/40">{hitungPersen(groupNonR, groupNonO)}%</td>
                <td className="border-r border-amber-200 px-4 py-3 text-right bg-amber-200/40">{formatRp(groupNonA)}</td>

                <td className="px-4 py-3 text-right bg-amber-400 text-white shadow-inner">{formatRp(groupAbtA + groupNonA)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  // =========================================================================
  // RENDERER: TABEL PRODUKTIVITAS (Tanpa Paket, Realisasi, Persen)
  // =========================================================================
  const renderProduktivitasGroup = (group: DashboardGroupData) => {
    let groupAbtO = 0, groupAbtA = 0;
    let groupNonO = 0, groupNonA = 0;

    return (
      <div key={group.groupName} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="bg-[#15406A] px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white uppercase tracking-wide">{group.groupName}</h2>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm text-left border-collapse min-w-max">
            <thead className="bg-[#184878] text-white">
              <tr>
                <th rowSpan={2} className="border border-[#1a4e82] px-4 py-3 text-center w-12">NO.</th>
                <th rowSpan={2} className="border border-[#1a4e82] px-4 py-3 w-32">KODE</th>
                <th rowSpan={2} className="border border-[#1a4e82] px-4 py-3 min-w-[250px]">Rincian Output (RO)</th>
                <th colSpan={2} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#1c548c]">ABT</th>
                <th colSpan={2} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#153a5e]">NON-ABT</th>
                <th rowSpan={2} className="border border-[#1a4e82] px-4 py-3 text-center w-40 bg-[#12304d]">Total Anggaran</th>
              </tr>
              <tr>
                <th className="border border-[#1a4e82] px-4 py-2 text-center bg-[#2060a0] w-32">Target Orang</th>
                <th className="border border-[#1a4e82] px-4 py-2 text-center bg-[#2060a0] w-48">Anggaran (Rp.)</th>
                <th className="border border-[#1a4e82] px-4 py-2 text-center bg-[#194269] w-32">Target Orang</th>
                <th className="border border-[#1a4e82] px-4 py-2 text-center bg-[#194269] w-48">Anggaran (Rp.)</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {group.rows.map((row) => {
                const hasSub = row.subRows.length > 0;
                
                const abtO = hasSub ? row.subRows.reduce((sum, s) => sum + s.abt.orang, 0) : row.abt.orang;
                const abtA = hasSub ? row.subRows.reduce((sum, s) => sum + s.abt.anggaran, 0) : row.abt.anggaran;
                
                const nonO = hasSub ? row.subRows.reduce((sum, s) => sum + s.nonAbt.orang, 0) : row.nonAbt.orang;
                const nonA = hasSub ? row.subRows.reduce((sum, s) => sum + s.nonAbt.anggaran, 0) : row.nonAbt.anggaran;

                groupAbtO += abtO; groupAbtA += abtA;
                groupNonO += nonO; groupNonA += nonA;

                const curRowNumber = globalRowNumber++;

                return (
                  <Fragment key={row.id}>
                    <tr className={`border-b border-gray-200 transition-colors ${hasSub ? 'bg-blue-50/40 font-semibold text-[#15406A]' : 'hover:bg-slate-50'}`}>
                      <td className="border-r border-gray-200 px-4 py-3 text-center">{curRowNumber}</td>
                      <td className="border-r border-gray-200 px-4 py-3">{row.kode}</td>
                      <td className="border-r border-gray-200 px-4 py-3">{row.ro}</td>
                      
                      <td className="border-r border-gray-200 px-4 py-3 text-center">{abtO || "-"}</td>
                      <td className="border-r border-gray-200 px-4 py-3 text-right">{abtA > 0 ? formatRp(abtA) : "-"}</td>

                      <td className="border-r border-gray-200 px-4 py-3 text-center bg-gray-50/50">{nonO || "-"}</td>
                      <td className="border-r border-gray-200 px-4 py-3 text-right bg-gray-50/50">{nonA > 0 ? formatRp(nonA) : "-"}</td>

                      <td className="px-4 py-3 text-right bg-amber-50/30 font-bold text-amber-800">
                        {abtA + nonA > 0 ? formatRp(abtA + nonA) : "-"}
                      </td>
                    </tr>

                    {row.subRows.map((sub) => (
                      <tr key={sub.id} className="border-b border-gray-100 hover:bg-slate-50 transition-colors text-sm">
                        <td className="border-r border-gray-200 px-4 py-2.5"></td>
                        <td className="border-r border-gray-200 px-4 py-2.5">{sub.kode}</td>
                        <td className="border-r border-gray-200 px-4 py-2.5 relative">
                          <div className="absolute left-2 top-3 text-gray-300 pointer-events-none"><CornerDownRight className="w-4 h-4" /></div>
                          <span className="pl-6">{sub.ro}</span>
                        </td>

                        <td className="border-r border-gray-200 px-4 py-2.5 text-center text-gray-500">{sub.abt.orang || "-"}</td>
                        <td className="border-r border-gray-200 px-4 py-2.5 text-right text-gray-600">{sub.abt.anggaran > 0 ? formatRp(sub.abt.anggaran) : "-"}</td>

                        <td className="border-r border-gray-200 px-4 py-2.5 text-center bg-gray-50/50 text-gray-500">{sub.nonAbt.orang || "-"}</td>
                        <td className="border-r border-gray-200 px-4 py-2.5 text-right bg-gray-50/50 text-gray-600">{sub.nonAbt.anggaran > 0 ? formatRp(sub.nonAbt.anggaran) : "-"}</td>

                        <td className="px-4 py-2.5 text-right bg-amber-50/30 text-amber-700 font-medium">
                          {sub.abt.anggaran + sub.nonAbt.anggaran > 0 ? formatRp(sub.abt.anggaran + sub.nonAbt.anggaran) : "-"}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
            
            <tfoot className="bg-amber-100 font-bold uppercase text-amber-900 border-b-2 border-white">
              <tr>
                <td colSpan={3} className="border-r border-amber-200 px-4 py-4 text-right">TOTAL {group.groupName}</td>
                <td className="border-r border-amber-200 px-4 py-4 text-center">{groupAbtO}</td>
                <td className="border-r border-amber-200 px-4 py-4 text-right">{formatRp(groupAbtA)}</td>
                <td className="border-r border-amber-200 px-4 py-4 text-center bg-amber-200/40">{groupNonO}</td>
                <td className="border-r border-amber-200 px-4 py-4 text-right bg-amber-200/40">{formatRp(groupNonA)}</td>
                <td className="px-4 py-4 text-right bg-amber-400 text-white shadow-inner">{formatRp(groupAbtA + groupNonA)}</td>
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
          <Download className="w-5 h-5" /> Cetak Excel Rekapan
        </button>
      </div>

      {/* RENDER TIAP TABEL BERDASARKAN GRUP */}
      {data.map((group) => 
        group.groupName.toLowerCase() === "produktivitas" 
          ? renderProduktivitasGroup(group) 
          : renderStandardGroup(group)
      )}

      {/* TABEL ANGGARAN LAINNYA */}
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
                  <th className="border-y border-emerald-900 px-4 py-3 min-w-[250px]">Keterangan</th>
                  <th className="border-y border-emerald-900 px-4 py-3 text-center text-emerald-200/60">Tidak Ada Rincian Target & Realisasi</th>
                  <th className="border-y border-emerald-900 px-4 py-3 text-center w-40">Total Anggaran (Rp.)</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {lainnyaData.map((item, idx) => (
                  <tr key={item.id} className="border-b border-emerald-50 hover:bg-emerald-50/50 transition-colors">
                    <td className="border-r border-emerald-50 px-4 py-3 text-center font-semibold">{idx + 1}</td>
                    <td className="border-r border-emerald-50 px-4 py-3 text-center text-gray-400">-</td>
                    <td className="border-r border-emerald-50 px-4 py-3 font-medium text-emerald-900">{item.nama_modul}</td>
                    <td className="border-r border-emerald-50 px-4 py-3 text-center text-gray-300 text-xs italic">Hanya Anggaran</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700 bg-emerald-50/30">{formatRp(item.anggaran)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-emerald-100 font-bold uppercase text-emerald-900 border-t-2 border-white">
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-right">TOTAL ANGGARAN LAINNYA</td>
                  <td className="px-4 py-4 text-right text-emerald-800">{formatRp(totalLainnya)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* GRAND TOTAL KESELURUHAN RAKSASA */}
      <div className="mt-8 bg-gradient-to-br from-[#15406A] to-[#1e5891] rounded-2xl shadow-xl border border-blue-800 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.64-2.25 1.64-1.74 0-2.1-.96-2.17-1.92H8.01c.08 1.84 1.25 2.92 2.89 3.28V19h2.38v-1.63c1.5-.28 2.86-1.12 2.86-2.8 0-2.31-2.14-2.92-3.83-3.43z"/>
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
            <p className="text-3xl sm:text-5xl font-black text-amber-400 drop-shadow-md">
              {formatRp(superGrandTotal)}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}