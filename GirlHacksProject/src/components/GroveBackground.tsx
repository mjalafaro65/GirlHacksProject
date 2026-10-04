import { useMemo } from "react";

interface Firefly {
  left: string;
  top: string;
  size: number;
  dx: string;
  dy: string;
  duration: string;
  delay: string;
}

/** Deterministic pseudo-random so SSR and client agree. */
function makeFireflies(count: number): Firefly[] {
  const rand = (seed: number) => {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  return Array.from({ length: count }, (_, i) => ({
    left: `${(rand(i + 1) * 96 + 2).toFixed(1)}%`,
    top: `${(rand(i + 51) * 80 + 5).toFixed(1)}%`,
    size: 2 + Math.round(rand(i + 101) * 3),
    dx: `${(rand(i + 151) * 120 - 60).toFixed(0)}px`,
    dy: `${(rand(i + 201) * -140 - 40).toFixed(0)}px`,
    duration: `${(10 + rand(i + 251) * 14).toFixed(1)}s`,
    delay: `${(rand(i + 301) * -18).toFixed(1)}s`,
  }));
}

/**
 * Enchanted grove backdrop: layered tree silhouettes plus drifting
 * firefly glow dots (pure CSS animation, disabled for reduced motion).
 */
export function GroveBackground() {
  const fireflies = useMemo(() => makeFireflies(20), []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <svg
        className="absolute inset-x-0 bottom-0 w-full"
        viewBox="0 0 1440 420"
        preserveAspectRatio="xMidYMax slice"
        style={{ height: "55vh", color: "var(--forest)" }}
      >
        <g fill="currentColor" opacity="0.75">
          <path d="M0 420 V300 L40 300 V240 L70 150 L100 240 V300 L140 300 V260 L170 180 L200 260 V300 L240 300 V420 Z" />
          <path d="M260 420 V310 L300 310 V230 L340 120 L380 230 V310 L420 310 V420 Z" />
          <path d="M900 420 V320 L940 320 V250 L980 140 L1020 250 V320 L1060 320 V420 Z" />
          <path d="M1100 420 V300 L1150 300 V220 L1200 90 L1250 220 V300 L1300 300 V260 L1330 190 L1360 260 V300 L1400 300 V420 Z" />
          <path d="M520 420 V330 L550 330 V280 L585 200 L620 280 V330 L650 330 V420 Z" />
          <path d="M700 420 V340 L730 340 V290 L765 210 L800 290 V340 L830 340 V420 Z" />
        </g>
      </svg>
      <svg
        className="absolute inset-x-0 bottom-0 w-full"
        viewBox="0 0 1440 300"
        preserveAspectRatio="xMidYMax slice"
        style={{ height: "34vh", color: "var(--forest-dark)" }}
      >
        <g fill="currentColor" opacity="0.9">
          <path d="M100 300 V210 L150 210 V150 L200 40 L250 150 V210 L300 210 V300 Z" />
          <path d="M380 300 V220 L430 220 V170 L480 60 L530 170 V220 L580 220 V300 Z" />
          <path d="M660 300 V215 L705 215 V160 L755 55 L805 160 V215 L850 215 V300 Z" />
          <path d="M940 300 V225 L990 225 V175 L1040 70 L1090 175 V225 L1140 225 V300 Z" />
          <path d="M1220 300 V215 L1265 215 V160 L1315 50 L1365 160 V215 L1410 215 V300 Z" />
          <rect x="0" y="288" width="1440" height="12" rx="6" />
        </g>
      </svg>
      {fireflies.map((f, i) => (
        <span
          key={i}
          className="firefly"
          style={
            {
              left: f.left,
              top: f.top,
              width: f.size,
              height: f.size,
              "--dx": f.dx,
              "--dy": f.dy,
              "--duration": f.duration,
              "--delay": f.delay,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
