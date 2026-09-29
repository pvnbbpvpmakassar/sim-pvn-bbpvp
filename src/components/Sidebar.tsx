'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Briefcase, FileText, ChevronDown, LogOut, Hexagon } from 'lucide-react';
import { logout } from '../app/actions/auth';

const menuItems = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  {
    name: 'ABT',
    icon: Briefcase,
    submenus: ['Sertifikasi Kompetensi', 'UPTP', 'Produktivitas', 'Satpel', 'UPTD', 'BLKK', 'LPKS', 'TMT'],
  },
  {
    name: 'NON ABT',
    icon: FileText,
    submenus: ['Sertifikasi Kompetensi', 'UPTP', 'Produktivitas', 'Satpel', 'UPTD', 'BLKK', 'LPKS', 'TMT'],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  // Menyimpan state menu mana yang terbuka (bisa array jika ingin membuka beberapa sekaligus)
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const toggleMenu = (menuName: string) => {
    setOpenMenu(openMenu === menuName ? null : menuName);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
    router.refresh();
  };

  return (
    // Menggunakan gradient dari warna primary ke warna biru yang lebih gelap
    <div className="flex flex-col w-[280px] bg-gradient-to-b from-[#15406A] to-[#0a1e33] text-white h-screen shadow-2xl z-20">
      
      {/* Brand / Logo Area */}
      <div className="flex items-center px-6 h-24 mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm border border-white/20">
            <Hexagon className="w-6 h-6 text-blue-300" fill="currentColor" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-extrabold tracking-wide leading-tight">
              PROTOTYPE
            </h1>
            <span className="text-xs text-blue-300 font-medium tracking-widest">ADMIN PANEL</span>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto px-4 custom-scrollbar">
        <ul className="space-y-2">
          {menuItems.map((menu) => {
            const isActive = pathname === menu.href;
            const isOpen = openMenu === menu.name;

            return (
              <li key={menu.name}>
                {menu.submenus ? (
                  /* --- Menu dengan Submenu --- */
                  <div className="mb-1">
                    <button
                      onClick={() => toggleMenu(menu.name)}
                      className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-300 group ${
                        isOpen 
                          ? 'bg-white/10 text-white shadow-inner' 
                          : 'text-blue-100 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <menu.icon className={`w-5 h-5 transition-colors ${isOpen ? 'text-blue-300' : 'text-blue-200 group-hover:text-blue-300'}`} />
                        <span className="font-semibold tracking-wide text-sm">{menu.name}</span>
                      </div>
                      <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
                        <ChevronDown className="w-4 h-4 text-blue-300" />
                      </motion.div>
                    </button>
                    
                    {/* Daftar Submenu */}
                    <AnimatePresence>
                      {isOpen && (
                        <motion.ul
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="overflow-hidden relative"
                        >
                          {/* Garis vertikal dekoratif di sisi kiri submenu */}
                          <div className="absolute left-6 top-0 bottom-4 w-px bg-white/20"></div>
                          
                          <div className="pt-2 pb-2 pl-4 pr-2 space-y-1">
                            {menu.submenus.map((sub, idx) => (
                              <li key={idx}>
                                <Link
                                  href={`#${sub.replace(/\s+/g, '-').toLowerCase()}`} // Placeholder rute
                                  className="group flex items-center gap-3 pl-6 pr-3 py-2.5 rounded-lg text-sm text-blue-200 hover:text-white hover:bg-white/10 transition-all"
                                >
                                  {/* Titik indikator kecil */}
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400/50 group-hover:bg-blue-300 group-hover:scale-150 transition-all"></div>
                                  <span className="font-medium">{sub}</span>
                                </Link>
                              </li>
                            ))}
                          </div>
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  /* --- Menu Normal (Tanpa Submenu) --- */
                  <Link
                    href={menu.href!}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 ${
                      isActive 
                        ? 'bg-white text-[#15406A] shadow-lg shadow-black/10' 
                        : 'text-blue-100 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <menu.icon className={`w-5 h-5 ${isActive ? 'text-[#15406A]' : 'text-blue-200'}`} />
                    <span className="font-semibold tracking-wide text-sm">{menu.name}</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User / Logout Area */}
      <div className="p-4 mt-auto">
        <div className="bg-black/20 rounded-2xl p-4 backdrop-blur-md border border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-400 to-blue-200 flex items-center justify-center text-[#15406A] font-bold text-lg shadow-inner">
              A
            </div>
            <div>
              <p className="text-sm font-bold text-white">Administrator</p>
              <p className="text-xs text-blue-300">admin@domain.com</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl transition-all shadow-md hover:shadow-red-500/20 text-sm font-semibold"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>
      </div>
    </div>
  );
}