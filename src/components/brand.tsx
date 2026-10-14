/** GamanChakra mark: a travel wheel (chakra) whose spokes are flight paths. */
export function ChakraMark({ size = 32, spin = false }: { size?: number; spin?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden className={spin ? "gc-spin-slow" : undefined}>
      <defs>
        <linearGradient id="gc-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff6a1a" />
          <stop offset=".55" stopColor="#ffb020" />
          <stop offset="1" stopColor="#7c5cff" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="20" fill="none" stroke="url(#gc-mark)" strokeWidth="3.2" />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i * Math.PI) / 4;
        return <line key={i} x1={24 + Math.cos(a) * 5} y1={24 + Math.sin(a) * 5} x2={24 + Math.cos(a) * 17} y2={24 + Math.sin(a) * 17} stroke="url(#gc-mark)" strokeWidth="2" strokeLinecap="round" />;
      })}
      <circle cx="24" cy="24" r="4" fill="url(#gc-mark)" />
      <path d="M33 9.5 L39 8 L37.5 14" fill="none" stroke="#ff6a1a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Wordmark({ size = 30 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <ChakraMark size={size} />
      <span className="font-display text-[19px] font-semibold tracking-tight">
        Voy<span className="gc-gradient-text">age</span>
      </span>
    </span>
  );
}
