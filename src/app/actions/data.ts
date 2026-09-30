// src/app/actions/data.ts
"use server";

import { sql } from "@/lib/db";

// --- Tipe Data untuk Backend ---
export type SubRowData = {
  id: string;
  kode: string;
  ro: string;
  paket: number;
  realisasi: number;
  isReadOnly?: boolean;
};

export type RowData = {
  id: string;
  kode: string;
  ro: string;
  paket: number;
  realisasi: number;
  isReadOnly?: boolean;
  subRows: SubRowData[];
};

// Fungsi Read (Menarik Data)
export async function getRincianOutput(kategori: string, modul: string) {
  try {
    const data = await sql`
      SELECT * FROM rincian_output 
      WHERE kategori = ${kategori} AND modul = ${modul}
      ORDER BY created_at ASC
    `;

    const parents = data.filter((row) => row.parent_id === null);
    const children = data.filter((row) => row.parent_id !== null);

    const formattedData = parents.map((parent) => {
      const subRows = children
        .filter((child) => child.parent_id === parent.id)
        .map((child) => ({
          id: child.id,
          kode: child.kode,
          ro: child.nama_ro,
          paket: child.paket,
          realisasi: child.realisasi,
          isReadOnly: child.is_read_only,
        }));

      return {
        id: parent.id,
        kode: parent.kode,
        ro: parent.nama_ro,
        paket: parent.paket,
        realisasi: parent.realisasi,
        isReadOnly: parent.is_read_only,
        subRows: subRows,
      };
    });

    return { success: true, data: formattedData };
  } catch (error: unknown) {
    // <-- Diubah menjadi unknown
    console.error("Gagal mengambil data:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Gagal mengambil data dari database" };
  }
}

