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
  } catch (error: unknown) { // <-- Diubah menjadi unknown
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
        const manualSubRows = row.subRows ? row.subRows.filter(sub => !sub.isReadOnly) : [];
        
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