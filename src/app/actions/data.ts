// src/app/actions/data.ts
"use server";

import { sql } from "@/lib/db";

export type SubRowData = {
  id: string;
  kode: string;
  ro: string;
  paket: number;
  orang: number; // TAMBAHAN
  realisasi: number;
  isReadOnly?: boolean;
};

export type RowData = {
  id: string;
  kode: string;
  ro: string;
  paket: number;
  orang: number; // TAMBAHAN
  realisasi: number;
  isReadOnly?: boolean;
  subRows: SubRowData[];
};

// Fungsi Read (Menarik Data
// Fungsi Read (Menarik Data)
export async function getRincianOutput(kategori: string, modul: string) {
  try {
    const data = await sql`
      SELECT * FROM rincian_output 
      WHERE kategori = ${kategori} AND modul = ${modul}
    `;

    const parents = data.filter((row) => row.parent_id === null);
    const children = data.filter((row) => row.parent_id !== null);

    const formattedData = parents
      .map((parent) => {
        const subRows = children
          .filter((child) => child.parent_id === parent.id)
          .map((child) => ({
            id: child.id,
            kode: child.kode || "-",
            ro: child.nama_ro,
            paket: child.paket,
            orang: child.target_orang || 0,
            realisasi: child.realisasi,
            isReadOnly: child.is_read_only,
          }))
          // MENGURUTKAN SUB-RO DARI BACKEND
          .sort((a, b) => a.kode.localeCompare(b.kode, undefined, { numeric: true, sensitivity: "base" }));

        return {
          id: parent.id,
          kode: parent.kode || "-",
          ro: parent.nama_ro,
          paket: parent.paket,
          orang: parent.target_orang || 0,
          realisasi: parent.realisasi,
          isReadOnly: parent.is_read_only,
          subRows: subRows,
        };
      })
      // MENGURUTKAN RO (BARIS INDUK) DARI BACKEND
      .sort((a, b) => a.kode.localeCompare(b.kode, undefined, { numeric: true, sensitivity: "base" }));

    return { success: true, data: formattedData };
  } catch (error: unknown) {
    console.error("Gagal mengambil data:", error);
    if (error instanceof Error) return { success: false, error: error.message };
    return { success: false, error: "Gagal mengambil data dari database" };
  }
}

// Fungsi Upsert/Bulk Save (Menyimpan Data)
// <-- any[] diganti menjadi RowData[]
// Fungsi Upsert/Bulk Save (Menyimpan Data)
export async function simpanBulkRincianOutput(kategori: string, modul: string, rows: RowData[]) {
  try {
    await sql`
      DELETE FROM rincian_output 
      WHERE kategori = ${kategori} AND modul = ${modul} AND is_read_only = FALSE
    `;

    for (const row of rows) {
      if (row.isReadOnly) {
        const manualSubRows = row.subRows ? row.subRows.filter((sub) => !sub.isReadOnly) : [];

        if (manualSubRows.length > 0) {
          const existingParent = await sql`SELECT id FROM rincian_output WHERE id = ${row.id}`;
          if (existingParent.length === 0) {
            await sql`
              INSERT INTO rincian_output (id, kategori, modul, kode, nama_ro, paket, target_orang, realisasi, is_read_only)
              VALUES (${row.id}, ${kategori}, ${modul}, ${row.kode}, ${row.ro}, ${row.paket}, ${row.orang}, ${row.realisasi}, TRUE)
            `;
          }

          for (const sub of manualSubRows) {
            await sql`
              INSERT INTO rincian_output (id, kategori, modul, parent_id, kode, nama_ro, paket, target_orang, realisasi, is_read_only)
              VALUES (${sub.id}, ${kategori}, ${modul}, ${row.id}, ${sub.kode}, ${sub.ro}, ${sub.paket}, ${sub.orang}, ${sub.realisasi}, FALSE)
            `;
          }
        }
        continue;
      }

      await sql`
        INSERT INTO rincian_output (id, kategori, modul, kode, nama_ro, paket, target_orang, realisasi, is_read_only)
        VALUES (${row.id}, ${kategori}, ${modul}, ${row.kode}, ${row.ro}, ${row.paket}, ${row.orang}, ${row.realisasi}, FALSE)
      `;

      if (row.subRows && row.subRows.length > 0) {
        for (const sub of row.subRows) {
          if (sub.isReadOnly) continue;
          await sql`
            INSERT INTO rincian_output (id, kategori, modul, parent_id, kode, nama_ro, paket, target_orang, realisasi, is_read_only)
            VALUES (${sub.id}, ${kategori}, ${modul}, ${row.id}, ${sub.kode}, ${sub.ro}, ${sub.paket}, ${sub.orang}, ${sub.realisasi}, FALSE)
          `;
        }
      }
    }
    return { success: true };
  } catch (error: unknown) {
    console.error("Gagal melakukan operasi database:", error);
    if (error instanceof Error) return { success: false, error: error.message };
    return { success: false, error: "Terjadi kesalahan yang tidak diketahui pada server." };
  }
}

