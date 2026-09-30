"use client";

interface LoadingSatpelProps {
  isLoading: boolean;
}

export default function LoadingSatpel({ isLoading }: LoadingSatpelProps) {
  return (
    <div className="relative flex h-64 w-full items-center justify-center overflow-hidden rounded-2xl bg-white">
      {/* ================================
          LOGO BBPVP TANPA KAPAL
      ================================= */}
      <img
        src="/logo-bbpvp-tanpa-kapal.png"
        alt="BBPVP Makassar"
        className="
          absolute
          inset-0
          h-full
          w-full
          object-contain
          px-4
          opacity-95
        "
      />

      {/* ================================
          LAUT / GARIS GERAK
      ================================= */}
      <div
        className={`
          absolute
          bottom-[27%]
          left-0
          h-[2px]
          w-full
          overflow-hidden
          transition-opacity
          duration-700
          ${isLoading ? "opacity-100" : "opacity-0"}
        `}
      >
        <div className="h-full w-40 bg-gradient-to-r from-transparent via-[#15406A]/30 to-transparent animate-[wave_2s_linear_infinite]" />
      </div>

      {/* ================================
          KAPAL
      ================================= */}
      <div
        className={`
          absolute
          z-20
          top-[39%]
          transition-all
          duration-[2800ms]
          ease-[cubic-bezier(0.22,1,0.36,1)]
          ${isLoading ? "right-[-220px]" : "right-[39%]"}
        `}
      >
        <div className="relative">
          {/* Efek bayangan / air */}
          <div
            className="
              absolute
              -bottom-2
              left-[10%]
              h-2
              w-[80%]
              rounded-full
              bg-[#15406A]/15
              blur-sm
            "
          />

          <img
            src="/kapal-bbpvp-transparan.png"
            alt=""
            className="
              w-[190px]
              select-none
              drop-shadow-[0_8px_8px_rgba(21,64,106,0.12)]
              animate-[boatFloat_2.5s_ease-in-out_infinite]
            "
          />
        </div>
      </div>

      {/* ================================
          STATUS
      ================================= */}
      <div
        className="
          absolute
          bottom-5
          left-1/2
          z-30
          -translate-x-1/2
          text-center
          whitespace-nowrap
        "
      >
        <div className="flex items-center justify-center gap-2">
          <span
            className={`
              h-2
              w-2
              rounded-full
              bg-[#15406A]
              ${isLoading ? "animate-pulse" : ""}
            `}
          />

          <span className="text-sm font-semibold text-[#15406A]">{isLoading ? "Memuat data Satpel..." : "Data Satpel berhasil dimuat"}</span>
        </div>

        {isLoading && <p className="mt-1 text-xs text-slate-400">Menghubungkan dan mengambil data terbaru</p>}
      </div>
    </div>
  );
}
