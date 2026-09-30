"use client";

import Image from "next/image";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  Building2,
  AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { login } from "../actions/auth";

export default function LoginPage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setIsLoading(true);
    setErrorMessage("");

    const formData = new FormData(e.currentTarget);
    const result = await login(formData);

    if (result.success) {
      router.push("/admin");
      router.refresh();
    } else {
      setErrorMessage(result.error || "Terjadi kesalahan saat masuk.");
      setIsLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#071b2d] text-white">
      {/* =====================================================
          BACKGROUND IMAGE
      ====================================================== */}
      <div className="absolute inset-0">
        <Image
          src="/login.webp"
          alt="Gedung BBPVP Makassar"
          fill
          priority
          quality={82}
          sizes="100vw"
          className="object-cover object-center"
        />

        {/* Overall dark overlay */}
        <div className="absolute inset-0 bg-[#061a2b]/10" />

        {/* Left subtle dark gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#061a2b]/75 via-[#061a2b]/20 to-[#061a2b]/30" />

        {/* Right gradient untuk area login */}
        <div className="absolute inset-0 bg-gradient-to-l from-[#061a2b]/90 via-[#061a2b]/55 to-transparent" />

        {/* Bottom gradient */}
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#061a2b]/80 to-transparent" />
      </div>

      {/* =====================================================
          DECORATIVE LIGHT
      ====================================================== */}

      <motion.div
        className="absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-blue-400/10 blur-3xl"
        animate={{
          scale: [1, 1.08, 1],
          opacity: [0.25, 0.4, 0.25],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="absolute -left-32 bottom-0 h-[400px] w-[400px] rounded-full bg-cyan-400/10 blur-3xl"
        animate={{
          x: [0, 30, 0],
          y: [0, -20, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* =====================================================
          CONTENT
      ====================================================== */}

      <div className="relative z-10 flex min-h-screen w-full">
        {/* =================================================
            LEFT BRANDING
        ================================================== */}

        <motion.section
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="hidden lg:flex lg:w-[55%] xl:w-[60%] flex-col justify-between p-10 xl:p-14"
        >
          {/* Top */}
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: 0.2,
                duration: 0.5,
                type: "spring",
              }}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur-md"
            >
              <Building2 className="h-5 w-5 text-white" />
            </motion.div>

            <div>
              <p className="text-sm font-semibold tracking-wide text-white">
                BBPVP MAKASSAR
              </p>
              <p className="text-xs text-white/60">
                Balai Besar Pelatihan Vokasi dan Produktivitas
              </p>
            </div>
          </div>

          {/* Bottom hero text */}
          <div className="max-w-xl pb-4">
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 70 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="mb-6 h-1 rounded-full bg-white"
            />

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.7 }}
              className="mb-3 text-sm font-medium uppercase tracking-[0.25em] text-white/60"
            >
              Sistem Informasi Manajemen
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.8 }}
              className="text-4xl font-bold leading-tight tracking-tight text-white xl:text-5xl"
            >
              Portal Digital
              <br />
              <span className="text-white/75">BBPVP Makassar</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.7 }}
              className="mt-5 max-w-lg text-sm leading-7 text-white/65"
            >
              Akses sistem informasi dan layanan manajemen BBPVP Makassar
              melalui satu portal terintegrasi.
            </motion.p>
          </div>
        </motion.section>

        {/* =================================================
            RIGHT LOGIN
        ================================================== */}

        <section className="flex w-full items-center justify-center px-5 py-10 sm:px-8 lg:w-[45%] lg:justify-end lg:px-10 xl:w-[40%] xl:px-16">
          <motion.div
            initial={{ opacity: 0, x: 50, filter: "blur(8px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            transition={{
              duration: 0.8,
              delay: 0.15,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="w-full max-w-[440px]"
          >
            {/* =================================================
                GLASS LOGIN PANEL
            ================================================== */}

            <div className="relative overflow-hidden rounded-[28px] border border-white/15 bg-[#071b2d]/55 p-7 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:p-9">
              {/* Glass shine */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.10] via-transparent to-transparent" />

              {/* Top animated line */}
              <motion.div
                className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"
                animate={{
                  opacity: [0.2, 0.8, 0.2],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />

              <div className="relative">
                {/* =================================================
                    HEADER
                ================================================== */}

                <div className="mb-9">
                  <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      delay: 0.4,
                      type: "spring",
                      stiffness: 180,
                      damping: 12,
                    }}
                    className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-lg shadow-black/10"
                  >
                    <ShieldCheck className="h-7 w-7 text-white" />
                  </motion.div>

                  <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    Selamat Datang
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-white/55">
                    Masuk untuk mengakses dashboard administrasi BBPVP
                    Makassar.
                  </p>
                </div>

                {/* =================================================
                    ERROR
                ================================================== */}

                <AnimatePresence>
                  {errorMessage && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, y: -10 }}
                      animate={{ opacity: 1, height: "auto", y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -10 }}
                      className="mb-5 overflow-hidden"
                    >
                      <div className="flex items-start gap-3 rounded-xl border border-red-300/20 bg-red-500/10 p-3.5 text-sm text-red-100">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />

                        <span>{errorMessage}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* =================================================
                    FORM
                ================================================== */}

                <form onSubmit={handleLogin} className="space-y-5">
                  {/* Email */}
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/60">
                      Alamat Email
                    </label>

                    <div className="group relative">
                      <Mail className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/35 transition-colors group-focus-within:text-white/80" />

                      <input
                        type="email"
                        name="email"
                        required
                        autoComplete="email"
                        placeholder="admin@domain.com"
                        className="h-14 w-full rounded-xl border border-white/10 bg-black/15 pl-12 pr-4 text-sm font-medium text-white outline-none transition-all placeholder:text-white/25 focus:border-white/30 focus:bg-white/[0.08] focus:ring-4 focus:ring-white/[0.05]"
                      />

                      <div className="pointer-events-none absolute bottom-0 left-4 right-4 h-px origin-left scale-x-0 bg-white/70 transition-transform duration-300 group-focus-within:scale-x-100" />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/60">
                      Kata Sandi
                    </label>

                    <div className="group relative">
                      <Lock className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/35 transition-colors group-focus-within:text-white/80" />

                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        required
                        autoComplete="current-password"
                        placeholder="••••••••"
                        className="h-14 w-full rounded-xl border border-white/10 bg-black/15 pl-12 pr-12 text-sm font-medium text-white outline-none transition-all placeholder:text-white/25 focus:border-white/30 focus:bg-white/[0.08] focus:ring-4 focus:ring-white/[0.05]"
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35 transition-colors hover:text-white"
                        aria-label={
                          showPassword
                            ? "Sembunyikan kata sandi"
                            : "Tampilkan kata sandi"
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="h-[18px] w-[18px]" />
                        ) : (
                          <Eye className="h-[18px] w-[18px]" />
                        )}
                      </button>

                      <div className="pointer-events-none absolute bottom-0 left-4 right-4 h-px origin-left scale-x-0 bg-white/70 transition-transform duration-300 group-focus-within:scale-x-100" />
                    </div>
                  </div>

                  {/* Remember */}
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-white/50 transition-colors hover:text-white/80">
                      <input
                        type="checkbox"
                        name="remember"
                        className="h-4 w-4 rounded border-white/20 bg-white/10 text-[#15406A] focus:ring-white/20"
                      />
                      Ingat sesi saya
                    </label>

                  </div>

                  {/* =================================================
                      LOGIN BUTTON
                  ================================================== */}

                  <motion.button
                    whileHover={{
                      scale: 1.015,
                      y: -2,
                    }}
                    whileTap={{
                      scale: 0.98,
                    }}
                    type="submit"
                    disabled={isLoading}
                    className="group relative mt-3 flex h-14 w-full items-center justify-center overflow-hidden rounded-xl bg-white font-bold text-[#15406A] shadow-xl shadow-black/20 transition-all hover:shadow-2xl hover:shadow-black/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {/* Button shine */}
                    <motion.span
                      className="absolute inset-y-0 -left-20 w-16 skew-x-[-20deg] bg-gradient-to-r from-transparent via-[#15406A]/10 to-transparent"
                      animate={{
                        x: ["0%", "650%"],
                      }}
                      transition={{
                        duration: 2.8,
                        repeat: Infinity,
                        repeatDelay: 1.5,
                        ease: "easeInOut",
                      }}
                    />

                    {isLoading ? (
                      <div className="relative flex items-center gap-3">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#15406A]/20 border-t-[#15406A]" />
                        <span>Memproses...</span>
                      </div>
                    ) : (
                      <span className="relative flex items-center gap-2">
                        Masuk ke Dashboard

                        <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                      </span>
                    )}
                  </motion.button>
                </form>

                {/* =================================================
                    FOOTER
                ================================================== */}

                <div className="mt-8 border-t border-white/10 pt-5 text-center">
                  <p className="text-[11px] leading-5 text-white/35">
                    Akses terbatas untuk administrator yang memiliki
                    kewenangan.
                  </p>

                  <p className="mt-1 text-[10px] text-white/20">
                    © {new Date().getFullYear()} BBPVP Makassar
                  </p>
                </div>
              </div>
            </div>

            {/* Mobile branding */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-6 text-center lg:hidden"
            >
              <p className="text-xs font-semibold tracking-wider text-white/70">
                BBPVP MAKASSAR
              </p>

              <p className="mt-1 text-[10px] text-white/40">
                Sistem Informasi Manajemen
              </p>
            </motion.div>
          </motion.div>
        </section>
      </div>

      {/* =====================================================
          ANIMATED GRAIN / LIGHT
      ====================================================== */}

      <motion.div
        className="pointer-events-none absolute left-1/2 top-1/2 h-px w-[60%] -translate-x-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        animate={{
          opacity: [0, 0.5, 0],
          scaleX: [0.8, 1, 0.8],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </main>
  );
}