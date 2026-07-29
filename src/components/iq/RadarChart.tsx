type Props = {
  labels: string[];
  values: number[];
  /** Optional second series (peer benchmark) */
  benchmark?: number[];
  color: string;
  size?: number;
};

function polar(cx: number, cy: number, r: number, angle: number) {
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as const;
}

/** Dependency-free spiderweb / radar chart for dimension scores (0-100). */
export function RadarChart({ labels, values, benchmark, color, size = 460 }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.29;
  const n = labels.length;
  const step = (Math.PI * 2) / n;
  const start = -Math.PI / 2;

  const ring = (frac: number) =>
    labels
      .map((_, i) => polar(cx, cy, radius * frac, start + i * step).join(","))
      .join(" ");

  const series = (vals: number[]) =>
    vals
      .map((v, i) => polar(cx, cy, (radius * Math.max(0, Math.min(100, v))) / 100, start + i * step).join(","))
      .join(" ");

  return (
    <svg viewBox={`-80 10 ${size + 160} ${size - 20}`} className="h-auto w-full" role="img" aria-label="Dimension score radar chart">
      {[0.2, 0.4, 0.6, 0.8, 1].map((f) => (
        <polygon key={f} points={ring(f)} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
      ))}
      {labels.map((_, i) => {
        const [x, y] = polar(cx, cy, radius, start + i * step);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.10)" strokeWidth="1" />;
      })}

      {benchmark && (
        <polygon
          points={series(benchmark)}
          fill="rgba(255,255,255,0.06)"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="1.25"
          strokeDasharray="4 4"
        />
      )}

      <polygon points={series(values)} fill={`${color}26`} stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {values.map((v, i) => {
        const [x, y] = polar(cx, cy, (radius * v) / 100, start + i * step);
        return <circle key={i} cx={x} cy={y} r="3.5" fill={color} />;
      })}

      {labels.map((l, i) => {
        const angle = start + i * step;
        const [x, y] = polar(cx, cy, radius + 20, angle);
        const anchor = Math.abs(Math.cos(angle)) < 0.2 ? "middle" : Math.cos(angle) > 0 ? "start" : "end";
        const words = l.split(" ");
        const lines: string[] = [];
        let cur = "";
        for (const w of words) {
          if ((cur + " " + w).trim().length > 16) {
            lines.push(cur.trim());
            cur = w;
          } else cur = `${cur} ${w}`;
        }
        if (cur.trim()) lines.push(cur.trim());
        return (
          <text key={l} x={x} y={y - (lines.length - 1) * 5} textAnchor={anchor} fill="rgba(255,255,255,0.55)" fontSize="10.5">
            {lines.map((line, li) => (
              <tspan key={line} x={x} dy={li === 0 ? 0 : 11}>
                {line}
              </tspan>
            ))}
          </text>
        );
      })}
    </svg>
  );
}
