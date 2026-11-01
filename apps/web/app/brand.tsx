"use client";
export function Brand({ small = false }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="grid place-items-center rounded-full border border-[#d4af37] bg-[#d4af3712] text-[#f5e6a8]"
        style={{ width: small ? 38 : 48, height: small ? 38 : 48 }}
      >
        <svg
          width={small ? 25 : 31}
          height={small ? 25 : 31}
          viewBox="0 0 64 48"
          fill="none"
          aria-label="Águia Naker"
        >
          <path
            d="M31 19 5 5l10 17L2 18l18 18 11-8 2 15 2-15 11 8 18-18-13 4L61 5 35 19l-3-7-1 7Z"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <circle cx="32" cy="22" r="2" fill="currentColor" />
        </svg>
      </div>
      <div>
        <div className="serif gold-text text-xl tracking-wide">
          Naker <span className="text-[#f5f5f0]">Distribuidor</span>
        </div>
        {!small && (
          <div className="text-[10px] tracking-[.28em] text-[#aaa69b]">
            CATÁLOGO IMPERIAL
          </div>
        )}
      </div>
    </div>
  );
}
