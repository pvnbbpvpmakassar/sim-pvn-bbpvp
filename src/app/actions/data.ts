// src/app/actions/data.ts
'use server';

import { sql } from '@/lib/db';

// Fungsi Read (Menarik Data)
export async function getRincianOutput(kategori: string, modul: string) {
  try {
    const data = await sql`
      SELECT * FROM rincian_output 
      WHERE kategori = ${kategori} AND modul = ${modul}
      ORDER BY created_at ASC
    `;

    const parents = data.filter(row => row.parent_id === null);
    const children = data.filter(row => row.parent_id !== null);

    const formattedData = parents.map(parent => {
      const subRows = children
        .filter(child => child.parent_id === parent.id)
        .map(child => ({
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
  } catch (error) {
    console.error('Gagal mengambil data:', error);
    return { success: false, error: 'Gagal mengambil data dari database' };
  }
}

// Fungsi Upsert/Bulk Save (Menyimpan Data)
export async function simpanBulkRincianOutput(kategori: string, modul: string, rows: any[]) {
  try {
    // 1. Hapus semua data lama untuk modul ini (kecuali data integrasi/read-only)
    await sql`
      DELETE FROM rincian_output 
      WHERE kategori = ${kategori} AND modul = ${modul} AND is_read_only = FALSE
    `;

    // 2. Loop dan insert data baru dari state UI
    for (const row of rows) {
      if (row.isReadOnly) continue;

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
    console.error('Gagal menyimpan bulk data:', error);
    return { success: false, error: error.message };
  }
}