export async function getIntegrasiUPTP(kategori: string) {
  try {
    const data = await sql`
      SELECT * FROM rincian_output 
      WHERE kategori = ${kategori} AND modul IN ('blkk', 'lpks', 'tmt')
      ORDER BY created_at ASC
    `;

    const hitungTotal = (modulName: string) => {
      const modulData = data.filter((d) => d.modul === modulName);
      const parents = modulData.filter((d) => d.parent_id === null);
      const children = modulData.filter((d) => d.parent_id !== null);

      let totalPaket = 0;
      let totalOrang = 0;
      let totalRealisasi = 0;

      parents.forEach((p) => {
        const subs = children.filter((c) => c.parent_id === p.id);
        if (subs.length > 0) {
          totalPaket += subs.reduce((acc, c) => acc + (c.paket || 0), 0);
          totalOrang += subs.reduce((acc, c) => acc + (c.target_orang || 0), 0);
          totalRealisasi += subs.reduce((acc, c) => acc + (c.realisasi || 0), 0);
        } else {
          totalPaket += p.paket || 0;
          totalOrang += p.target_orang || 0;
          totalRealisasi += p.realisasi || 0;
        }
      });

      // PERBAIKAN: Cari kode asli pertama yang diinput user, bukan sekadar index 0
      const firstValidCode = parents.find((p) => p.kode && p.kode !== "-")?.kode || "-";

      return {
        kode: firstValidCode,
        paket: totalPaket,
        orang: totalOrang,
        realisasi: totalRealisasi,
      };
    };

    return {
      success: true,
      data: {
        blkk: hitungTotal("blkk"),
        lpks: hitungTotal("lpks"),
        tmt: hitungTotal("tmt"),
      },
    };
  } catch (error: unknown) {
    console.error("Gagal melakukan operasi database:", error);
    if (error instanceof Error) return { success: false, error: error.message };
    return { success: false, error: "Terjadi kesalahan server." };
  }
}

// --- Tipe Data Khusus Satpel ---
// --- Tipe Data Khusus Satpel ---
export type LokasiSatpel = {
  id: string;
  name: string;
};

export type SatpelSubRowData = {
  id: string;
  kode: string;
  ro: string;
  // TAMBAHAN: Masukkan 'orang' ke dalam Record JSON
  data: Record<string, { paket: number; orang?: number; realisasi: number }>;
};

export type SatpelRowData = {
  id: string;
  kode: string;
  ro: string;
  // TAMBAHAN: Masukkan 'orang' ke dalam Record JSON
  data: Record<string, { paket: number; orang?: number; realisasi: number }>;
  subRows: SatpelSubRowData[];
};

// --- Fungsi Read Khusus Satpel ---
export async function getSatpelData(kategori: string) {
  try {
    // 1. Ambil daftar kolom lokasi
    const locs = await sql`
      SELECT id, nama_lokasi as name 
      FROM lokasi_satpel 
      WHERE kategori = ${kategori} 
      ORDER BY urutan ASC
    `;

    // 2. Ambil baris data
    const data = await sql`
      SELECT * FROM rincian_output 
      WHERE kategori = ${kategori} AND modul = 'satpel'
    `;

    const parents = data.filter((row) => row.parent_id === null);
    const children = data.filter((row) => row.parent_id !== null);

    const formattedData = parents
      .map((parent) => {
        const subRows = children
          .filter((child) => child.parent_id === parent.id)
          .map((child) => ({
            id: child.id,
            kode: child.kode || "-",
            ro: child.nama_ro,
            data: child.data_satpel || {},
          }))
          // MENGURUTKAN SUB-RO SATPEL DARI BACKEND
          .sort((a, b) => a.kode.localeCompare(b.kode, undefined, { numeric: true, sensitivity: "base" }));

        return {
          id: parent.id,
          kode: parent.kode || "-",
          ro: parent.nama_ro,
          data: parent.data_satpel || {},
          subRows: subRows,
        };
      })
      // MENGURUTKAN RO SATPEL DARI BACKEND
      .sort((a, b) => a.kode.localeCompare(b.kode, undefined, { numeric: true, sensitivity: "base" }));

    return { success: true, locations: locs, data: formattedData };
  } catch (error: unknown) {
    console.error("Gagal mengambil data Satpel:", error);
    if (error instanceof Error) return { success: false, error: error.message };
    return { success: false, error: "Gagal mengambil data dari database" };
  }
}

// --- Fungsi Upsert Khusus Satpel ---
export async function simpanSatpelData(kategori: string, locations: LokasiSatpel[], rows: SatpelRowData[]) {
  try {
    // 1. Reset data lama untuk kategori dan modul ini
    await sql`DELETE FROM lokasi_satpel WHERE kategori = ${kategori}`;
    await sql`DELETE FROM rincian_output WHERE kategori = ${kategori} AND modul = 'satpel'`;

    // 2. Simpan urutan kolom lokasi baru
    for (let i = 0; i < locations.length; i++) {
      await sql`
        INSERT INTO lokasi_satpel (id, kategori, nama_lokasi, urutan) 
        VALUES (${locations[i].id}, ${kategori}, ${locations[i].name}, ${i})
      `;
    }

    // 3. Simpan baris data beserta JSONB
    for (const row of rows) {
      const rowDataJson = JSON.stringify(row.data || {});
      await sql`
        INSERT INTO rincian_output (id, kategori, modul, kode, nama_ro, data_satpel, is_read_only)
        VALUES (${row.id}, ${kategori}, 'satpel', ${row.kode}, ${row.ro}, ${rowDataJson}, FALSE)
      `;

      if (row.subRows && row.subRows.length > 0) {
        for (const sub of row.subRows) {
          const subDataJson = JSON.stringify(sub.data || {});
          await sql`
            INSERT INTO rincian_output (id, kategori, modul, parent_id, kode, nama_ro, data_satpel, is_read_only)
            VALUES (${sub.id}, ${kategori}, 'satpel', ${row.id}, ${sub.kode}, ${sub.ro}, ${subDataJson}, FALSE)
          `;
        }
      }
    }
    return { success: true };
  } catch (error: unknown) {
    console.error("Gagal menyimpan data Satpel:", error);
    if (error instanceof Error) return { success: false, error: error.message };
    return { success: false, error: "Terjadi kesalahan saat menyimpan Satpel." };
  }
}

// --- Tipe Data Alokasi Anggaran ---
export type AlokasiRowData = { id: string; nama_modul: string; anggaran: number; realisasi: number };
// --- Fungsi Read (Menarik Data Alokasi Anggaran) ---

