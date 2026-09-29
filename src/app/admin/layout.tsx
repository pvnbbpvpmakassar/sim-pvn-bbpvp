// src/app/admin/layout.tsx
import Sidebar from '@/components/Sidebar'; // pastikan path import sesuai

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar tetap di kiri */}
      <Sidebar />
      
      {/* Konten Utama (Scrollable) */}
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}