'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Briefcase, 
  FileText, 
  ChevronDown, 
  LogOut, 
  Hexagon,
  X 
} from 'lucide-react';
import { logout } from '../app/actions/auth';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const subMenuList = [
  { name: 'Sertifikasi Kompetensi', slug: 'sertifikasi-kompetensi' },
  { name: 'UPTP', slug: 'uptp' },
  { name: 'Produktivitas', slug: 'produktivitas' },
  { name: 'Satpel', slug: 'satpel' },
  { name: 'UPTD', slug: 'uptd' },
  { name: 'BLKK', slug: 'blkk' },
  { name: 'LPKS', slug: 'lpks' },
  { name: 'TMT', slug: 'tmt' },
];

const menuItems = [
  { 
    name: 'Dashboard', 
    href: '/admin', 
    icon: LayoutDashboard 
  },
  {
    name: 'ABT',
    icon: Briefcase,
    submenus: subMenuList.map((sub) => ({
      name: sub.name,
      href: `/admin/abt/${sub.slug}`,
    })),
  },
  {
    name: 'NON ABT',
    icon: FileText,
    submenus: subMenuList.map((sub) => ({
      name: sub.name,
      href: `/admin/non-abt/${sub.slug}`,
    })),
  },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Otomatis buka accordion jika halaman yang sedang aktif berada di dalam menu terkait
  const [openMenu, setOpenMenu] = useState<string | null>(() => {
    if (pathname.includes('/admin/abt')) return 'ABT';
    if (pathname.includes('/admin/non-abt')) return 'NON ABT';
    return null;
  });

  const toggleMenu = (menuName: string) => {
    setOpenMenu(openMenu === menuName ? null : menuName);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
    router.refresh();
  };

  return (
    <>
      {/* Overlay Gelap di Layar Mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-gradient-to-b from-[#15406A] to-[#0a1e33] text-white flex flex-col shadow-2xl transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header / Logo */}
        <div className="flex items-center justify-between px-6 h-20 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm border border-white/20">
              <Hexagon className="w-6 h-6 text-blue-300" fill="currentColor" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-wide leading-tight">PROTOTYPE</h1>
              <span className="text-[10px] text-blue-300 font-semibold tracking-widest uppercase">Admin Panel</span>
            </div>
          </div>

          {/* Tombol Close khusus Layar Mobile */}
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Navigasi */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5 custom-scrollbar">
          {menuItems.map((menu) => {
            const hasSub = !!menu.submenus;
            const isMenuOpen = openMenu === menu.name;
            const isDirectActive = pathname === menu.href;

            return (
              <div key={menu.name}>
                {hasSub ? (
                  <div>
                    <button
                      onClick={() => toggleMenu(menu.name)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${
                        isMenuOpen 
                          ? 'bg-white/10 text-white shadow-inner' 
                          : 'text-blue-100 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <menu.icon className={`w-5 h-5 transition-colors ${isMenuOpen ? 'text-blue-300' : 'text-blue-200 group-hover:text-blue-300'}`} />
                        <span className="font-semibold text-sm tracking-wide">{menu.name}</span>
                      </div>
                      <motion.div animate={{ rotate: isMenuOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown className="w-4 h-4 text-blue-300" />
                      </motion.div>
                    </button>

                    {/* Submenu Dropdown */}
                    <AnimatePresence initial={false}>
                      {isMenuOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="overflow-hidden relative pl-4 pr-1 py-1"
                        >
                          <div className="absolute left-6 top-1 bottom-3 w-px bg-white/15" />
                          <div className="space-y-0.5">
                            {menu.submenus.map((sub) => {
                              const isSubActive = pathname === sub.href;
                              return (
                                <Link
                                  key={sub.href}
                                  href={sub.href}
                                  onClick={onClose}
                                  className={`group flex items-center gap-3 pl-6 pr-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                    isSubActive
                                      ? 'bg-white text-[#15406A] font-bold shadow-md'
                                      : 'text-blue-200 hover:text-white hover:bg-white/10'
                                  }`}
                                >
                                  <div 
                                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                                      isSubActive ? 'bg-[#15406A] scale-125' : 'bg-blue-400/50 group-hover:bg-blue-300'
                                    }`} 
                                  />
                                  <span>{sub.name}</span>
                                </Link>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <Link
                    href={menu.href!}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                      isDirectActive
                        ? 'bg-white text-[#15406A] shadow-md'
                        : 'text-blue-100 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <menu.icon className={`w-5 h-5 ${isDirectActive ? 'text-[#15406A]' : 'text-blue-200'}`} />
                    <span>{menu.name}</span>
                  </Link>
                )}
              </div>
            );
          })}
        </nav>

        {/* Profil Singkat & Logout */}
        <div className="p-4 border-t border-white/10 bg-black/15">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-400 to-blue-200 flex items-center justify-center text-[#15406A] font-bold text-sm shadow">
              A
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">Administrator</p>
              <p className="text-[10px] text-blue-300 truncate">admin@domain.com</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500 text-red-200 hover:text-white py-2 rounded-lg text-xs font-semibold transition-all duration-200"
          >
            <LogOut className="w-3.5 h-3.5" />
            Keluar Sesi
          </button>
        </div>
      </aside>
    </>
  );
}