// --- Fungsi Read (Menarik Data Alokasi Anggaran) ---
export async function getAlokasiAnggaran() {
  try {
    const data = await sql`
      SELECT * FROM alokasi_anggaran 
      ORDER BY created_at ASC
    `;

    const format = (kategori: string) => data
      .filter((d) => d.kategori === kategori)
      .map((d) => ({
        id: d.id,
        nama_modul: d.nama_modul,
        anggaran: Number(d.anggaran),
        realisasi: Number(d.realisasi),
      }));

    return { 
      success: true, 
      data: { 
        abt: format("ABT"), 
        nonAbt: format("NON-ABT"),
        lainnya: format("LAINNYA") // TAMBAHAN: Tarik data kategori LAINNYA
      } 
    };
  } catch (error: unknown) {
    if (error instanceof Error) return { success: false, error: error.message };
    return { success: false, error: "Gagal mengambil data dari database" };
  }
}

// --- Fungsi Upsert (Menyimpan Data Alokasi Anggaran) ---
export async function simpanBulkAlokasiAnggaran(abtRows: AlokasiRowData[], nonAbtRows: AlokasiRowData[], lainnyaRows: AlokasiRowData[] = []) {
  try {
    // Pendekatan sinkronisasi penuh: Hapus semua data lama dan masukkan yang baru
    await sql`DELETE FROM alokasi_anggaran`;

    const insertRow = async (row: AlokasiRowData, kategori: string) => {
      await sql`
        INSERT INTO alokasi_anggaran (id, kategori, nama_modul, anggaran, realisasi)
        VALUES (${row.id}, ${kategori}, ${row.nama_modul}, ${row.anggaran}, ${row.realisasi})
      `;
    };

    // Eksekusi penyimpanan semua kategori
    for (const row of abtRows) await insertRow(row, 'ABT');
    for (const row of nonAbtRows) await insertRow(row, 'NON-ABT');
    for (const row of lainnyaRows) await insertRow(row, 'LAINNYA'); // TAMBAHAN: Simpan LAINNYA

    return { success: true };
  } catch (error: unknown) {
    if (error instanceof Error) return { success: false, error: error.message };
    return { success: false, error: "Terjadi kesalahan saat menyimpan Alokasi Anggaran." };
  }
}

// --- Tipe Data Rincian Anggaran ---
// --- Tipe Data Rincian Anggaran ---
export type AnggaranSubRowData = {
  id: string;
  kode: string;
  ro: string;
  anggaran: number;
  realisasi: number;
  isFromDB?: boolean;
  fallbackInsert?: { kategori: string; modul: string; kode: string; ro: string; parent_id: string | null };
};

export type AnggaranRowData = {
  id: string;
  kode: string;
  ro: string;
  anggaran: number;
  realisasi: number;
  subRows: AnggaranSubRowData[];
  isFromDB?: boolean;
  fallbackInsert?: { kategori: string; modul: string; kode: string; ro: string; parent_id: string | null };
};

export type ModulAnggaranGroup = {
  modul: string;
  alokasi: number;
  rows: AnggaranRowData[];
};

