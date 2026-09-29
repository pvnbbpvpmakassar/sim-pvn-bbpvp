'use client';

import React, { useState, Fragment } from 'react';
import { motion } from 'framer-motion';
import { 
  Save, Download, Trash2, Plus, PlusCircle, 
  AlertCircle, RefreshCw, CornerDownRight, MapPin, X 
} from 'lucide-react';

// --- Tipe Data ---
type DataValue = {
  paket: number;
  realisasi: number;
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

export default function SatpelPage() {
  const [locations, setLocations] = useState<LocationCol[]>([{ id: 'loc-1', name: 'Satpel 1' }]);
  const [rows, setRows] = useState<Row[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const hitungOrang = (paket: number) => paket * 16;
  const hitungPersen = (realisasi: number, orang: number) => 
    orang > 0 ? ((realisasi / orang) * 100).toFixed(2) : '0.00';

  const tambahLokasi = () => {
    setLocations([...locations, { id: crypto.randomUUID(), name: `Satpel ${locations.length + 1}` }]);
  };

  const updateNamaLokasi = (id: string, newName: string) => {
    setLocations(locations.map(loc => loc.id === id ? { ...loc, name: newName } : loc));
  };

  const hapusLokasi = (id: string) => {
    if (locations.length === 1) {
      alert("Tabel harus memiliki setidaknya satu kolom lokasi.");
      return;
    }
    if (confirm("Hapus kolom lokasi ini beserta datanya?")) {
      setLocations(locations.filter(loc => loc.id !== id));
    }
  };

  const tambahBarisUtama = () => {
    setRows([
      ...rows,
      { id: crypto.randomUUID(), kode: '-', ro: '-', data: {}, subRows: [] }
    ]);
  };

  const tambahSubBaris = (parentId: string) => {
    setRows(rows.map(row => {
      if (row.id === parentId) {
        return {
          ...row,
          subRows: [...row.subRows, { id: crypto.randomUUID(), kode: '-', ro: '-', data: {} }]
        };
      }
      return row;
    }));
  };

  const hapusBarisUtama = (id: string) => setRows(rows.filter(row => row.id !== id));

  const hapusSubBaris = (parentId: string, subId: string) => {
    setRows(rows.map(row => {
      if (row.id === parentId) {
        return { ...row, subRows: row.subRows.filter(sub => sub.id !== subId) };
      }
      return row;
    }));
  };

  const bersihkanTabel = () => {
    if (confirm('Apakah Anda yakin ingin menghapus semua baris data di tabel ini?')) {
      setRows([]);
    }
  };

  const updateBarisUtamaText = (id: string, field: 'kode' | 'ro', value: string) => {
    setRows(rows.map(row => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const updateSubBarisText = (parentId: string, subId: string, field: 'kode' | 'ro', value: string) => {
    setRows(rows.map(row => {
      if (row.id === parentId) {
        const newSubRows = row.subRows.map(sub => sub.id === subId ? { ...sub, [field]: value } : sub);
        return { ...row, subRows: newSubRows };
      }
      return row;
    }));
  };

  const updateBarisUtamaData = (rowId: string, locId: string, field: keyof DataValue, value: number) => {
    setRows(rows.map(row => {
      if (row.id === rowId) {
        const currentLocData = row.data[locId] || { paket: 0, realisasi: 0 };
        return { ...row, data: { ...row.data, [locId]: { ...currentLocData, [field]: value } } };
      }
      return row;
    }));
  };

  const updateSubBarisData = (rowId: string, subId: string, locId: string, field: keyof DataValue, value: number) => {
    setRows(rows.map(row => {
      if (row.id === rowId) {
        const newSubRows = row.subRows.map(sub => {
          if (sub.id === subId) {
            const currentLocData = sub.data[locId] || { paket: 0, realisasi: 0 };
            return { ...sub, data: { ...sub.data, [locId]: { ...currentLocData, [field]: value } } };
          }
          return sub;
        });
        return { ...row, subRows: newSubRows };
      }
      return row;
    }));
  };

  const simpanData = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      alert('Data Satpel berhasil disimpan!');
    }, 1000);
  };

  // Fungsi helper untuk mendapatkan nilai final dari sebuah baris
  // (Jika punya sub, ambil total sub-nya, jika tidak, ambil nilainya sendiri)
  const getDisplayData = (row: Row, locId: string) => {
    const hasSub = row.subRows.length > 0;
    if (hasSub) {
      const paket = row.subRows.reduce((sum, sub) => sum + (sub.data[locId]?.paket || 0), 0);
      const realisasi = row.subRows.reduce((sum, sub) => sum + (sub.data[locId]?.realisasi || 0), 0);
      return { paket, realisasi };
    }
    return {
      paket: row.data[locId]?.paket || 0,
      realisasi: row.data[locId]?.realisasi || 0
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#15406A]">Satpel (ABT)</h1>
          <p className="text-gray-500 text-sm mt-1">Kelola data target dan realisasi multi-lokasi.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={tambahLokasi} className="flex items-center gap-2 bg-blue-50 text-[#15406A] hover:bg-blue-100 px-4 py-2 rounded-lg font-bold transition-colors border border-blue-200 shadow-sm">
            <MapPin className="w-4 h-4" /> Tambah Kolom Lokasi
          </button>
          <button className="flex items-center gap-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-4 py-2 rounded-lg font-medium transition-colors border border-emerald-200">
            <Download className="w-4 h-4" /> Excel
          </button>
          <button onClick={bersihkanTabel} className="flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg font-medium transition-colors border border-red-200">
            <RefreshCw className="w-4 h-4" /> Bersihkan
          </button>
        </div>
      </div>

      
            {/* Peringatan */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-amber-800 text-sm font-medium leading-relaxed">
                <span className="font-bold">Peringatan:</span> Pastikan Anda selalu menekan tombol <b className="text-[#15406A]">Simpan Data</b> di bagian bawah tabel setelah selesai menambah atau mengedit rincian.
              </p>
            </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm text-left border-collapse min-w-max">
            <thead className="bg-[#15406A] text-white">
              <tr>
                <th rowSpan={3} className="sticky left-0 z-20 bg-[#15406A] border border-[#1a4e82] px-4 py-3 text-center w-16">NO.</th>
                <th rowSpan={3} className="sticky left-16 z-20 bg-[#15406A] border border-[#1a4e82] px-4 py-3 w-32">Kode</th>
                <th rowSpan={3} className="sticky left-48 z-20 bg-[#15406A] border border-[#1a4e82] px-4 py-3 min-w-[250px] shadow-[2px_0_5px_rgba(0,0,0,0.1)]">Rincian Output (RO)</th>
                
                {locations.map((loc) => (
                  <th colSpan={4} key={loc.id} className="border border-[#1a4e82] p-0 text-center relative group min-w-[320px]">
                    <div className="flex items-center justify-center w-full h-full p-2 gap-2">
                      <input 
                        type="text" 
                        value={loc.name} 
                        onChange={(e) => updateNamaLokasi(loc.id, e.target.value)}
                        className="bg-transparent outline-none text-center text-white font-extrabold w-full focus:bg-[#184878] rounded px-2 py-1 placeholder-blue-200/50" 
                        placeholder="Ketik nama Satpel..."
                      />
                      {locations.length > 1 && (
                        <button 
                          onClick={() => hapusLokasi(loc.id)} 
                          title="Hapus Kolom Lokasi"
                          className="text-blue-300 hover:text-red-400 absolute right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-[#15406A] p-1 rounded-md"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                
                <th rowSpan={3} className="border border-[#1a4e82] px-4 py-3 text-center w-32">Aksi</th>
              </tr>
              <tr>
                {locations.map((loc) => (
                  <Fragment key={`sub1-${loc.id}`}>
                    <th colSpan={2} className="border border-[#1a4e82] px-4 py-2 text-center bg-[#184878]">Target</th>
                    <th rowSpan={2} className="border border-[#1a4e82] px-4 py-3 text-center bg-[#184878] w-28">Realisasi</th>
                    <th rowSpan={2} className="border border-[#1a4e82] px-4 py-3 text-center bg-[#184878] w-28">Persen (%)</th>
                  </Fragment>
                ))}
              </tr>
              <tr>
                {locations.map((loc) => (
                  <Fragment key={`sub2-${loc.id}`}>
                    <th className="border border-[#1a4e82] px-4 py-2 text-center bg-[#1c548c] w-24">Paket</th>
                    <th className="border border-[#1a4e82] px-4 py-2 text-center bg-[#1c548c] w-24">Orang</th>
                  </Fragment>
                ))}
              </tr>
            </thead>

            <tbody className="text-gray-700">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4 + (locations.length * 4)} className="px-4 py-12 text-center text-gray-400 font-medium bg-white">
                    Tabel masih kosong. Klik Tambah RO Baru untuk memulai.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => {
                  const hasSub = row.subRows.length > 0;
                  return (
                    <Fragment key={row.id}>
                      <tr className={`border-b border-gray-200 transition-colors ${hasSub ? 'bg-gray-100 font-semibold' : 'bg-white hover:bg-slate-50'}`}>
                        <td className="sticky left-0 z-10 bg-inherit border-r border-gray-200 px-4 py-2 text-center">{index + 1}</td>
                        <td className="sticky left-16 z-10 bg-inherit border-r border-gray-200 p-0">
                          <input type="text" value={row.kode} onChange={(e) => updateBarisUtamaText(row.id, 'kode', e.target.value)} className="w-full h-full px-4 py-3 bg-transparent outline-none focus:bg-blue-50/50" />
                        </td>
                        <td className="sticky left-48 z-10 bg-inherit border-r border-gray-200 p-0 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                          <input type="text" value={row.ro} onChange={(e) => updateBarisUtamaText(row.id, 'ro', e.target.value)} className="w-full h-full px-4 py-3 bg-transparent outline-none focus:bg-blue-50/50" />
                        </td>
                        
                        {locations.map(loc => {
                          const { paket, realisasi } = getDisplayData(row, loc.id);
                          const orang = hitungOrang(paket);
                          const persen = hitungPersen(realisasi, orang);
                          
                          return (
                            <Fragment key={`parent-data-${loc.id}`}>
                              <td className="border-r border-gray-200 p-0">
                                <input type="number" value={paket === 0 ? '' : paket} onChange={(e) => updateBarisUtamaData(row.id, loc.id, 'paket', Number(e.target.value))} disabled={hasSub} placeholder="0" className={`w-full h-full px-4 py-3 text-center outline-none ${hasSub ? 'bg-transparent cursor-not-allowed text-gray-500' : 'bg-transparent focus:bg-blue-50/50'}`} />
                              </td>
                              <td className="border-r border-gray-200 px-4 py-3 text-center bg-transparent">{orang}</td>
                              <td className="border-r border-gray-200 p-0">
                                <input type="number" value={realisasi === 0 ? '' : realisasi} onChange={(e) => updateBarisUtamaData(row.id, loc.id, 'realisasi', Number(e.target.value))} disabled={hasSub} placeholder="0" className={`w-full h-full px-4 py-3 text-center outline-none ${hasSub ? 'bg-transparent cursor-not-allowed text-gray-500' : 'bg-transparent focus:bg-blue-50/50'}`} />
                              </td>
                              <td className="border-r border-gray-200 px-4 py-3 text-center bg-transparent text-[#15406A] font-bold">{persen}%</td>
                            </Fragment>
                          );
                        })}
                        <td className="px-4 py-2 text-center bg-white">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => tambahSubBaris(row.id)} title="Tambah Sub-RO" className="p-1.5 bg-blue-100 text-[#15406A] rounded hover:bg-blue-200 transition-colors"><PlusCircle className="w-4 h-4" /></button>
                            <button onClick={() => hapusBarisUtama(row.id)} title="Hapus RO" className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>

                      {row.subRows.map((sub) => (
                        <tr key={sub.id} className="border-b border-gray-100 bg-white hover:bg-slate-50 transition-colors">
                          <td className="sticky left-0 z-10 bg-inherit border-r border-gray-200"></td>
                          <td className="sticky left-16 z-10 bg-inherit border-r border-gray-200 p-0 relative">
                            <div className="absolute left-2 top-3.5 text-gray-300 pointer-events-none"><CornerDownRight className="w-4 h-4" /></div>
                            <input type="text" value={sub.kode} onChange={(e) => updateSubBarisText(row.id, sub.id, 'kode', e.target.value)} className="w-full h-full pl-8 pr-4 py-2.5 bg-transparent outline-none focus:bg-white text-sm" />
                          </td>
                          <td className="sticky left-48 z-10 bg-inherit border-r border-gray-200 p-0 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                            <input type="text" value={sub.ro} onChange={(e) => updateSubBarisText(row.id, sub.id, 'ro', e.target.value)} className="w-full h-full px-4 py-2.5 bg-transparent outline-none focus:bg-white text-sm" placeholder="Sub-rincian..." />
                          </td>
                          {locations.map(loc => {
                            const paket = sub.data[loc.id]?.paket || 0;
                            const realisasi = sub.data[loc.id]?.realisasi || 0;
                            const orang = hitungOrang(paket);
                            const persen = hitungPersen(realisasi, orang);

                            return (
                              <Fragment key={`sub-data-${loc.id}`}>
                                <td className="border-r border-gray-200 p-0 border-l">
                                  <input type="number" value={paket === 0 ? '' : paket} onChange={(e) => updateSubBarisData(row.id, sub.id, loc.id, 'paket', Number(e.target.value))} placeholder="0" className="w-full h-full px-4 py-2.5 text-center bg-transparent outline-none focus:bg-white text-sm" />
                                </td>
                                <td className="border-r border-gray-200 px-4 py-2.5 text-center bg-transparent text-sm text-gray-500">{orang}</td>
                                <td className="border-r border-gray-200 p-0">
                                  <input type="number" value={realisasi === 0 ? '' : realisasi} onChange={(e) => updateSubBarisData(row.id, sub.id, loc.id, 'realisasi', Number(e.target.value))} placeholder="0" className="w-full h-full px-4 py-2.5 text-center bg-transparent outline-none focus:bg-white text-sm" />
                                </td>
                                <td className="border-r border-gray-200 px-4 py-2.5 text-center bg-transparent text-[#15406A] font-semibold text-sm">{persen}%</td>
                              </Fragment>
                            );
                          })}
                          <td className="px-4 py-2 text-center bg-white">
                            <button onClick={() => hapusSubBaris(row.id, sub.id)} title="Hapus Sub-RO" className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  );
                })
              )}
            </tbody>

            {/* --- TABLE FOOTER: BARIS JUMLAH TOTAL --- */}
            {rows.length > 0 && (
              <tfoot className="bg-amber-400 text-white font-bold tracking-wide">
                <tr>
                  <td className="sticky left-0 z-20 bg-amber-400 border border-[#1a4e82] px-4 py-4 text-center"></td>
                  <td className="sticky left-16 z-20 bg-amber-400 border border-[#1a4e82] px-4 py-4 text-center"></td>
                  <td className="sticky left-48 z-20 bg-amber-400 border border-[#1a4e82] px-4 py-4 text-right shadow-[2px_0_5px_rgba(0,0,0,0.1)] uppercase">
                    Jumlah Total
                  </td>
                  
                  {locations.map(loc => {
                    // Kalkulasi Total per Kolom Lokasi
                    // Hanya menjumlahkan data induk (getDisplayData sudah mencakup total sub-row jika ada)
                    const totalPaket = rows.reduce((sum, row) => sum + getDisplayData(row, loc.id).paket, 0);
                    const totalRealisasi = rows.reduce((sum, row) => sum + getDisplayData(row, loc.id).realisasi, 0);
                    
                    const totalOrang = hitungOrang(totalPaket);
                    const totalPersen = hitungPersen(totalRealisasi, totalOrang);

                    return (
                      <Fragment key={`total-${loc.id}`}>
                        <td className="border border-[#1a4e82] px-4 py-4 text-center bg-amber-500">{totalPaket}</td>
                        <td className="border border-[#1a4e82] px-4 py-4 text-center text-blue-100">{totalOrang}</td>
                        <td className="border border-[#1a4e82] px-4 py-4 text-center bg-amber-500 text-emerald-300">{totalRealisasi}</td>
                        <td className="border border-[#1a4e82] px-4 py-4 text-center text-blue-200">{totalPersen}%</td>
                      </Fragment>
                    );
                  })}
                  
                  <td className="border border-[#1a4e82] bg-amber-400"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        
        <div className="bg-gray-50 p-4 border-t border-gray-200">
          <button onClick={tambahBarisUtama} className="flex items-center gap-2 text-sm font-bold text-[#15406A] hover:text-blue-800 transition-colors">
            <Plus className="w-5 h-5" /> Tambah RO Baru
          </button>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <motion.button 
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={simpanData} disabled={isSaving}
          className="flex items-center gap-2 bg-[#15406A] hover:bg-[#0f2f4e] text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-[#15406A]/30 transition-all disabled:opacity-70"
        >
          {isSaving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save className="w-5 h-5" />}
          {isSaving ? 'Menyimpan...' : 'Simpan Data'}
        </motion.button>
      </div>
    </div>
  );
}