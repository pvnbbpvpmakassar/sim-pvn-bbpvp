"use client";

import React, { Fragment } from "react";
import { Download, CornerDownRight } from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { DashboardGroupData } from "@/app/actions/data";

interface RekapanTableProps {
  data: DashboardGroupData[];
}

export default function RekapanTable({ data }: RekapanTableProps) {
  // --- Fungsi Utilitas ---
  const hitungOrang = (paket: number) => paket * 16;
  const hitungPersen = (realisasi: number, orang: number) => orang > 0 ? ((realisasi / orang) * 100).toFixed(2) : "0.00";
  const formatRp = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);

  // --- Pre-Kalkulasi Grand Total (Menghindari Error Mutasi di Render) ---
  let grandTotalAbtP = 0, grandTotalAbtR = 0, grandTotalAbtA = 0;
  let grandTotalNonP = 0, grandTotalNonR = 0, grandTotalNonA = 0;

  data.forEach(group => {
    group.rows.forEach(row => {
      const hasSub = row.subRows.length > 0;
      grandTotalAbtP += hasSub ? row.subRows.reduce((sum, s) => sum + s.abt.paket, 0) : row.abt.paket;
      grandTotalAbtR += hasSub ? row.subRows.reduce((sum, s) => sum + s.abt.realisasiOrang, 0) : row.abt.realisasiOrang;
      grandTotalAbtA += hasSub ? row.subRows.reduce((sum, s) => sum + s.abt.anggaran, 0) : row.abt.anggaran;
      
      grandTotalNonP += hasSub ? row.subRows.reduce((sum, s) => sum + s.nonAbt.paket, 0) : row.nonAbt.paket;
      grandTotalNonR += hasSub ? row.subRows.reduce((sum, s) => sum + s.nonAbt.realisasiOrang, 0) : row.nonAbt.realisasiOrang;
      grandTotalNonA += hasSub ? row.subRows.reduce((sum, s) => sum + s.nonAbt.anggaran, 0) : row.nonAbt.anggaran;
    });
  });

  // --- Fungsi Download Excel ---
  const handleDownloadExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Rekapan Dashboard");

    // Pengaturan Lebar Kolom (14 Kolom)
    worksheet.columns = [
      { width: 6 }, { width: 16 }, { width: 45 }, // NO, KODE, RO
      { width: 10 }, { width: 12 }, { width: 16 }, { width: 15 }, { width: 22 }, // ABT
      { width: 10 }, { width: 12 }, { width: 16 }, { width: 15 }, { width: 22 }, // NON-ABT
      { width: 24 } // Total Anggaran
    ];

    // --- Header Tingkat 1, 2, 3 ---
    const row1 = worksheet.addRow(["NO.", "KODE", "RINCIAN OUTPUT (RO)", "ABT", "", "", "", "", "NON-ABT", "", "", "", "", "Total Anggaran"]);
    const row2 = worksheet.addRow(["", "", "", "Target", "", "Realisasi Orang", "Persentase (%)", "Anggaran (Rp.)", "Target", "", "Realisasi Orang", "Persentase (%)", "Anggaran (Rp.)", ""]);
    const row3 = worksheet.addRow(["", "", "", "Paket", "Orang", "", "", "", "Paket", "Orang", "", "", "", ""]);

    // Merge Cells untuk Header
    worksheet.mergeCells("A1:A3"); worksheet.mergeCells("B1:B3"); worksheet.mergeCells("C1:C3");
    worksheet.mergeCells("D1:H1"); worksheet.mergeCells("I1:M1"); worksheet.mergeCells("N1:N3");
    worksheet.mergeCells("D2:E2"); worksheet.mergeCells("F2:F3"); worksheet.mergeCells("G2:G3"); worksheet.mergeCells("H2:H3");
    worksheet.mergeCells("I2:J2"); worksheet.mergeCells("K2:K3"); worksheet.mergeCells("L2:L3"); worksheet.mergeCells("M2:M3");

    // Styling Header
    [row1, row2, row3].forEach(row => {
      row.eachCell({ includeEmpty: true }, cell => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF15406A" } };
        cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = { top: { style: "thin", color: { argb: "FFFFFFFF" } }, left: { style: "thin", color: { argb: "FFFFFFFF" } }, bottom: { style: "thin", color: { argb: "FFFFFFFF" } }, right: { style: "thin", color: { argb: "FFFFFFFF" } } };
      });
    });

    const applyBorder = (row: ExcelJS.Row, alignRightCols: number[] = []) => {
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.border = { top: { style: "thin", color: { argb: "FFCCCCCC" } }, left: { style: "thin", color: { argb: "FFCCCCCC" } }, bottom: { style: "thin", color: { argb: "FFCCCCCC" } }, right: { style: "thin", color: { argb: "FFCCCCCC" } } };
        cell.alignment = { vertical: "middle", horizontal: alignRightCols.includes(colNumber) ? "right" : (colNumber === 3 ? "left" : "center") };
      });
    };

    // --- Mengisi Data ---
    let globalNo = 1;
    data.forEach(group => {
      let groupAbtP = 0, groupAbtR = 0, groupAbtA = 0;
      let groupNonP = 0, groupNonR = 0, groupNonA = 0;

      group.rows.forEach(row => {
        const hasSub = row.subRows.length > 0;
        const abtP = hasSub ? row.subRows.reduce((sum, s) => sum + s.abt.paket, 0) : row.abt.paket;
        const abtR = hasSub ? row.subRows.reduce((sum, s) => sum + s.abt.realisasiOrang, 0) : row.abt.realisasiOrang;
        const abtA = hasSub ? row.subRows.reduce((sum, s) => sum + s.abt.anggaran, 0) : row.abt.anggaran;
        const abtO = hitungOrang(abtP);
        
        const nonP = hasSub ? row.subRows.reduce((sum, s) => sum + s.nonAbt.paket, 0) : row.nonAbt.paket;
        const nonR = hasSub ? row.subRows.reduce((sum, s) => sum + s.nonAbt.realisasiOrang, 0) : row.nonAbt.realisasiOrang;
        const nonA = hasSub ? row.subRows.reduce((sum, s) => sum + s.nonAbt.anggaran, 0) : row.nonAbt.anggaran;
        const nonO = hitungOrang(nonP);

        groupAbtP += abtP; groupAbtR += abtR; groupAbtA += abtA;
        groupNonP += nonP; groupNonR += nonR; groupNonA += nonA;

        const pRow = worksheet.addRow([
          globalNo++, row.kode, row.ro,
          abtP, abtO, abtR, `${hitungPersen(abtR, abtO)}%`, abtA,
          nonP, nonO, nonR, `${hitungPersen(nonR, nonO)}%`, nonA,
          abtA + nonA
        ]);
        applyBorder(pRow, [8, 13, 14]);
        if (hasSub) { pRow.font = { bold: true }; pRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F8FF" } }; } // AliceBlue

        row.subRows.forEach(sub => {
          const sAbtO = hitungOrang(sub.abt.paket);
          const sNonO = hitungOrang(sub.nonAbt.paket);
          const sRow = worksheet.addRow([
            "", sub.kode, `    ↳ ${sub.ro}`,
            sub.abt.paket, sAbtO, sub.abt.realisasiOrang, `${hitungPersen(sub.abt.realisasiOrang, sAbtO)}%`, sub.abt.anggaran,
            sub.nonAbt.paket, sNonO, sub.nonAbt.realisasiOrang, `${hitungPersen(sub.nonAbt.realisasiOrang, sNonO)}%`, sub.nonAbt.anggaran,
            sub.abt.anggaran + sub.nonAbt.anggaran
          ]);
          applyBorder(sRow, [8, 13, 14]);
        });
      });

      // --- Baris Jumlah per Modul ---
      const totalRow = worksheet.addRow([
        "", "", `JUMLAH ${group.groupName.toUpperCase()}`,
        groupAbtP, hitungOrang(groupAbtP), groupAbtR, `${hitungPersen(groupAbtR, hitungOrang(groupAbtP))}%`, groupAbtA,
        groupNonP, hitungOrang(groupNonP), groupNonR, `${hitungPersen(groupNonR, hitungOrang(groupNonP))}%`, groupNonA,
        groupAbtA + groupNonA
      ]);
      worksheet.mergeCells(`A${totalRow.number}:C${totalRow.number}`);
      totalRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE4B5" } }; // Moccasin
        cell.font = { bold: true, color: { argb: "FF8B4513" } }; // SaddleBrown
        cell.border = { top: { style: "thin", color: { argb: "FFDEB887" } }, left: { style: "thin", color: { argb: "FFDEB887" } }, bottom: { style: "thin", color: { argb: "FFDEB887" } }, right: { style: "thin", color: { argb: "FFDEB887" } } };
        cell.alignment = { vertical: "middle", horizontal: colNum === 3 || [8, 13, 14].includes(colNum) ? "right" : "center" };
      });
    });

    // --- Grand Total ---
    const grandRow = worksheet.addRow([
      "", "", "TOTAL KESELURUHAN",
      grandTotalAbtP, hitungOrang(grandTotalAbtP), grandTotalAbtR, `${hitungPersen(grandTotalAbtR, hitungOrang(grandTotalAbtP))}%`, grandTotalAbtA,
      grandTotalNonP, hitungOrang(grandTotalNonP), grandTotalNonR, `${hitungPersen(grandTotalNonR, hitungOrang(grandTotalNonP))}%`, grandTotalNonA,
      grandTotalAbtA + grandTotalNonA
    ]);
    worksheet.mergeCells(`A${grandRow.number}:C${grandRow.number}`);
    grandRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF15406A" } };
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.alignment = { vertical: "middle", horizontal: colNum === 3 || [8, 13, 14].includes(colNum) ? "right" : "center" };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), "Rekapan_Dashboard_SIMPVN.xlsx");
  };

  let globalRowNumber = 1;

  return (
    <div className="space-y-4">
      {/* Tombol Ekspor Khusus Rekapan */}
      <div className="flex justify-end">
        <button onClick={handleDownloadExcel} className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2.5 rounded-lg font-bold border border-emerald-200 transition-colors hover:bg-emerald-100 shadow-sm">
          <Download className="w-4 h-4" /> Cetak Excel Rekapan
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm text-left border-collapse min-w-max">
            <thead className="bg-[#15406A] text-white">
              <tr>
                <th rowSpan={3} className="border border-[#1a4e82] px-4 py-3 text-center w-12">NO.</th>
                <th rowSpan={3} className="border border-[#1a4e82] px-4 py-3 w-32">KODE</th>
                <th rowSpan={3} className="border border-[#1a4e82] px-4 py-3 min-w-[250px]">Rincian Output (RO)</th>
                <th colSpan={5} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#184878]">ABT</th>
                <th colSpan={5} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#153a5e]">NON-ABT</th>
                <th rowSpan={3} className="border border-[#1a4e82] px-4 py-3 text-center w-40 bg-[#12304d]">Total Anggaran</th>
              </tr>
              <tr>
                <th colSpan={2} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#1c548c]">Target</th>
                <th rowSpan={2} className="border border-[#1a4e82] px-3 py-3 text-center bg-[#1c548c] w-24">Realisasi Orang</th>
                <th rowSpan={2} className="border border-[#1a4e82] px-3 py-3 text-center bg-[#1c548c] w-24">Persentase (%)</th>
                <th rowSpan={2} className="border border-[#1a4e82] px-4 py-3 text-center bg-[#1c548c] w-32">Anggaran (Rp.)</th>
                
                <th colSpan={2} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#194269]">Target</th>
                <th rowSpan={2} className="border border-[#1a4e82] px-3 py-3 text-center bg-[#194269] w-24">Realisasi Orang</th>
                <th rowSpan={2} className="border border-[#1a4e82] px-3 py-3 text-center bg-[#194269] w-24">Persentase (%)</th>
                <th rowSpan={2} className="border border-[#1a4e82] px-4 py-3 text-center bg-[#194269] w-32">Anggaran (Rp.)</th>
              </tr>
              <tr>
                <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#2060a0] w-16">Paket</th>
                <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#2060a0] w-16">Orang</th>
                <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#1c4b78] w-16">Paket</th>
                <th className="border border-[#1a4e82] px-3 py-2 text-center bg-[#1c4b78] w-16">Orang</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {data.map((group) => {
                let groupAbtP = 0, groupAbtR = 0, groupAbtA = 0;
                let groupNonP = 0, groupNonR = 0, groupNonA = 0;

                return (
                  <Fragment key={group.groupName}>
                    {group.rows.map((row) => {
                      const hasSub = row.subRows.length > 0;
                      
                      const abtP = hasSub ? row.subRows.reduce((sum, s) => sum + s.abt.paket, 0) : row.abt.paket;
                      const abtR = hasSub ? row.subRows.reduce((sum, s) => sum + s.abt.realisasiOrang, 0) : row.abt.realisasiOrang;
                      const abtA = hasSub ? row.subRows.reduce((sum, s) => sum + s.abt.anggaran, 0) : row.abt.anggaran;
                      const abtO = hitungOrang(abtP);

                      const nonP = hasSub ? row.subRows.reduce((sum, s) => sum + s.nonAbt.paket, 0) : row.nonAbt.paket;
                      const nonR = hasSub ? row.subRows.reduce((sum, s) => sum + s.nonAbt.realisasiOrang, 0) : row.nonAbt.realisasiOrang;
                      const nonA = hasSub ? row.subRows.reduce((sum, s) => sum + s.nonAbt.anggaran, 0) : row.nonAbt.anggaran;
                      const nonO = hitungOrang(nonP);

                      groupAbtP += abtP; groupAbtR += abtR; groupAbtA += abtA;
                      groupNonP += nonP; groupNonR += nonR; groupNonA += nonA;

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

                          {row.subRows.map((sub) => {
                            const sAbtO = hitungOrang(sub.abt.paket);
                            const sNonO = hitungOrang(sub.nonAbt.paket);

                            return (
                              <tr key={sub.id} className="border-b border-gray-100 hover:bg-slate-50 transition-colors text-sm">
                                <td className="border-r border-gray-200 px-4 py-2"></td>
                                <td className="border-r border-gray-200 px-4 py-2">{sub.kode}</td>
                                <td className="border-r border-gray-200 px-4 py-2 relative">
                                  <div className="absolute left-2 top-2.5 text-gray-300 pointer-events-none"><CornerDownRight className="w-4 h-4" /></div>
                                  <span className="pl-6">{sub.ro}</span>
                                </td>

                                <td className="border-r border-gray-200 px-3 py-2 text-center text-gray-500">{sub.abt.paket || "-"}</td>
                                <td className="border-r border-gray-200 px-3 py-2 text-center text-gray-500">{sAbtO || "-"}</td>
                                <td className="border-r border-gray-200 px-3 py-2 text-center text-gray-500">{sub.abt.realisasiOrang || "-"}</td>
                                <td className="border-r border-gray-200 px-3 py-2 text-center text-[#15406A]">{hitungPersen(sub.abt.realisasiOrang, sAbtO)}%</td>
                                <td className="border-r border-gray-200 px-4 py-2 text-right text-gray-600">{sub.abt.anggaran > 0 ? formatRp(sub.abt.anggaran) : "-"}</td>

                                <td className="border-r border-gray-200 px-3 py-2 text-center bg-gray-50/50 text-gray-500">{sub.nonAbt.paket || "-"}</td>
                                <td className="border-r border-gray-200 px-3 py-2 text-center bg-gray-50/50 text-gray-500">{sNonO || "-"}</td>
                                <td className="border-r border-gray-200 px-3 py-2 text-center bg-gray-50/50 text-gray-500">{sub.nonAbt.realisasiOrang || "-"}</td>
                                <td className="border-r border-gray-200 px-3 py-2 text-center bg-gray-50/50 text-[#15406A]">{hitungPersen(sub.nonAbt.realisasiOrang, sNonO)}%</td>
                                <td className="border-r border-gray-200 px-4 py-2 text-right bg-gray-50/50 text-gray-600">{sub.nonAbt.anggaran > 0 ? formatRp(sub.nonAbt.anggaran) : "-"}</td>

                                <td className="px-4 py-2 text-right bg-amber-50/30 text-amber-700 font-medium">
                                  {sub.abt.anggaran + sub.nonAbt.anggaran > 0 ? formatRp(sub.abt.anggaran + sub.nonAbt.anggaran) : "-"}
                                </td>
                              </tr>
                            );
                          })}
                        </Fragment>
                      );
                    })}

                    {/* --- Baris Jumlah (Subtotal per Group) --- */}
                    <tr className="bg-amber-100 font-bold uppercase text-amber-900 border-b-2 border-white">
                      <td colSpan={3} className="border-r border-amber-200 px-4 py-3 text-right">JUMLAH {group.groupName}</td>
                      
                      <td className="border-r border-amber-200 px-3 py-3 text-center">{groupAbtP}</td>
                      <td className="border-r border-amber-200 px-3 py-3 text-center">{hitungOrang(groupAbtP)}</td>
                      <td className="border-r border-amber-200 px-3 py-3 text-center">{groupAbtR}</td>
                      <td className="border-r border-amber-200 px-3 py-3 text-center">{hitungPersen(groupAbtR, hitungOrang(groupAbtP))}%</td>
                      <td className="border-r border-amber-200 px-4 py-3 text-right">{formatRp(groupAbtA)}</td>

                      <td className="border-r border-amber-200 px-3 py-3 text-center bg-amber-200/40">{groupNonP}</td>
                      <td className="border-r border-amber-200 px-3 py-3 text-center bg-amber-200/40">{hitungOrang(groupNonP)}</td>
                      <td className="border-r border-amber-200 px-3 py-3 text-center bg-amber-200/40">{groupNonR}</td>
                      <td className="border-r border-amber-200 px-3 py-3 text-center bg-amber-200/40">{hitungPersen(groupNonR, hitungOrang(groupNonP))}%</td>
                      <td className="border-r border-amber-200 px-4 py-3 text-right bg-amber-200/40">{formatRp(groupNonA)}</td>

                      <td className="px-4 py-3 text-right bg-amber-400 text-white shadow-inner">{formatRp(groupAbtA + groupNonA)}</td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
            
            {/* --- Baris Grand Total (Total Keseluruhan) --- */}
            {data.length > 0 && (
              <tfoot className="bg-[#15406A] text-white font-bold tracking-wide">
                <tr>
                  <td colSpan={3} className="border-r border-[#1a4e82] px-4 py-4 text-right uppercase">TOTAL KESELURUHAN</td>
                  
                  <td className="border-r border-[#1a4e82] px-3 py-4 text-center">{grandTotalAbtP}</td>
                  <td className="border-r border-[#1a4e82] px-3 py-4 text-center text-blue-200">{hitungOrang(grandTotalAbtP)}</td>
                  <td className="border-r border-[#1a4e82] px-3 py-4 text-center">{grandTotalAbtR}</td>
                  <td className="border-r border-[#1a4e82] px-3 py-4 text-center text-emerald-300">{hitungPersen(grandTotalAbtR, hitungOrang(grandTotalAbtP))}%</td>
                  <td className="border-r border-[#1a4e82] px-4 py-4 text-right text-amber-300">{formatRp(grandTotalAbtA)}</td>

                  <td className="border-r border-[#1a4e82] px-3 py-4 text-center bg-[#12304d]">{grandTotalNonP}</td>
                  <td className="border-r border-[#1a4e82] px-3 py-4 text-center bg-[#12304d] text-blue-200">{hitungOrang(grandTotalNonP)}</td>
                  <td className="border-r border-[#1a4e82] px-3 py-4 text-center bg-[#12304d]">{grandTotalNonR}</td>
                  <td className="border-r border-[#1a4e82] px-3 py-4 text-center bg-[#12304d] text-emerald-300">{hitungPersen(grandTotalNonR, hitungOrang(grandTotalNonP))}%</td>
                  <td className="border-r border-[#1a4e82] px-4 py-4 text-right bg-[#12304d] text-amber-300">{formatRp(grandTotalNonA)}</td>

                  <td className="px-4 py-4 text-right bg-amber-500 shadow-inner">{formatRp(grandTotalAbtA + grandTotalNonA)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}