export async function getRincianAnggaran() {
  try {
    const roData = (await sql`SELECT * FROM rincian_output ORDER BY modul, created_at ASC`) as RawRow[];
    const alokasiData = await sql`SELECT * FROM alokasi_anggaran`;

    const formatData = (kategori: string): ModulAnggaranGroup[] => {
      const filtered = roData.filter((r) => r.kategori === kategori);
      const alokasiKategori = alokasiData.filter((a) => a.kategori === kategori);

      const uptpGroupModules = ["uptp", "tmt", "lpks", "blkk", "satpel", "uptd", "plfk", "pflk"];
      const independentModules = Array.from(new Set(filtered.map((r) => r.modul))).filter((m) => !uptpGroupModules.includes(m.toLowerCase()));

      const result: ModulAnggaranGroup[] = [];

      const buildRowsForModule = (modulName: string, prefix: string = ""): AnggaranRowData[] => {
        const modData = filtered.filter((r) => r.modul === modulName);
        const parents = modData.filter((r) => r.parent_id === null);
        const children = modData.filter((r) => r.parent_id !== null);

        return parents.map((p) => {
          const subs = children
            .filter((c) => c.parent_id === p.id)
            .map((c) => ({
              id: c.id,
              kode: c.kode || "-",
              ro: c.nama_ro,
              anggaran: Number(c.anggaran || 0),
              realisasi: Number(c.realisasi_anggaran || 0),
              isFromDB: true,
            }));
          return {
            id: p.id,
            kode: p.kode || "-",
            ro: prefix ? `${prefix} ${p.nama_ro}` : p.nama_ro,
            anggaran: Number(p.anggaran || 0),
            realisasi: Number(p.realisasi_anggaran || 0),
            isFromDB: true,
            subRows: subs,
          };
        });
      };

      independentModules.forEach((modul) => {
        const alokasiMatch = alokasiKategori.find((a) => a.nama_modul.toLowerCase().includes(modul.toLowerCase()));
        result.push({ modul, alokasi: alokasiMatch ? Number(alokasiMatch.anggaran) : 0, rows: buildRowsForModule(modul) });
      });

      // --- LOGIKA MEGA GRUP UPTP ---
      const hasUptpData = filtered.some((r) => uptpGroupModules.includes(r.modul));
      const uptpAlokasiMatch = alokasiKategori.find((a) => a.nama_modul.toLowerCase().includes("uptp"));

      if (hasUptpData || uptpAlokasiMatch) {
        const PARENT_UUID = kategori === "ABT" ? "11111111-1111-1111-1111-111111111111" : "22222222-2222-2222-2222-222222222222";

        const getIntegrasiRow = (modulName: string, roName: string, fallbackId: string) => {
          const modData = filtered.filter((r) => r.modul === modulName);
          if (modData.length === 0) return null;

          const parents = modData.filter((r) => r.parent_id === null);
          const firstValidCode = parents.find((p) => p.kode && p.kode !== "-")?.kode || "-";
          const realId = parents.length > 0 ? parents[0].id : fallbackId;

          const totalAnggaran = modData.reduce((acc, curr) => acc + Number(curr.anggaran || 0), 0);
          const totalRealisasi = modData.reduce((acc, curr) => acc + Number(curr.realisasi_anggaran || 0), 0);

          return {
            id: realId,
            kode: firstValidCode,
            ro: roName,
            anggaran: totalAnggaran,
            realisasi: totalRealisasi,
            isFromDB: true,
          };
        };

        const integratedSubRows: AnggaranSubRowData[] = [];

        // PERBAIKAN: Masukkan logika penyisipan Sub-RO untuk NON-ABT juga
        if (kategori === "ABT") {
          const tmt = getIntegrasiRow("tmt", "TMT", "11111111-1111-1111-1111-111111111112");
          if (tmt) integratedSubRows.push(tmt);
          else integratedSubRows.push({ id: "11111111-1111-1111-1111-111111111112", kode: "-", ro: "TMT", anggaran: 0, realisasi: 0, isFromDB: true });

          const lpks = getIntegrasiRow("lpks", "LPKS", "11111111-1111-1111-1111-111111111113");
          if (lpks) integratedSubRows.push(lpks);
          else integratedSubRows.push({ id: "11111111-1111-1111-1111-111111111113", kode: "-", ro: "LPKS", anggaran: 0, realisasi: 0, isFromDB: true });

          const blkk = getIntegrasiRow("blkk", "BLKK", "11111111-1111-1111-1111-111111111114");
          if (blkk) integratedSubRows.push(blkk);
          else integratedSubRows.push({ id: "11111111-1111-1111-1111-111111111114", kode: "-", ro: "BLKK", anggaran: 0, realisasi: 0, isFromDB: true });
        } else if (kategori === "NON-ABT") {
          const tmt = getIntegrasiRow("tmt", "TMT", "22222222-2222-2222-2222-222222222223");
          if (tmt) integratedSubRows.push(tmt);
          else integratedSubRows.push({ id: "22222222-2222-2222-2222-222222222223", kode: "-", ro: "TMT", anggaran: 0, realisasi: 0, isFromDB: true });

          const lpks = getIntegrasiRow("lpks", "LPKS", "22222222-2222-2222-2222-222222222224");
          if (lpks) integratedSubRows.push(lpks);
          else integratedSubRows.push({ id: "22222222-2222-2222-2222-222222222224", kode: "-", ro: "LPKS", anggaran: 0, realisasi: 0, isFromDB: true });

          const blkk = getIntegrasiRow("blkk", "BLKK", "22222222-2222-2222-2222-222222222225");
          if (blkk) integratedSubRows.push(blkk);
          else integratedSubRows.push({ id: "22222222-2222-2222-2222-222222222225", kode: "-", ro: "BLKK", anggaran: 0, realisasi: 0, isFromDB: true });
        }

        const uptpChildren = filtered.filter((r) => r.modul === "uptp" && r.parent_id !== null);
        const manualSubs = uptpChildren
          .filter((c) => c.parent_id === PARENT_UUID && c.is_read_only === false)
          .map((c) => ({
            id: c.id,
            kode: c.kode || "-",
            ro: c.nama_ro,
            anggaran: Number(c.anggaran || 0),
            realisasi: Number(c.realisasi_anggaran || 0),
            isFromDB: true,
          }));

        const parentDbRow = filtered.find((r) => r.id === PARENT_UUID);
        const integratedRow: AnggaranRowData = {
          id: PARENT_UUID,
          kode: parentDbRow?.kode || "4057.SCO.003",
          ro: "Bidang Industri dan Jasa",
          anggaran: Number(parentDbRow?.anggaran || 0),
          realisasi: Number(parentDbRow?.realisasi_anggaran || 0),
          isFromDB: true,
          fallbackInsert: parentDbRow ? undefined : { kategori, modul: "uptp", kode: "4057.SCO.003", ro: "Bidang Industri dan Jasa", parent_id: null },
          subRows: [...integratedSubRows, ...manualSubs],
        };

        const otherUptpParents = filtered.filter((r) => r.modul === "uptp" && r.parent_id === null && r.id !== PARENT_UUID);
        const otherUptpRows: AnggaranRowData[] = otherUptpParents.map((p) => ({
          id: p.id,
          kode: p.kode || "-",
          ro: p.nama_ro,
          anggaran: Number(p.anggaran || 0),
          realisasi: Number(p.realisasi_anggaran || 0),
          isFromDB: true,
          subRows: uptpChildren
            .filter((c) => c.parent_id === p.id)
            .map((c) => ({
              id: c.id,
              kode: c.kode || "-",
              ro: c.nama_ro,
              anggaran: Number(c.anggaran || 0),
              realisasi: Number(c.realisasi_anggaran || 0),
              isFromDB: true,
            })),
        }));

        const satpelRows = buildRowsForModule("satpel", "");
        const uptdRows = buildRowsForModule("uptd", "");
        const plfkRows = [...buildRowsForModule("plfk", ""), ...buildRowsForModule("pflk", "")];

        const allUptpGroupRows = [integratedRow, ...otherUptpRows, ...satpelRows, ...uptdRows, ...plfkRows];

        const mergedMap = new Map<string, AnggaranRowData>();

        allUptpGroupRows.forEach((r) => {
          const key = `${r.kode}:::${r.ro.toLowerCase().trim()}`;
          if (mergedMap.has(key)) {
            const existing = mergedMap.get(key)!;
            existing.anggaran += r.anggaran;
            existing.realisasi += r.realisasi;

            r.subRows.forEach((sub) => {
              const subKey = `${sub.kode}:::${sub.ro.toLowerCase().trim()}`;
              const existingSub = existing.subRows.find((s) => `${s.kode}:::${s.ro.toLowerCase().trim()}` === subKey);
              if (existingSub) {
                existingSub.anggaran += sub.anggaran;
                existingSub.realisasi += sub.realisasi;
              } else {
                existing.subRows.push({ ...sub });
              }
            });
          } else {
            mergedMap.set(key, { ...r, subRows: [...r.subRows] });
          }
        });

        const finalUnifiedRows = Array.from(mergedMap.values()).sort((a, b) => a.kode.localeCompare(b.kode, undefined, { numeric: true, sensitivity: "base" }));
        finalUnifiedRows.forEach((r) => r.subRows.sort((a, b) => a.kode.localeCompare(b.kode, undefined, { numeric: true, sensitivity: "base" })));

        result.push({
          modul: "UPTP",
          alokasi: uptpAlokasiMatch ? Number(uptpAlokasiMatch.anggaran) : 0,
          rows: finalUnifiedRows,
        });
      }

      return result;
    };

    return { success: true, data: { abt: formatData("ABT"), nonAbt: formatData("NON-ABT") } };
  } catch (error: unknown) {
    if (error instanceof Error) return { success: false, error: error.message };
    return { success: false, error: "Gagal mengambil data dari database" };
  }
} 

