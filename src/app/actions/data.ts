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
    const roData = await sql`SELECT * FROM rincian_output ORDER BY modul, created_at ASC`;
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

      // 2. Masukkan Mega Grup UPTP (Menggabungkan UPTP, UPTD, Satpel, TMT, BLKK, LPKS)
      const hasUptpData = filtered.some((r) => uptpGroupModules.includes(r.modul));
      const uptpAlokasiMatch = alokasiKategori.find((a) => a.nama_modul.toLowerCase().includes("uptp"));

      if (hasUptpData || uptpAlokasiMatch) {
        const PARENT_UUID = kategori === "ABT" ? "11111111-1111-1111-1111-111111111111" : "22222222-2222-2222-2222-222222222222";
        const tmtId = kategori === "ABT" ? "11111111-1111-1111-1111-111111111112" : "22222222-2222-2222-2222-222222222223";
        const lpksId = kategori === "ABT" ? "11111111-1111-1111-1111-111111111113" : "22222222-2222-2222-2222-222222222224";
        const blkkId = kategori === "ABT" ? "11111111-1111-1111-1111-111111111114" : "22222222-2222-2222-2222-222222222225";

        const getDummyRow = (dummyId: string, roName: string, modulName: string) => {
          const dbRow = filtered.find((r) => r.id === dummyId);
          return {
            id: dummyId,
            kode: dbRow?.kode || "-",
            ro: roName,
            anggaran: Number(dbRow?.anggaran || 0),
            realisasi: Number(dbRow?.realisasi_anggaran || 0),
            fallbackInsert: { kategori, modul: modulName, kode: "-", ro: roName, parent_id: PARENT_UUID },
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
          fallbackInsert: { kategori, modul: "uptp", kode: "4057.SCO.003", ro: "Bidang Industri dan Jasa", parent_id: null },
          subRows: [getDummyRow(tmtId, "TMT", "tmt"), getDummyRow(blkkId, "BLKK", "blkk"), getDummyRow(lpksId, "LPKS", "lpks"), ...manualSubs],
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
