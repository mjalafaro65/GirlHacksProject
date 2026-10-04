interface LanternLoaderProps {
  label?: string;
}

/** Five lanterns that light up one by one while results are prepared. */
export function LanternLoader({ label = "Gathering…" }: LanternLoaderProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-16" role="status" aria-label={label}>
      <div className="flex items-end gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="lantern block h-8 w-6 rounded-md"
            style={
              {
                background: "var(--gold)",
                "--delay": `${(i * 0.18).toFixed(2)}s`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
      <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </p>
    </div>
  );
}