// --- Fungsi Upsert (Penyimpanan Massal Nilai Anggaran Saja) ---
// --- Fungsi Upsert (Penyimpanan Massal Nilai Anggaran Saja) ---
export async function simpanBulkRincianAnggaran(
  payload: {
    id: string;
    kode: string;
    ro: string;
    parent_id: string | null;
    anggaran: number;
    realisasi: number;
    fallbackInsert?: {
      kategori: string;
      modul: string;
      kode: string;
      ro: string;
      parent_id: string | null;
    };
  }[],
) {
  try {
    for (const item of payload) {
      // ==========================================
      // 1. COBA UPDATE DATA YANG SUDAH ADA
      // ==========================================
      const res = await sql`
        UPDATE rincian_output
        SET
          kode = ${item.kode},
          nama_ro = ${item.ro},
          anggaran = ${item.anggaran},
          realisasi_anggaran = ${item.realisasi}
        WHERE id = ${item.id}
        RETURNING id
      `;

      // ==========================================
      // 2. JIKA BELUM ADA → INSERT DATA BARU
      // ==========================================
      if (res.length === 0 && item.fallbackInsert) {
        await sql`
          INSERT INTO rincian_output (
            id,
            kategori,
            modul,
            parent_id,
            kode,
            nama_ro,
            anggaran,
            realisasi_anggaran,
            is_read_only
          )
          VALUES (
            ${item.id},
            ${item.fallbackInsert.kategori},
            ${item.fallbackInsert.modul},
            ${item.parent_id},
            ${item.kode},
            ${item.ro},
            ${item.anggaran},
            ${item.realisasi},
            FALSE
          )
        `;
      }
    }

    return {
      success: true,
      message: "Rincian Anggaran berhasil disimpan.",
    };
  } catch (error: unknown) {
    console.error("Gagal menyimpan Rincian Anggaran:", error);

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: "Terjadi kesalahan saat menyimpan Rincian Anggaran.",
    };
  }
}

export type DashboardMetrics = {
  paket: number;
  orang: number;
  realisasiOrang: number;
  anggaran: number;
};
export type DashboardSubRow = { id: string; kode: string; ro: string; abt: DashboardMetrics; nonAbt: DashboardMetrics };
export type DashboardRow = { id: string; kode: string; ro: string; abt: DashboardMetrics; nonAbt: DashboardMetrics; subRows: DashboardSubRow[] };
export type DashboardGroupData = { groupName: string; rows: DashboardRow[] };

type RawRow = {
  id: string;
  kategori: string;
  modul: string;
  parent_id: string | null;
  kode: string | null;
  nama_ro: string;
  paket: number;
  realisasi: number;
  anggaran: number;
  realisasi_anggaran: number;
  is_read_only: boolean;
  data_satpel?: Record<
    string,
    {
      paket?: number;
      orang?: number;
      realisasi?: number;
    }
  >;
  target_orang?: number;
};

