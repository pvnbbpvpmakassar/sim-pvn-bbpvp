// src/app/admin/page.tsx
export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 mt-1">Selamat datang di Panel Admin.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contoh Kartu Statistik Dummy */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 text-sm font-medium">Total Data ABT</h3>
          <p className="text-3xl font-bold text-primary mt-2">124</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 text-sm font-medium">Total Data NON ABT</h3>
          <p className="text-3xl font-bold text-primary mt-2">89</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-gray-500 text-sm font-medium">Pengguna Aktif</h3>
          <p className="text-3xl font-bold text-primary mt-2">12</p>
        </div>
      </div>

      {/* Konten Tambahan Kosong */}
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 min-h-[400px] flex items-center justify-center text-gray-400">
        Area ini bisa Anda isi dengan grafik atau tabel data nantinya.
      </div>
    </div>
  );
}   