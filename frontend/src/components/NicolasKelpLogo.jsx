export const NicolasKelpLogo = ({ size = 44, className = "" }) => (
  <div
    className={`relative inline-flex items-center justify-center ${className}`}
    style={{ width: size, height: size }}
    aria-label="Nícolas Kelp"
  >
    <svg viewBox="0 0 100 100" width={size} height={size} className="drop-shadow-sm">
      <defs>
        <linearGradient id="nkRed" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#991b1b" />
        </linearGradient>
      </defs>
      {/* Black base square (back) */}
      <rect x="6" y="6" width="62" height="62" rx="14" fill="#0a0a0a" />
      {/* Red square offset (front) */}
      <rect x="32" y="32" width="62" height="62" rx="14" fill="url(#nkRed)" />
      {/* "N" white on black */}
      <text
        x="37"
        y="54"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="900"
        fontSize="46"
        fill="#ffffff"
        textAnchor="middle"
        style={{ letterSpacing: "-2px" }}
      >
        N
      </text>
      {/* "K" white on red */}
      <text
        x="63"
        y="80"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="900"
        fontSize="46"
        fill="#ffffff"
        textAnchor="middle"
        style={{ letterSpacing: "-2px" }}
      >
        K
      </text>
    </svg>
  </div>
);

export const NicolasKelpWordmark = ({ className = "" }) => (
  <div className={`leading-none ${className}`}>
    <p className="text-[9px] text-red-600 font-bold uppercase tracking-[0.25em] mb-0.5">
      PNCD · Boletim D1
    </p>
    <h1 className="text-xl font-bold font-display leading-none tracking-tight">
      <span className="text-red-600">Nícolas</span>
      <span className="text-slate-900"> Kelp</span>
    </h1>
  </div>
);