// Fungsi Upsert/Bulk Save (Menyimpan Data)
// <-- any[] diganti menjadi RowData[]
// Fungsi Upsert/Bulk Save (Menyimpan Data)
export async function simpanBulkRincianOutput(kategori: string, modul: string, rows: RowData[]) {
  try {
    // 1. Hapus semua data lama untuk modul ini yang manual (is_read_only = FALSE)
    await sql`
      DELETE FROM rincian_output 
      WHERE kategori = ${kategori} AND modul = ${modul} AND is_read_only = FALSE
    `;

    // 2. Loop dan insert data baru dari state UI
    for (const row of rows) {
      if (row.isReadOnly) {
        // Jika baris induk ini terkunci, periksa apakah pengguna menambahkan sub-RO manual di dalamnya
        const manualSubRows = row.subRows ? row.subRows.filter((sub) => !sub.isReadOnly) : [];

        if (manualSubRows.length > 0) {
          // Pastikan baris induknya eksis di database agar tidak error Foreign Key
          const existingParent = await sql`SELECT id FROM rincian_output WHERE id = ${row.id}`;
          if (existingParent.length === 0) {
            await sql`
              INSERT INTO rincian_output (id, kategori, modul, kode, nama_ro, paket, realisasi, is_read_only)
              VALUES (${row.id}, ${kategori}, ${modul}, ${row.kode}, ${row.ro}, ${row.paket}, ${row.realisasi}, TRUE)
            `;
          }

          // Masukkan sub-RO manual yang ditambahkan pengguna
          for (const sub of manualSubRows) {
            await sql`
              INSERT INTO rincian_output (id, kategori, modul, parent_id, kode, nama_ro, paket, realisasi, is_read_only)
              VALUES (${sub.id}, ${kategori}, ${modul}, ${row.id}, ${sub.kode}, ${sub.ro}, ${sub.paket}, ${sub.realisasi}, FALSE)
            `;
          }
        }
        continue; // Lanjut ke baris berikutnya (abaikan insert normal untuk baris induk read-only)
      }

      // -- Pemrosesan normal untuk baris manual seutuhnya --
      await sql`
        INSERT INTO rincian_output (id, kategori, modul, kode, nama_ro, paket, realisasi, is_read_only)
        VALUES (${row.id}, ${kategori}, ${modul}, ${row.kode}, ${row.ro}, ${row.paket}, ${row.realisasi}, FALSE)
      `;

      if (row.subRows && row.subRows.length > 0) {
        for (const sub of row.subRows) {
          if (sub.isReadOnly) continue;
          await sql`
            INSERT INTO rincian_output (id, kategori, modul, parent_id, kode, nama_ro, paket, realisasi, is_read_only)
            VALUES (${sub.id}, ${kategori}, ${modul}, ${row.id}, ${sub.kode}, ${sub.ro}, ${sub.paket}, ${sub.realisasi}, FALSE)
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
      let totalRealisasi = 0;

      parents.forEach((p) => {
        const subs = children.filter((c) => c.parent_id === p.id);
        if (subs.length > 0) {
          totalPaket += subs.reduce((acc, c) => acc + (c.paket || 0), 0);
          totalRealisasi += subs.reduce((acc, c) => acc + (c.realisasi || 0), 0);
        } else {
          totalPaket += p.paket || 0;
          totalRealisasi += p.realisasi || 0;
        }
      });

      const kodeModul = parents.length > 0 && parents[0].kode ? parents[0].kode : "-";

      return {
        kode: kodeModul,
        paket: totalPaket,
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

    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return { success: false, error: "Terjadi kesalahan yang tidak diketahui pada server." };
  }
}

// --- Tipe Data Khusus Satpel ---
export type LokasiSatpel = {
  id: string;
  name: string;
};

export type SatpelSubRowData = {
  id: string;
  kode: string;
  ro: string;
  data: Record<string, { paket: number; realisasi: number }>;
};

export type SatpelRowData = {
  id: string;
  kode: string;
  ro: string;
  data: Record<string, { paket: number; realisasi: number }>;
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
      ORDER BY created_at ASC
    `;

    const parents = data.filter((row) => row.parent_id === null);
    const children = data.filter((row) => row.parent_id !== null);

    const formattedData = parents.map((parent) => {
      const subRows = children
        .filter((child) => child.parent_id === parent.id)
        .map((child) => ({
          id: child.id,
          kode: child.kode,
          ro: child.nama_ro,
          data: child.data_satpel || {},
        }));

      return {
        id: parent.id,
        kode: parent.kode,
        ro: parent.nama_ro,
        data: parent.data_satpel || {},
        subRows: subRows,
      };
    });

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
export type AlokasiRowData = {
  id: string;
  nama_modul: string;
  anggaran: number;
  realisasi: number;
};

// --- Fungsi Read (Menarik Data Alokasi Anggaran) ---
export async function getAlokasiAnggaran() {
  try {
    const data = await sql`
      SELECT * FROM alokasi_anggaran 
      ORDER BY created_at ASC
    `;

    // Pisahkan berdasarkan kategori dan pastikan tipe data angka di-parsing dengan benar dari BIGINT
    const abt = data
      .filter((d) => d.kategori === "ABT")
      .map((d) => ({
        id: d.id,
        nama_modul: d.nama_modul,
        anggaran: Number(d.anggaran),
        realisasi: Number(d.realisasi),
      }));

    const nonAbt = data
      .filter((d) => d.kategori === "NON-ABT")
      .map((d) => ({
        id: d.id,
        nama_modul: d.nama_modul,
        anggaran: Number(d.anggaran),
        realisasi: Number(d.realisasi),
      }));

    return { success: true, data: { abt, nonAbt } };
  } catch (error: unknown) {
    console.error("Gagal mengambil data Alokasi Anggaran:", error);
    if (error instanceof Error) return { success: false, error: error.message };
    return { success: false, error: "Gagal mengambil data dari database" };
  }
}

// --- Fungsi Upsert (Menyimpan Data Alokasi Anggaran) ---
export async function simpanBulkAlokasiAnggaran(abtRows: AlokasiRowData[], nonAbtRows: AlokasiRowData[]) {
  try {
    // Pendekatan sinkronisasi penuh: Hapus semua data lama dan masukkan yang baru
    await sql`DELETE FROM alokasi_anggaran`;

    // 1. Simpan baris ABT
    for (const row of abtRows) {
      await sql`
        INSERT INTO alokasi_anggaran (id, kategori, nama_modul, anggaran, realisasi)
        VALUES (${row.id}, 'ABT', ${row.nama_modul}, ${row.anggaran}, ${row.realisasi})
      `;
    }

    // 2. Simpan baris NON-ABT
    for (const row of nonAbtRows) {
      await sql`
        INSERT INTO alokasi_anggaran (id, kategori, nama_modul, anggaran, realisasi)
        VALUES (${row.id}, 'NON-ABT', ${row.nama_modul}, ${row.anggaran}, ${row.realisasi})
      `;
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("Gagal menyimpan data Alokasi Anggaran:", error);
    if (error instanceof Error) return { success: false, error: error.message };
    return { success: false, error: "Terjadi kesalahan saat menyimpan Alokasi Anggaran." };
  }
}

// --- Tipe Data Rincian Anggaran ---
export type AnggaranSubRowData = {
  id: string;
  kode: string;
  ro: string;
  anggaran: number;
  realisasi: number;
  fallbackInsert?: { kategori: string; modul: string; kode: string; ro: string; parent_id: string | null };
};

export type AnggaranRowData = {
  id: string;
  kode: string;
  ro: string;
  anggaran: number;
  realisasi: number;
  subRows: AnggaranSubRowData[];
  fallbackInsert?: { kategori: string; modul: string; kode: string; ro: string; parent_id: string | null };
};

export type ModulAnggaranGroup = {
  modul: string;
  alokasi: number;
  rows: AnggaranRowData[];
};

// --- Fungsi Read (Menarik & Mengelompokkan Data dengan Struktur Baru) ---
export async function getRincianAnggaran() {
  try {
    const roData = await sql`SELECT * FROM rincian_output ORDER BY modul, created_at ASC` as RawRow[];
    const alokasiData = await sql`SELECT * FROM alokasi_anggaran`;

    const formatData = (kategori: string): ModulAnggaranGroup[] => {
      const filtered = roData.filter((r) => r.kategori === kategori);
      const alokasiKategori = alokasiData.filter((a) => a.kategori === kategori);

      // Grup UPTP menelan modul-modul ini
      const uptpGroupModules = ["uptp", "tmt", "lpks", "blkk", "satpel", "uptd"];
      const independentModules = Array.from(new Set(filtered.map((r) => r.modul))).filter((m) => !uptpGroupModules.includes(m));

      const result: ModulAnggaranGroup[] = [];

      // Fungsi bantuan menyusun baris normal
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
            }));
          return {
            id: p.id,
            kode: p.kode || "-",
            ro: prefix ? `${prefix} ${p.nama_ro}` : p.nama_ro,
            anggaran: Number(p.anggaran || 0),
            realisasi: Number(p.realisasi_anggaran || 0),
            subRows: subs,
          };
        });
      };

      // 1. Masukkan Modul Independen (Sertifikasi, Produktivitas, dll)
      independentModules.forEach((modul) => {
        const alokasiMatch = alokasiKategori.find((a) => a.nama_modul.toLowerCase().includes(modul.toLowerCase()));
        result.push({ modul, alokasi: alokasiMatch ? Number(alokasiMatch.anggaran) : 0, rows: buildRowsForModule(modul) });
      });

      // 2. Masukkan Mega Grup UPTP
      const hasUptpData = filtered.some((r) => uptpGroupModules.includes(r.modul));
      const uptpAlokasiMatch = alokasiKategori.find((a) => a.nama_modul.toLowerCase().includes("uptp"));

      if (hasUptpData || uptpAlokasiMatch) {
        const PARENT_UUID = kategori === "ABT" ? "11111111-1111-1111-1111-111111111111" : "22222222-2222-2222-2222-222222222222";
        const tmtIdFallback = kategori === "ABT" ? "11111111-1111-1111-1111-111111111112" : "22222222-2222-2222-2222-222222222223";
        const lpksIdFallback = kategori === "ABT" ? "11111111-1111-1111-1111-111111111113" : "22222222-2222-2222-2222-222222222224";
        const blkkIdFallback = kategori === "ABT" ? "11111111-1111-1111-1111-111111111114" : "22222222-2222-2222-2222-222222222225";

        // PERBAIKAN UTAMA: Ambil ID aslinya jika ada di database!
        const getIntegrasiRow = (modulName: string, roName: string, fallbackId: string) => {
          const dbRow = filtered.find((r) => r.modul === modulName && r.parent_id === null);
          return {
            id: dbRow ? dbRow.id : fallbackId, // Gunakan ID asli TMT/BLKK/LPKS jika ditemukan
            kode: dbRow?.kode || "-", // Gunakan kode asli (misal: "53")
            ro: roName,
            anggaran: Number(dbRow?.anggaran || 0),
            realisasi: Number(dbRow?.realisasi_anggaran || 0),
            fallbackInsert: dbRow ? undefined : { kategori, modul: modulName, kode: "-", ro: roName, parent_id: PARENT_UUID },
          };
        };

        const uptpChildren = filtered.filter((r) => r.modul === "uptp" && r.parent_id !== null);
        const manualSubs = uptpChildren
          .filter((c) => c.parent_id === PARENT_UUID && c.is_read_only === false)
          .map((c) => ({
            id: c.id,
            kode: c.kode || "-",
            ro: c.nama_ro,
            anggaran: Number(c.anggaran || 0),
            realisasi: Number(c.realisasi_anggaran || 0),
          }));

        const parentDbRow = filtered.find((r) => r.id === PARENT_UUID);
        const integratedRow: AnggaranRowData = {
          id: PARENT_UUID,
          kode: parentDbRow?.kode || "4057.SCO.003",
          ro: "Bidang Industri dan Jasa",
          anggaran: Number(parentDbRow?.anggaran || 0),
          realisasi: Number(parentDbRow?.realisasi_anggaran || 0),
          fallbackInsert: parentDbRow ? undefined : { kategori, modul: "uptp", kode: "4057.SCO.003", ro: "Bidang Industri dan Jasa", parent_id: null },
          subRows: [
            getIntegrasiRow("tmt", "TMT", tmtIdFallback), 
            getIntegrasiRow("blkk", "BLKK", blkkIdFallback), 
            getIntegrasiRow("lpks", "LPKS", lpksIdFallback), 
            ...manualSubs
          ],
        };

        const otherUptpParents = filtered.filter((r) => r.modul === "uptp" && r.parent_id === null && r.id !== PARENT_UUID);
        const otherUptpRows: AnggaranRowData[] = otherUptpParents.map((p) => ({
          id: p.id,
          kode: p.kode || "-",
          ro: p.nama_ro,
          anggaran: Number(p.anggaran || 0),
          realisasi: Number(p.realisasi_anggaran || 0),
          subRows: uptpChildren
            .filter((c) => c.parent_id === p.id)
            .map((c) => ({
              id: c.id,
              kode: c.kode || "-",
              ro: c.nama_ro,
              anggaran: Number(c.anggaran || 0),
              realisasi: Number(c.realisasi_anggaran || 0),
            })),
        }));

        const satpelRows = buildRowsForModule("satpel", "[SATPEL]");
        const uptdRows = buildRowsForModule("uptd", "[UPTD]");

        result.push({
          modul: "UPTP",
          alokasi: uptpAlokasiMatch ? Number(uptpAlokasiMatch.anggaran) : 0,
          rows: [integratedRow, ...otherUptpRows, ...satpelRows, ...uptdRows],
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
export async function simpanBulkRincianAnggaran(payload: { 
  id: string; 
  anggaran: number; 
  realisasi: number; 
  fallbackInsert?: { kategori: string; modul: string; kode: string; ro: string; parent_id: string | null }; 
}[]) {
  try {
    for (const item of payload) {
      // Lakukan Update
      const res = await sql`
        UPDATE rincian_output 
        SET anggaran = ${item.anggaran}, realisasi_anggaran = ${item.realisasi}
        WHERE id = ${item.id}
        RETURNING id
      `;
      // Jika baris belum ada di database (contoh: TMT belum pernah disimpan di Modul UPTP), paksa Insert
      if (res.length === 0 && item.fallbackInsert) {
        await sql`
          INSERT INTO rincian_output (id, kategori, modul, parent_id, kode, nama_ro, anggaran, realisasi_anggaran, is_read_only)
          VALUES (${item.id}, ${item.fallbackInsert.kategori}, ${item.fallbackInsert.modul}, ${item.fallbackInsert.parent_id}, ${item.fallbackInsert.kode}, ${item.fallbackInsert.ro}, ${item.anggaran}, ${item.realisasi}, TRUE)
        `;
      }
    }
    return { success: true };
  } catch (error: unknown) {
    if (error instanceof Error) return { success: false, error: error.message };
    return { success: false, error: "Terjadi kesalahan saat menyimpan Rincian Anggaran." };
  }
}
// --- Tipe Data Khusus Dashboard ---
// --- Tipe Data Khusus Dashboard ---
export type DashboardMetrics = { paket: number; realisasiOrang: number; anggaran: number };
export type DashboardSubRow = { id: string; kode: string; ro: string; abt: DashboardMetrics; nonAbt: DashboardMetrics };
export type DashboardRow = { id: string; kode: string; ro: string; abt: DashboardMetrics; nonAbt: DashboardMetrics; subRows: DashboardSubRow[] };
export type DashboardGroupData = { groupName: string; rows: DashboardRow[] };

// Tipe representasi baris dari database untuk menghindari penggunaan `any`
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
  data_satpel?: Record<string, { paket?: number; realisasi?: number }>;
};

export async function getDashboardRekapan() {
  try {
    const allData = await sql`SELECT * FROM rincian_output ORDER BY created_at ASC` as RawRow[];

    const normalized: RawRow[] = allData.map((d) => {
      if (d.modul === 'satpel' && d.data_satpel) {
        let p = 0, r = 0;
        Object.values(d.data_satpel).forEach((val) => {
          p += Number(val.paket || 0); 
          r += Number(val.realisasi || 0);
        });
        return { ...d, paket: p, realisasi: r };
      }
      return d;
    });

    const abtData = normalized.filter((d) => d.kategori === 'ABT');
    const nonAbtData = normalized.filter((d) => d.kategori === 'NON-ABT');

    const getMetrics = (row?: RawRow): DashboardMetrics => ({
      paket: Number(row?.paket || 0),
      realisasiOrang: Number(row?.realisasi || 0),
      anggaran: Number(row?.anggaran || 0)
    });

    // PERBAIKAN DASHBOARD: Sinkronkan hanya berdasarkan NAMA_RO agar ABT/NON-ABT tetap selaras walau Kode beda
    const alignRows = (parentsAbt: RawRow[], parentsNon: RawRow[], childrenAbtAll: RawRow[], childrenNonAll: RawRow[], prefix: string = ""): DashboardRow[] => {
      const uniqueKeys = Array.from(new Set([
        ...parentsAbt.map(p => (p.nama_ro || '').toLowerCase().trim()),
        ...parentsNon.map(p => (p.nama_ro || '').toLowerCase().trim())
      ]));

      return uniqueKeys.map(key => {
        const pAbt = parentsAbt.find(p => (p.nama_ro || '').toLowerCase().trim() === key);
        const pNon = parentsNon.find(p => (p.nama_ro || '').toLowerCase().trim() === key);
        const baseP = (pAbt || pNon)!;

        const cAbtList = pAbt ? childrenAbtAll.filter(c => c.parent_id === pAbt.id) : [];
        const cNonList = pNon ? childrenNonAll.filter(c => c.parent_id === pNon.id) : [];

        const uniqueChildKeys = Array.from(new Set([
          ...cAbtList.map(c => (c.nama_ro || '').toLowerCase().trim()),
          ...cNonList.map(c => (c.nama_ro || '').toLowerCase().trim())
        ]));

        const subRows: DashboardSubRow[] = uniqueChildKeys.map(cKey => {
          const cAbt = cAbtList.find(c => (c.nama_ro || '').toLowerCase().trim() === cKey);
          const cNon = cNonList.find(c => (c.nama_ro || '').toLowerCase().trim() === cKey);
          const baseC = (cAbt || cNon)!;

          return {
            id: baseC.id, kode: baseC.kode || "-", ro: baseC.nama_ro,
            abt: getMetrics(cAbt), nonAbt: getMetrics(cNon)
          };
        });

        return {
          id: baseP.id, kode: baseP.kode || "-", ro: prefix ? `${prefix} ${baseP.nama_ro}` : baseP.nama_ro,
          abt: getMetrics(pAbt), nonAbt: getMetrics(pNon), subRows
        };
      });
    };

    const sertifAbt = abtData.filter(d => ['sertifikasi-kompetensi', 'sertifikasi'].includes(d.modul) && d.parent_id === null);
    const sertifNon = nonAbtData.filter(d => ['sertifikasi-kompetensi', 'sertifikasi'].includes(d.modul) && d.parent_id === null);
    const rowsSertif = alignRows(sertifAbt, sertifNon, abtData, nonAbtData);

    const prodAbt = abtData.filter(d => d.modul === 'produktivitas' && d.parent_id === null);
    const prodNon = nonAbtData.filter(d => d.modul === 'produktivitas' && d.parent_id === null);
    const rowsProd = alignRows(prodAbt, prodNon, abtData, nonAbtData);

    const buildUptpMegaGroup = () => {
      const abtMainId = "11111111-1111-1111-1111-111111111111";
      const nonMainId = "22222222-2222-2222-2222-222222222222";

      const uptpParentsAbt = abtData.filter(d => d.modul === 'uptp' && d.parent_id === null);
      const uptpParentsNon = nonAbtData.filter(d => d.modul === 'uptp' && d.parent_id === null);

      if (!uptpParentsAbt.some(p => p.id === abtMainId)) uptpParentsAbt.push({ id: abtMainId, kode: "4057.SCO.003", nama_ro: "Bidang Industri dan Jasa", modul: "uptp", parent_id: null } as RawRow);
      if (!uptpParentsNon.some(p => p.id === nonMainId)) uptpParentsNon.push({ id: nonMainId, kode: "4057.SCO.003", nama_ro: "Bidang Industri dan Jasa", modul: "uptp", parent_id: null } as RawRow);

      const uptpChildrenAbt = abtData.filter(d => d.modul === 'uptp' && d.parent_id !== null);
      const uptpChildrenNon = nonAbtData.filter(d => d.modul === 'uptp' && d.parent_id !== null);

      const injectIntegrasi = (sourceData: RawRow[], targetParentId: string): RawRow[] => {
        const injects: RawRow[] = [];
        const tmt = sourceData.find(d => d.modul === 'tmt' && d.parent_id === null);
        const blkk = sourceData.find(d => d.modul === 'blkk' && d.parent_id === null);
        const lpks = sourceData.find(d => d.modul === 'lpks' && d.parent_id === null);
        
        if (tmt) injects.push({ ...tmt, parent_id: targetParentId, nama_ro: "TMT" });
        if (blkk) injects.push({ ...blkk, parent_id: targetParentId, nama_ro: "BLKK" });
        if (lpks) injects.push({ ...lpks, parent_id: targetParentId, nama_ro: "LPKS" });
        
        return injects;
      };

      const allUptpChildrenAbt = [...uptpChildrenAbt, ...injectIntegrasi(abtData, abtMainId)];
      const allUptpChildrenNon = [...uptpChildrenNon, ...injectIntegrasi(nonAbtData, nonMainId)];

      const alignedUptp = alignRows(uptpParentsAbt, uptpParentsNon, allUptpChildrenAbt, allUptpChildrenNon);

      const satAbt = abtData.filter(d => d.modul === 'satpel' && d.parent_id === null);
      const satNon = nonAbtData.filter(d => d.modul === 'satpel' && d.parent_id === null);
      const alignedSatpel = alignRows(satAbt, satNon, abtData, nonAbtData, "[SATPEL]");

      const uptdAbt = abtData.filter(d => d.modul === 'uptd' && d.parent_id === null);
      const uptdNon = nonAbtData.filter(d => d.modul === 'uptd' && d.parent_id === null);
      const alignedUptd = alignRows(uptdAbt, uptdNon, abtData, nonAbtData, "[UPTD]");

      return [...alignedUptp, ...alignedSatpel, ...alignedUptd];
    };

    return {
      success: true,
      data: [
        { groupName: "Sertifikasi Kompetensi", rows: rowsSertif },
        { groupName: "UPTP", rows: buildUptpMegaGroup() },
        { groupName: "Produktivitas", rows: rowsProd }
      ]
    };
  } catch (error: unknown) {
    if (error instanceof Error) return { success: false, error: error.message };
    return { success: false, error: "Gagal memuat data Dashboard." };
  }
}   