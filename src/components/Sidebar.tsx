"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Briefcase, FileText, ChevronDown, LogOut, X, Wallet } from "lucide-react";
import { logout } from "../app/actions/auth";
import LogoBBPVP from "@/assets/logo-bbpvp-makassar.png";


interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const abtSubMenuList = [
  { name: "Sertifikasi Kompetensi", slug: "sertifikasi-kompetensi" },
  { name: "UPTP", slug: "uptp" },
  { name: "Satpel", slug: "satpel" },
  { name: "TMT", slug: "tmt" },
  { name: "LPKS", slug: "lpks" },
  { name: "BLKK", slug: "blkk" },
  { name: "UPTD", slug: "uptd" },
];

const nonAbtSubMenuList = [
  { name: "Sertifikasi Kompetensi", slug: "sertifikasi-kompetensi" },
  { name: "UPTP", slug: "uptp" },
  { name: "Satpel", slug: "satpel" },
  { name: "TMT", slug: "tmt" },
  { name: "UPTD", slug: "uptd" },
  { name: "PFLK", slug: "pflk" },
  { name: "Produktivitas", slug: "produktivitas" },
];

const menuItems = [
  {
    name: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    name: "ABT",
    icon: Briefcase,
    submenus: abtSubMenuList.map((sub) => ({
      name: sub.name,
      href: `/admin/abt/${sub.slug}`,
    })),
  },
  {
    name: "NON ABT",
    icon: FileText,
    submenus: nonAbtSubMenuList.map((sub) => ({
      name: sub.name,
      href: `/admin/non-abt/${sub.slug}`,
    })),
  },
    {
    name: "NON APBN",
    href: "/admin/non-apbn",
    icon: LayoutDashboard,
  },
  {
    name: "Anggaran",
    icon: Wallet,
    submenus: [
      {
        name: "Alokasi Anggaran",
        href: "/admin/anggaran/alokasi",
      },
      {
        name: "Rincian Anggaran",
        href: "/admin/anggaran/rincian",
      },
    ],
  },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  // ==========================================================
  // ACTIVE MENU
  // ==========================================================

  const [openMenu, setOpenMenu] = useState<string | null>(() => {
    if (pathname.includes("/admin/anggaran")) {
      return "Anggaran";
    }

    if (pathname.includes("/admin/abt")) {
      return "ABT";
    }

    if (pathname.includes("/admin/non-abt")) {
      return "NON ABT";
    }

    return null;
  });

  const toggleMenu = (menuName: string) => {
    setOpenMenu((current) => (current === menuName ? null : menuName));
  };

  // ==========================================================
  // LOGOUT
  // ==========================================================

  const handleLogout = async () => {
    await logout();
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      {/* ======================================================
          MOBILE OVERLAY
      ======================================================= */}

      <AnimatePresence>{isOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden" />}</AnimatePresence>

      {/* ======================================================
          SIDEBAR
      ======================================================= */}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          flex w-[280px] flex-col
          overflow-hidden
          border-r border-white/[0.08]
          bg-[#0b2741]
          text-white
          shadow-2xl shadow-black/20
          transition-transform duration-300 ease-in-out
          lg:static lg:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* ====================================================
            SUBTLE BACKGROUND EFFECT
        ===================================================== */}

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-400/[0.07] blur-3xl" />

          <div className="absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-cyan-400/[0.04] blur-3xl" />

          <div className="absolute inset-0 bg-gradient-to-b from-[#15406A]/30 via-transparent to-[#061827]/30" />
        </div>

        {/* ====================================================
            HEADER / BRANDING
        ===================================================== */}

        <div className="relative shrink-0 border-b border-white/[0.08]">
          <div className="px-5 pb-5 pt-5">
            {/* Mobile Close */}
            <div className="mb-4 flex justify-end lg:hidden">
              <button onClick={onClose} aria-label="Tutup menu" className="rounded-lg p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Logo */}
            <div className="flex items-center gap-3">
              <motion.div
                initial={{
                  opacity: 0,
                  scale: 0.85,
                  y: -5,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.5,
                  ease: "easeOut",
                }}
                whileHover={{
                  scale: 1.03,
                }}
                className="
                  flex h-[58px] w-[58px]
                  shrink-0 items-center justify-center
                  rounded-2xl
                  border border-white/70
                  bg-white
                  p-2.5
                  shadow-lg shadow-black/10
                "
              >
                <Image src={ LogoBBPVP } alt="Logo BBPVP Makassar" width={64} height={64} priority className="h-full w-full object-contain" />
              </motion.div>

              <div className="min-w-0">
                <h1 className="truncate text-[17px] font-extrabold tracking-tight text-white">SIM-PVN</h1>

                <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-blue-200/70">BBPVP Makassar</p>
              </div>
            </div>
          </div>
        </div>

        {/* ====================================================
            NAVIGATION
        ===================================================== */}

        <nav className="relative flex-1 overflow-y-auto px-3 py-5 custom-scrollbar">
          {/* Label */}
          <div className="mb-3 px-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/30">Navigasi Utama</p>
          </div>

          <div className="space-y-1">
            {menuItems.map((menu) => {
              const hasSub = !!menu.submenus;
              const isMenuOpen = openMenu === menu.name;

              const isDirectActive = pathname === menu.href;

              const isParentActive = hasSub && menu.submenus?.some((sub) => pathname === sub.href);

              const isActive = isDirectActive || isParentActive;

              return (
                <div key={menu.name}>
                  {/* =================================================
                      MENU WITH SUBMENU
                  ================================================== */}

                  {hasSub ? (
                    <>
                      <button
                        type="button"
                        onClick={() => toggleMenu(menu.name)}
                        className={`
                          group relative flex w-full
                          items-center justify-between
                          rounded-xl px-3.5 py-3
                          text-left
                          transition-all duration-200
                          ${isActive || isMenuOpen ? "bg-white/[0.09] text-white" : "text-blue-100/75 hover:bg-white/[0.05] hover:text-white"}
                        `}
                      >
                        {/* Active indicator */}
                        {isActive && <motion.span layoutId={`active-${menu.name}`} className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-blue-300" />}

                        <div className="flex items-center gap-3">
                          <div
                            className={`
                              flex h-8 w-8 items-center
                              justify-center rounded-lg
                              transition-all duration-200
                              ${isActive || isMenuOpen ? "bg-blue-400/15 text-blue-200" : "bg-white/[0.04] text-blue-200/70 group-hover:bg-white/[0.08] group-hover:text-blue-200"}
                            `}
                          >
                            <menu.icon className="h-[17px] w-[17px]" />
                          </div>

                          <span className="text-[13px] font-semibold tracking-wide">{menu.name}</span>
                        </div>

                        <motion.div
                          animate={{
                            rotate: isMenuOpen ? 180 : 0,
                          }}
                          transition={{
                            duration: 0.2,
                          }}
                        >
                          <ChevronDown
                            className={`
                              h-4 w-4
                              ${isMenuOpen ? "text-blue-300" : "text-white/30"}
                            `}
                          />
                        </motion.div>
                      </button>

                      {/* =================================================
                          SUBMENU
                      ================================================== */}

                      <AnimatePresence initial={false}>
                        {isMenuOpen && (
                          <motion.div
                            initial={{
                              height: 0,
                              opacity: 0,
                            }}
                            animate={{
                              height: "auto",
                              opacity: 1,
                            }}
                            exit={{
                              height: 0,
                              opacity: 0,
                            }}
                            transition={{
                              duration: 0.25,
                              ease: [0.4, 0, 0.2, 1],
                            }}
                            className="overflow-hidden"
                          >
                            <div className="relative ml-[29px] mt-1 border-l border-white/[0.10] pl-3">
                              <div className="space-y-0.5">
                                {menu.submenus!.map((sub) => {
                                  const isSubActive = pathname === sub.href;

                                  return (
                                    <Link
                                      key={sub.href}
                                      href={sub.href}
                                      onClick={onClose}
                                      className={`
                                          group relative
                                          flex items-center
                                          rounded-lg
                                          px-3 py-2.5
                                          text-[11px]
                                          transition-all
                                          duration-200
                                          ${isSubActive ? "bg-white text-[#15406A] shadow-sm" : "text-blue-100/55 hover:bg-white/[0.06] hover:text-white"}
                                        `}
                                    >
                                      {/* Active dot */}
                                      <span
                                        className={`
                                            mr-2.5
                                            h-1.5 w-1.5
                                            shrink-0
                                            rounded-full
                                            transition-all
                                            ${isSubActive ? "scale-125 bg-[#15406A]" : "bg-white/20 group-hover:bg-blue-300"}
                                          `}
                                      />

                                      <span className={isSubActive ? "font-bold" : "font-medium"}>{sub.name}</span>

                                      {/* Active line */}
                                      {isSubActive && <motion.span layoutId={`sub-active-${menu.name}`} className="absolute -left-[13px] h-5 w-[2px] rounded-full bg-white" />}
                                    </Link>
                                  );
                                })}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  ) : (
                    /* =================================================
                       DIRECT MENU
                    ================================================== */

                    <Link
                      href={menu.href!}
                      onClick={onClose}
                      className={`
                        group relative flex
                        items-center gap-3
                        rounded-xl px-3.5 py-3
                        transition-all duration-200
                        ${isDirectActive ? "bg-white text-[#15406A] shadow-lg shadow-black/10" : "text-blue-100/75 hover:bg-white/[0.06] hover:text-white"}
                      `}
                    >
                      {isDirectActive && <motion.span layoutId="dashboard-active" className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-blue-500" />}

                      <div
                        className={`
                          flex h-8 w-8
                          items-center justify-center
                          rounded-lg
                          ${isDirectActive ? "bg-[#15406A]/10" : "bg-white/[0.04] group-hover:bg-white/[0.08]"}
                        `}
                      >
                        <menu.icon
                          className={`
                            h-[17px] w-[17px]
                            ${isDirectActive ? "text-[#15406A]" : "text-blue-200/70 group-hover:text-blue-200"}
                          `}
                        />
                      </div>

                      <span className="text-[13px] font-semibold tracking-wide">{menu.name}</span>
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* ====================================================
            USER / LOGOUT
        ===================================================== */}

        <div className="relative shrink-0 border-t border-white/[0.08] bg-black/[0.12] p-3">
          {/* User */}
          <div className="mb-2 flex items-center gap-3 rounded-xl bg-white/[0.04] p-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-300 to-blue-500 text-sm font-bold text-[#0b2741] shadow-lg">A</div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-white">Administrator</p>

              <p className="mt-0.5 truncate text-[10px] text-blue-200/50">admin@bbpvp.id</p>
            </div>

            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </div>

          {/* Logout */}
          <motion.button
            type="button"
            onClick={handleLogout}
            whileHover={{
              scale: 1.01,
            }}
            whileTap={{
              scale: 0.98,
            }}
            className="
              flex w-full items-center
              justify-center gap-2
              rounded-xl
              border border-red-400/10
              bg-red-500/[0.08]
              py-2.5
              text-[11px] font-semibold
              text-red-200/80
              transition-all duration-200
              hover:border-red-400/20
              hover:bg-red-500
              hover:text-white
            "
          >
            <LogOut className="h-3.5 w-3.5" />
            Keluar dari Sistem
          </motion.button>
        </div>
      </aside>
    </>
  );
}