// --- Fungsi Read Khusus Dashboard ---
export async function getDashboardRekapan() {
  try {
    // ============================================================
    // 1. AMBIL DATA
    // ============================================================

    const allData = (await sql`
      SELECT *
      FROM rincian_output
      ORDER BY created_at ASC
    `) as RawRow[];

    // ============================================================
    // 2. NORMALISASI
    // ============================================================

    const normalized: RawRow[] = allData.map((d) => {
      // ----------------------------------------------------------
      // SATPEL
      // ----------------------------------------------------------
      if (d.modul === "satpel" && d.data_satpel) {
        let paket = 0;
        let orang = 0;
        let realisasi = 0;

        Object.values(d.data_satpel).forEach((val) => {
          paket += Number(val.paket || 0);
          orang += Number(val.orang || 0);
          realisasi += Number(val.realisasi || 0);
        });

        return {
          ...d,
          paket,
          target_orang: orang,
          realisasi,
          anggaran: Number(d.anggaran || 0),
        };
      }

      return {
        ...d,
        paket: Number(d.paket || 0),
        target_orang: Number(d.target_orang || 0),
        realisasi: Number(d.realisasi || 0),
        anggaran: Number(d.anggaran || 0),
      };
    });

    const abtData = normalized.filter((d) => d.kategori === "ABT");

    const nonAbtData = normalized.filter((d) => d.kategori === "NON-ABT");

    // ============================================================
    // 3. HELPER
    // ============================================================

    const makeKey = (kode: string | null | undefined, ro: string | null | undefined) => {
      return `${(kode || "-").trim()}:::${(ro || "").trim().toLowerCase()}`;
    };

    const getMetrics = (row?: RawRow): DashboardMetrics => ({
      paket: Number(row?.paket || 0),
      orang: Number(row?.target_orang || 0),
      realisasiOrang: Number(row?.realisasi || 0),
      anggaran: Number(row?.anggaran || 0),
    });

    const addMetrics = (a: DashboardMetrics, b: DashboardMetrics): DashboardMetrics => ({
      paket: a.paket + b.paket,
      orang: a.orang + b.orang,
      realisasiOrang: a.realisasiOrang + b.realisasiOrang,
      anggaran: a.anggaran + b.anggaran,
    });

    const sortRows = <T extends { kode: string }>(rows: T[]) => {
      return rows.sort((a, b) =>
        a.kode.localeCompare(b.kode, undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      );
    };

    // ============================================================
    // 4. STANDARD BUILDER
    //    Untuk Sertifikasi dan Produktivitas
    // ============================================================

    const buildStandardGroup = (modulNames: string[]): DashboardRow[] => {
      const abtParents = abtData.filter((d) => modulNames.includes(d.modul) && d.parent_id === null && d.kode?.trim() !== "-" && d.nama_ro?.trim() !== "");

      const nonAbtParents = nonAbtData.filter((d) => modulNames.includes(d.modul) && d.parent_id === null && d.kode?.trim() !== "-" && d.nama_ro?.trim() !== "");

      const parentKeys = new Set<string>();

      abtParents.forEach((row) => {
        parentKeys.add(makeKey(row.kode, row.nama_ro));
      });

      nonAbtParents.forEach((row) => {
        parentKeys.add(makeKey(row.kode, row.nama_ro));
      });

      const result: DashboardRow[] = [];

      for (const key of parentKeys) {
        const abtParent = abtParents.find((row) => makeKey(row.kode, row.nama_ro) === key);

        const nonAbtParent = nonAbtParents.find((row) => makeKey(row.kode, row.nama_ro) === key);

        const abtParentIds = abtParents.filter((row) => makeKey(row.kode, row.nama_ro) === key).map((row) => row.id);

        const nonAbtParentIds = nonAbtParents.filter((row) => makeKey(row.kode, row.nama_ro) === key).map((row) => row.id);

        const childrenAbt = abtData.filter((row) => row.parent_id !== null && abtParentIds.includes(row.parent_id));

        const childrenNonAbt = nonAbtData.filter((row) => row.parent_id !== null && nonAbtParentIds.includes(row.parent_id));

        const childKeys = new Set<string>();

        childrenAbt.forEach((row) => {
          if (row.kode?.trim() !== "-" && row.nama_ro?.trim() !== "") {
            childKeys.add(makeKey(row.kode, row.nama_ro));
          }
        });

        childrenNonAbt.forEach((row) => {
          if (row.kode?.trim() !== "-" && row.nama_ro?.trim() !== "") {
            childKeys.add(makeKey(row.kode, row.nama_ro));
          }
        });

        const subRows: DashboardSubRow[] = [];

        for (const childKey of childKeys) {
          const abtChild = childrenAbt.find((row) => makeKey(row.kode, row.nama_ro) === childKey);

          const nonAbtChild = childrenNonAbt.find((row) => makeKey(row.kode, row.nama_ro) === childKey);

          const base = abtChild || nonAbtChild;

          if (!base) continue;

          subRows.push({
            id: base.id,
            kode: base.kode || "-",
            ro: base.nama_ro,
            abt: getMetrics(abtChild),
            nonAbt: getMetrics(nonAbtChild),
          });
        }

        sortRows(subRows);

        const baseParent = abtParent || nonAbtParent;

        if (!baseParent) continue;

        result.push({
          id: baseParent.id,
          kode: baseParent.kode || "-",
          ro: baseParent.nama_ro,
          abt: getMetrics(abtParent),
          nonAbt: getMetrics(nonAbtParent),
          subRows,
        });
      }

      return sortRows(result);
    };

    // ============================================================
    // 5. SERTIFIKASI
    // ============================================================

    const rowsSertif = buildStandardGroup(["sertifikasi", "sertifikasi-kompetensi"]);

    // ============================================================
    // 6. PRODUKTIVITAS
    // ============================================================

    const rowsProd = buildStandardGroup(["produktivitas"]);

    // ============================================================
    // 7. BUILDER UPTP
    // ============================================================

    const buildUptpMegaGroup = (): DashboardRow[] => {
      const ABT_MAIN_ID = "11111111-1111-1111-1111-111111111111";

      const NON_ABT_MAIN_ID = "22222222-2222-2222-2222-222222222222";

      // ----------------------------------------------------------
      // DATA UPTP
      // ----------------------------------------------------------

      const uptpAbt = abtData.filter((d) => d.modul === "uptp" && d.kode?.trim() !== "-" && d.nama_ro?.trim() !== "");

      const uptpNonAbt = nonAbtData.filter((d) => d.modul === "uptp" && d.kode?.trim() !== "-" && d.nama_ro?.trim() !== "");

      // ----------------------------------------------------------
      // DATA SATPEL
      // ----------------------------------------------------------

      const satpelAbt = abtData.filter((d) => d.modul === "satpel" && d.kode?.trim() !== "-" && d.nama_ro?.trim() !== "");

      const satpelNonAbt = nonAbtData.filter((d) => d.modul === "satpel" && d.kode?.trim() !== "-" && d.nama_ro?.trim() !== "");

      // ----------------------------------------------------------
      // DATA TMT / LPKS / BLKK
      //
      // Ketiganya dianggap SUB-RO dari:
      // 4057.SCO.003 Bidang Industri dan Jasa
      // ----------------------------------------------------------

      const integratedModules = ["tmt", "lpks", "blkk"];

      const integratedAbt = abtData.filter((d) => integratedModules.includes(d.modul) && d.parent_id === null);

      const integratedNonAbt = nonAbtData.filter((d) => integratedModules.includes(d.modul) && d.parent_id === null);

      // ----------------------------------------------------------
      // UPTD
      // ----------------------------------------------------------

      const uptdAbt = abtData.filter((d) => d.modul === "uptd" && d.parent_id === null && d.kode?.trim() !== "-" && d.nama_ro?.trim() !== "");

      const uptdNonAbt = nonAbtData.filter((d) => d.modul === "uptd" && d.parent_id === null && d.kode?.trim() !== "-" && d.nama_ro?.trim() !== "");

      // ----------------------------------------------------------
      // PFLK
      // ----------------------------------------------------------

      const pflkAbt = abtData.filter((d) => d.modul === "pflk" && d.parent_id === null && d.kode?.trim() !== "-" && d.nama_ro?.trim() !== "");

      const pflkNonAbt = nonAbtData.filter((d) => d.modul === "pflk" && d.parent_id === null && d.kode?.trim() !== "-" && d.nama_ro?.trim() !== "");

      // ==========================================================
      // 8. PARENT UPTP + SATPEL
      // ==========================================================

      const uptpParentsAbt = uptpAbt.filter((d) => d.parent_id === null);

      const uptpParentsNonAbt = uptpNonAbt.filter((d) => d.parent_id === null);

      const parentKeys = new Set<string>();

      uptpParentsAbt.forEach((row) => {
        parentKeys.add(makeKey(row.kode, row.nama_ro));
      });

      uptpParentsNonAbt.forEach((row) => {
        parentKeys.add(makeKey(row.kode, row.nama_ro));
      });

      satpelAbt
        .filter((d) => d.parent_id === null)
        .forEach((row) => {
          parentKeys.add(makeKey(row.kode, row.nama_ro));
        });

      satpelNonAbt
        .filter((d) => d.parent_id === null)
        .forEach((row) => {
          parentKeys.add(makeKey(row.kode, row.nama_ro));
        });

      const result: DashboardRow[] = [];

      // ==========================================================
      // 9. PROCESS SETIAP PARENT UPTP
      // ==========================================================

      for (const key of parentKeys) {
        const abtUptpParent = uptpParentsAbt.find((row) => makeKey(row.kode, row.nama_ro) === key);

        const nonAbtUptpParent = uptpParentsNonAbt.find((row) => makeKey(row.kode, row.nama_ro) === key);

        const abtSatpelParent = satpelAbt.find((row) => row.parent_id === null && makeKey(row.kode, row.nama_ro) === key);

        const nonAbtSatpelParent = satpelNonAbt.find((row) => row.parent_id === null && makeKey(row.kode, row.nama_ro) === key);

        const base = abtUptpParent || nonAbtUptpParent || abtSatpelParent || nonAbtSatpelParent;

        if (!base) continue;

        // ========================================================
        // 10. CHILD UPTP
        // ========================================================

        const abtParentIds = uptpParentsAbt.filter((row) => makeKey(row.kode, row.nama_ro) === key).map((row) => row.id);

        const nonAbtParentIds = uptpParentsNonAbt.filter((row) => makeKey(row.kode, row.nama_ro) === key).map((row) => row.id);

        const abtSatpelParentIds = satpelAbt.filter((row) => row.parent_id === null && makeKey(row.kode, row.nama_ro) === key).map((row) => row.id);

        const nonAbtSatpelParentIds = satpelNonAbt.filter((row) => row.parent_id === null && makeKey(row.kode, row.nama_ro) === key).map((row) => row.id);

        const uptpChildrenAbt = uptpAbt.filter((row) => row.parent_id !== null && abtParentIds.includes(row.parent_id));

        const uptpChildrenNonAbt = uptpNonAbt.filter((row) => row.parent_id !== null && nonAbtParentIds.includes(row.parent_id));

        const satpelChildrenAbt = satpelAbt.filter((row) => row.parent_id !== null && abtSatpelParentIds.includes(row.parent_id));

        const satpelChildrenNonAbt = satpelNonAbt.filter((row) => row.parent_id !== null && nonAbtSatpelParentIds.includes(row.parent_id));

        // ========================================================
        // 11. CHILD KEY UPTP + SATPEL
        // ========================================================

        const childKeys = new Set<string>();

        [...uptpChildrenAbt, ...uptpChildrenNonAbt, ...satpelChildrenAbt, ...satpelChildrenNonAbt].forEach((row) => {
          if (row.kode?.trim() !== "-" && row.nama_ro?.trim() !== "") {
            childKeys.add(makeKey(row.kode, row.nama_ro));
          }
        });

        const subRows: DashboardSubRow[] = [];

        // ========================================================
        // 12. MASUKKAN TMT / LPKS / BLKK
        //
        // HANYA untuk parent 4057.SCO.003
        // ========================================================

        const isBidangIndustriJasa = key === makeKey("4057.SCO.003", "Bidang Industri dan Jasa");

        if (isBidangIndustriJasa) {
          for (const modul of integratedModules) {
            const abtIntegrated = integratedAbt.find((row) => row.modul === modul);

            const nonAbtIntegrated = integratedNonAbt.find((row) => row.modul === modul);

            const baseIntegrated = abtIntegrated || nonAbtIntegrated;

            if (!baseIntegrated) continue;

            subRows.push({
              id: baseIntegrated.id,
              kode: baseIntegrated.kode || "-",
              ro: baseIntegrated.nama_ro?.trim() || modul.toUpperCase(),
              abt: getMetrics(abtIntegrated),
              nonAbt: getMetrics(nonAbtIntegrated),
            });
          }
        }

        // ========================================================
        // 13. MERGE CHILD UPTP + SATPEL
        //
        // HANYA jika kode + nama_ro sama.
        // ========================================================

        for (const childKey of childKeys) {
          const abtUptpChild = uptpChildrenAbt.find((row) => makeKey(row.kode, row.nama_ro) === childKey);

          const nonAbtUptpChild = uptpChildrenNonAbt.find((row) => makeKey(row.kode, row.nama_ro) === childKey);

          const abtSatpelChild = satpelChildrenAbt.find((row) => makeKey(row.kode, row.nama_ro) === childKey);

          const nonAbtSatpelChild = satpelChildrenNonAbt.find((row) => makeKey(row.kode, row.nama_ro) === childKey);

          const abtMetrics = addMetrics(getMetrics(abtUptpChild), getMetrics(abtSatpelChild));

          const nonAbtMetrics = addMetrics(getMetrics(nonAbtUptpChild), getMetrics(nonAbtSatpelChild));

          const baseChild = abtUptpChild || nonAbtUptpChild || abtSatpelChild || nonAbtSatpelChild;

          if (!baseChild) continue;

          subRows.push({
            id: baseChild.id,
            kode: baseChild.kode || "-",
            ro: baseChild.nama_ro,
            abt: abtMetrics,
            nonAbt: nonAbtMetrics,
          });
        }

        sortRows(subRows);

        // ========================================================
        // 14. PARENT UPTP + SATPEL
        // ========================================================

        const abtParentMetrics = addMetrics(getMetrics(abtUptpParent), getMetrics(abtSatpelParent));

        const nonAbtParentMetrics = addMetrics(getMetrics(nonAbtUptpParent), getMetrics(nonAbtSatpelParent));

        result.push({
          id: base.id,
          kode: base.kode || "-",
          ro: base.nama_ro,
          abt: abtParentMetrics,
          nonAbt: nonAbtParentMetrics,
          subRows,
        });
      }

      // ==========================================================
      // 15. TAMBAHKAN UPTD
      // ==========================================================

      const uptdKeys = new Set<string>();

      uptdAbt.forEach((row) => {
        uptdKeys.add(makeKey(row.kode, row.nama_ro));
      });

      uptdNonAbt.forEach((row) => {
        uptdKeys.add(makeKey(row.kode, row.nama_ro));
      });

      for (const key of uptdKeys) {
        const abtRow = uptdAbt.find((row) => makeKey(row.kode, row.nama_ro) === key);

        const nonAbtRow = uptdNonAbt.find((row) => makeKey(row.kode, row.nama_ro) === key);

        const base = abtRow || nonAbtRow;

        if (!base) continue;

        result.push({
          id: base.id,
          kode: base.kode || "-",
          ro: base.nama_ro,
          abt: getMetrics(abtRow),
          nonAbt: getMetrics(nonAbtRow),
          subRows: [],
        });
      }

      // ==========================================================
      // 16. TAMBAHKAN PFLK
      // ==========================================================

      const pflkKeys = new Set<string>();

      pflkAbt.forEach((row) => {
        pflkKeys.add(makeKey(row.kode, row.nama_ro));
      });

      pflkNonAbt.forEach((row) => {
        pflkKeys.add(makeKey(row.kode, row.nama_ro));
      });

      for (const key of pflkKeys) {
        const abtRow = pflkAbt.find((row) => makeKey(row.kode, row.nama_ro) === key);

        const nonAbtRow = pflkNonAbt.find((row) => makeKey(row.kode, row.nama_ro) === key);

        const base = abtRow || nonAbtRow;

        if (!base) continue;

        result.push({
          id: base.id,
          kode: base.kode || "-",
          ro: base.nama_ro,
          abt: getMetrics(abtRow),
          nonAbt: getMetrics(nonAbtRow),
          subRows: [],
        });
      }

      // ==========================================================
      // 17. URUTAN DATA
      // ==========================================================

      const isUptd = (row: DashboardRow) => uptdAbt.some((r) => makeKey(r.kode, r.nama_ro) === makeKey(row.kode, row.ro)) || uptdNonAbt.some((r) => makeKey(r.kode, r.nama_ro) === makeKey(row.kode, row.ro));

      const isPflk = (row: DashboardRow) => pflkAbt.some((r) => makeKey(r.kode, r.nama_ro) === makeKey(row.kode, row.ro)) || pflkNonAbt.some((r) => makeKey(r.kode, r.nama_ro) === makeKey(row.kode, row.ro));

      result.sort((a, b) => {
        const priorityA = isUptd(a) ? 2 : isPflk(a) ? 3 : 1;

        const priorityB = isUptd(b) ? 2 : isPflk(b) ? 3 : 1;

        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }

        return a.kode.localeCompare(b.kode, undefined, {
          numeric: true,
          sensitivity: "base",
        });
      });

      return result;
    };

    // ============================================================
    // 18. RETURN
    // ============================================================

    return {
      success: true,
      data: [
        {
          groupName: "Sertifikasi Kompetensi",
          rows: rowsSertif,
        },
        {
          groupName: "UPTP",
          rows: buildUptpMegaGroup(),
        },
        {
          groupName: "Produktivitas",
          rows: rowsProd,
        },
      ],
    };
  } catch (error: unknown) {
    console.error("Gagal memuat data Dashboard:", error);

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: "Gagal memuat data Dashboard.",
    };
  }
}


// ============================================================
// MODUL non_apbn (INDEPENDEN)
// ============================================================

export type MenuNonAPBNRowData = {
  id: string;
  target: number;
  realisasi: number;
};

export async function getMenuNonAPBN() {
  try {
    const data = await sql`SELECT * FROM non_apbn ORDER BY created_at ASC`;
    return { success: true, data: data as MenuNonAPBNRowData[] };
  } catch (error: unknown) {
    if (error instanceof Error) return { success: false, error: error.message };
    return { success: false, error: "Gagal mengambil data dari database" };
  }
}

export async function simpanBulkMenuNonAPBN(payload: MenuNonAPBNRowData[]) {
  try {
    // Pendekatan sinkronisasi penuh: Hapus data lama, masukkan data baru dari UI
    await sql`DELETE FROM non_apbn`;
    
    for (const item of payload) {
      await sql`
        INSERT INTO non_apbn (id, target, realisasi)
        VALUES (${item.id}, ${item.target}, ${item.realisasi})
      `;
    }
    return { success: true };
  } catch (error: unknown) {
    if (error instanceof Error) return { success: false, error: error.message };
    return { success: false, error: "Terjadi kesalahan saat menyimpan data NON APBN." };
  }
}