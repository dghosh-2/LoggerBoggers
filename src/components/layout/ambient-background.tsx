"use client";

export function AmbientBackground() {
  return (
    <div className="fixed inset-0 -z-10 bg-background overflow-hidden pointer-events-none">
      {/* Tartan plaid — top right area, extending partially across */}
      <div
        className="absolute -top-32 -right-32 w-[1200px] h-[1200px] opacity-[0.16] dark:opacity-[0.2]"
        style={{ transform: "rotate(-12deg)" }}
      >
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="tartan" patternUnits="userSpaceOnUse" width="80" height="80">
              <rect width="80" height="80" fill="#C41230" />
              <rect y="0" width="80" height="14" fill="#1a1a1a" />
              <rect y="34" width="80" height="6" fill="#1a1a1a" />
              <rect y="48" width="80" height="14" fill="#4a4a4a" opacity="0.6" />
              <rect y="68" width="80" height="8" fill="#1a1a1a" />
              <rect x="0" y="0" width="14" height="80" fill="#1a1a1a" opacity="0.55" />
              <rect x="34" y="0" width="6" height="80" fill="#1a1a1a" opacity="0.55" />
              <rect x="48" y="0" width="14" height="80" fill="#4a4a4a" opacity="0.3" />
              <rect x="68" y="0" width="8" height="80" fill="#1a1a1a" opacity="0.55" />
              <rect y="16" width="80" height="1.5" fill="#fff" opacity="0.25" />
              <rect y="32" width="80" height="1.5" fill="#fff" opacity="0.15" />
              <rect y="64" width="80" height="1.5" fill="#fff" opacity="0.25" />
              <rect x="16" y="0" width="1.5" height="80" fill="#fff" opacity="0.2" />
              <rect x="32" y="0" width="1.5" height="80" fill="#fff" opacity="0.12" />
              <rect x="64" y="0" width="1.5" height="80" fill="#fff" opacity="0.2" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#tartan)" />
        </svg>
      </div>

      {/* Fade out the edges so it blends softly */}
      <div
        className="absolute -top-32 -right-32 w-[1200px] h-[1200px]"
        style={{
          transform: "rotate(-12deg)",
          background: "radial-gradient(ellipse at 65% 35%, transparent 25%, var(--background) 70%)",
        }}
      />
    </div>
  );
}
