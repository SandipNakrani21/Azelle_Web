import { useId, useMemo, useState, type ComponentType, type SVGProps } from "react";
import { useCountUp } from "./ui";

// Lightweight SVG charts for the admin dashboards. Single-series charts use the brand accent;
// part-to-whole charts use the validated categorical palette (slots 1–5) with labels + values beside
// every slice, so colour is never the only way to read them. Every chart has a hover tooltip and a
// screen-reader table.

export const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"];

type Point = { label: string; value: number; sub?: string };

function SrTable({ caption, rows, format }: { caption: string; rows: Point[]; format: (v: number) => string }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label}>
            <th scope="row">{r.label}</th>
            <td>{format(r.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Tooltip({ x, point, format }: { x: number; point: Point; format: (v: number) => string }) {
  return (
    <div
      className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-[10px] border border-line bg-surface px-3 py-2 text-[12.5px] shadow-lg"
      style={{ left: `${x}%` }}
    >
      <p className="font-semibold">{point.label}</p>
      <p className="tabular-nums">{format(point.value)}</p>
      {point.sub && <p className="text-soft">{point.sub}</p>}
    </div>
  );
}

// ── Area chart (trend) ─────────────────────────────────────────────────────
export function AreaChart({ data, format, caption, height = 220 }: { data: Point[]; format: (v: number) => string; caption: string; height?: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const H = height;
  const pad = { t: 16, r: 12, b: 28, l: 52 };
  const max = Math.max(...data.map((d) => d.value), 1) * 1.1;
  const x = (i: number) => pad.l + (i * (W - pad.l - pad.r)) / Math.max(1, data.length - 1);
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(data.length - 1)},${H - pad.b} L${x(0)},${H - pad.b} Z`;
  const ticks = [0, 0.5, 1].map((f) => f * max);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={caption} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={`${uid}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: "var(--accent)" }} stopOpacity="0.35" />
            <stop offset="1" style={{ stopColor: "var(--accent)" }} stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--line)" />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--soft)">
              {format(Math.round(t))}
            </text>
          </g>
        ))}
        <path d={area} fill={`url(#${uid}-fill)`} className="admin-fade" />
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" className="admin-draw" style={{ ["--len" as string]: 2000 }} />
        {data.map((d, i) => (
          <g key={d.label}>
            <rect x={x(i) - (W - pad.l) / data.length / 2} y={pad.t} width={(W - pad.l) / data.length} height={H - pad.t - pad.b} fill="transparent" onMouseEnter={() => setHover(i)} />
            {hover === i && <line x1={x(i)} x2={x(i)} y1={pad.t} y2={H - pad.b} stroke="var(--ink)" strokeOpacity="0.25" strokeDasharray="3 3" />}
            <circle cx={x(i)} cy={y(d.value)} r={hover === i ? 6 : 3.5} fill="var(--surface)" stroke="var(--accent)" strokeWidth="2.5" />
            {(i % Math.ceil(data.length / 7) === 0 || i === data.length - 1) && (
              <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="10.5" fill="var(--soft)">
                {d.label}
              </text>
            )}
          </g>
        ))}
      </svg>
      {hover !== null && <Tooltip x={(x(hover) / W) * 100} point={data[hover]} format={format} />}
      <SrTable caption={caption} rows={data} format={format} />
    </div>
  );
}

// ── Bar chart ──────────────────────────────────────────────────────────────
export function BarChart({ data, format, caption, height = 200 }: { data: Point[]; format: (v: number) => string; caption: string; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="relative">
      <ol className="flex items-end gap-1.5" style={{ height }} aria-label={caption} onMouseLeave={() => setHover(null)}>
        {data.map((d, i) => (
          <li key={d.label} className="flex h-full flex-1 flex-col justify-end" onMouseEnter={() => setHover(i)}>
            <span
              className="admin-grow block rounded-t-[4px]"
              style={{
                height: `${Math.max(d.value ? 3 : 0, (d.value / max) * 100)}%`,
                background: "linear-gradient(180deg, #d9a441, var(--accent))",
                opacity: hover === null || hover === i ? 1 : 0.45,
                animationDelay: `${i * 35}ms`,
              }}
            />
          </li>
        ))}
      </ol>
      <div className="mt-2 flex justify-between text-[11px] text-soft">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
      {hover !== null && <Tooltip x={((hover + 0.5) / data.length) * 100} point={data[hover]} format={format} />}
      <SrTable caption={caption} rows={data} format={format} />
    </div>
  );
}

// ── Donut (part-to-whole, ≤5 slices) ───────────────────────────────────────
export function DonutChart({ data, caption, center, format = (v) => v.toLocaleString("en-IN") }: { data: Point[]; caption: string; center: string; format?: (v: number) => string }) {
  const [hover, setHover] = useState<number | null>(null);
  const total = data.reduce((n, d) => n + d.value, 0);
  const R = 70;
  const C = 2 * Math.PI * R;
  const arcs = useMemo(() => {
    let offset = 0;
    return data.map((d, i) => {
      const len = total ? (d.value / total) * C : 0;
      // 2px gap between slices
      const arc = { i, dash: Math.max(0, len - 2), offset: -offset, color: SERIES[i % SERIES.length] };
      offset += len;
      return arc;
    });
  }, [data, total, C]);

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative h-[180px] w-[180px] shrink-0">
        <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90" role="img" aria-label={caption}>
          <circle cx="90" cy="90" r={R} fill="none" stroke="var(--surface2)" strokeWidth="22" />
          {arcs.map((a) => (
            <circle
              key={a.i}
              cx="90"
              cy="90"
              r={R}
              fill="none"
              stroke={a.color}
              strokeWidth={hover === a.i ? 28 : 22}
              strokeDasharray={`${a.dash} ${C}`}
              strokeDashoffset={a.offset}
              className="admin-fade transition-[stroke-width] duration-300"
              style={{ animationDelay: `${a.i * 120}ms` }}
              onMouseEnter={() => setHover(a.i)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="font-sans text-[1.6rem] font-bold leading-none">{hover !== null ? format(data[hover].value) : format(total)}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-soft">{hover !== null ? data[hover].label : center}</p>
          </div>
        </div>
      </div>
      {/* Legend with values: identity is never colour alone */}
      <ul className="min-w-[160px] flex-1 space-y-2 text-sm">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2.5" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <span className="h-3 w-3 shrink-0 rounded-[3px]" style={{ background: SERIES[i % SERIES.length] }} aria-hidden="true" />
            <span className="flex-1">{d.label}</span>
            <span className="font-semibold tabular-nums">{format(d.value)}</span>
            <span className="w-11 text-right text-[12px] tabular-nums text-soft">{total ? Math.round((d.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Sparkline (inside KPI cards) ───────────────────────────────────────────
export function Sparkline({ values, color = "var(--accent)" }: { values: number[]; color?: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${30 - (v / max) * 26}`).join(" ");
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="h-8 w-full" aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" className="admin-draw" style={{ ["--len" as string]: 300 }} />
    </svg>
  );
}

// ── KPI card: floating icon, counting number, optional sparkline ──────────
type Icon = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;
export function KpiCard({
  label,
  value,
  format,
  sub,
  icon: IconComp,
  gradient,
  spark,
  delay = 0,
}: {
  label: string;
  value: number;
  format: (v: number) => string;
  sub?: string;
  icon: Icon;
  gradient: string;
  spark?: number[];
  delay?: number;
}) {
  const shown = useCountUp(value);
  return (
    <div className="admin-card admin-rise relative overflow-hidden rounded-[20px] p-5" style={{ animationDelay: `${delay}ms` }}>
      {/* Soft coloured bloom in the corner */}
      <span className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-25 blur-2xl" style={{ background: gradient }} aria-hidden="true" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-soft">{label}</p>
          <p className="mt-2 font-sans text-[1.7rem] font-bold leading-none tracking-tight tabular-nums">{format(shown)}</p>
          {sub && <p className="mt-1.5 text-[12.5px] text-soft">{sub}</p>}
        </div>
        <span className="admin-float grid h-11 w-11 shrink-0 place-items-center rounded-[14px] text-white shadow-lg" style={{ background: gradient, animationDelay: `${delay}ms` }}>
          <IconComp size={20} />
        </span>
      </div>
      {spark && (
        <div className="relative mt-3">
          <Sparkline values={spark} />
        </div>
      )}
    </div>
  );
}
