import { useState, useCallback } from 'react';

interface LineChartProps {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  fillColor?: string;
  /** Formata o valor no tooltip (default: formatação monetária simples) */
  formatValue?: (v: number) => string;
}

// Curva suave (Catmull-Rom → Bezier)
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

const defaultFormat = (v: number) =>
  v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0);

export function LineChart({
  data,
  height = 200,
  color = '#60a5fa',
  fillColor = 'rgba(96, 165, 250, 0.15)',
  formatValue = defaultFormat,
}: LineChartProps) {
  const [hover, setHover] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-slate-500 text-sm" style={{ height }}>
        Sem dados para exibir
      </div>
    );
  }

  const width = 600;
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values, 0);
  const maxVal = Math.max(...values, 0);
  const range = maxVal - minVal || 1;

  const xStep = data.length > 1 ? chartW / (data.length - 1) : 0;
  const yScale = (v: number) => padding.top + chartH - ((v - minVal) / range) * chartH;

  const points = data.map((d, i) => ({
    x: padding.left + i * xStep,
    y: yScale(d.value),
  }));

  const linePath = smoothPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;
  const zeroY = yScale(0);

  const handleMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * width;
      const rel = (x - padding.left) / (xStep || 1);
      const idx = Math.round(rel);
      if (idx >= 0 && idx < data.length) {
        setHover(idx);
      }
    },
    [data.length, xStep],
  );

  const hoverPoint = hover != null ? points[hover] : null;

  return (
    <div className="relative" style={{ height }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full"
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
        style={{ cursor: 'crosshair', fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }}
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColor} />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = padding.top + t * chartH;
          const val = maxVal - t * range;
          return (
            <g key={t}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#334155" strokeWidth="0.5" strokeDasharray="4 4" />
              <text x={padding.left - 8} y={y + 4} fill="#64748b" fontSize="11" fontWeight="500" textAnchor="end">
                {formatValue(val)}
              </text>
            </g>
          );
        })}
        {/* Zero line */}
        <line x1={padding.left} y1={zeroY} x2={width - padding.right} y2={zeroY} stroke="#475569" strokeWidth="1" />
        {/* Area */}
        <path d={areaPath} fill="url(#areaGrad)" />
        {/* Line */}
        <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {/* Crosshair (linha vertical no hover) */}
        {hoverPoint && (
          <line
            x1={hoverPoint.x}
            y1={padding.top}
            x2={hoverPoint.x}
            y2={padding.top + chartH}
            stroke="#64748b"
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.7"
          />
        )}
        {/* Points */}
        {points.map((p, i) => {
          const isHover = hover === i;
          return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={isHover ? 6 : 3.5}
              fill={data[i].value >= 0 ? color : '#fb7185'}
              stroke={isHover ? '#fff' : '#0b1120'}
              strokeWidth={isHover ? 2 : 1.5}
              style={{ transition: 'r 0.15s ease' }}
            />
          );
        })}
        {/* X labels */}
        {data.length <= 12 &&
          data.map((d, i) => (
            <text key={i} x={points[i].x} y={height - 8} fill="#64748b" fontSize="10" fontWeight="500" textAnchor="middle">
              {d.label}
            </text>
          ))}
      </svg>

      {/* Tooltip */}
      {hoverPoint && hover != null && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full px-3 py-2 rounded-lg bg-slate-800/95 border border-slate-600 shadow-xl text-xs"
          style={{
            left: `${(hoverPoint.x / width) * 100}%`,
            top: `${(hoverPoint.y / height) * 100}%`,
          }}
        >
          <div className="text-slate-400 mb-0.5">{data[hover].label}</div>
          <div className="font-bold text-slate-100">{formatValue(data[hover].value)}</div>
        </div>
      )}
    </div>
  );
}

interface BarChartProps {
  data: { label: string; value: number }[];
  height?: number;
  formatValue?: (v: number) => string;
}

export function BarChart({ data, height = 200, formatValue = defaultFormat }: BarChartProps) {
  const [hover, setHover] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-slate-500 text-sm" style={{ height }}>
        Sem dados para exibir
      </div>
    );
  }

  const width = 600;
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const values = data.map((d) => d.value);
  const maxAbs = Math.max(...values.map(Math.abs), 1);
  const barWidth = chartW / data.length;
  const barPadding = barWidth * 0.22;
  const zeroY = padding.top + chartH / 2;

  return (
    <div className="relative" style={{ height }}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" onMouseLeave={() => setHover(null)} style={{ fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }}>
        <defs>
          <linearGradient id="barPos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          <linearGradient id="barNeg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fb7185" />
            <stop offset="100%" stopColor="#e11d48" />
          </linearGradient>
        </defs>
        {/* Zero line */}
        <line x1={padding.left} y1={zeroY} x2={width - padding.right} y2={zeroY} stroke="#475569" strokeWidth="1" />
        {/* Grid */}
        {[-1, -0.5, 0.5, 1].map((t) => {
          const y = zeroY - t * (chartH / 2);
          const val = t * maxAbs;
          return (
            <g key={t}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#334155" strokeWidth="0.5" strokeDasharray="4 4" />
              <text x={padding.left - 8} y={y + 4} fill="#64748b" fontSize="11" fontWeight="500" textAnchor="end">
                {formatValue(val)}
              </text>
            </g>
          );
        })}
        {/* Bars */}
        {data.map((d, i) => {
          const barH = (Math.abs(d.value) / maxAbs) * (chartH / 2);
          const x = padding.left + i * barWidth + barPadding / 2;
          const y = d.value >= 0 ? zeroY - barH : zeroY;
          const isHover = hover === i;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth - barPadding}
                height={barH}
                fill={d.value >= 0 ? 'url(#barPos)' : 'url(#barNeg)'}
                rx="3"
                opacity={isHover ? 1 : 0.9}
                onMouseEnter={() => setHover(i)}
                style={{ cursor: 'pointer', transition: 'opacity 0.15s ease' }}
              />
              {isHover && (
                <rect
                  x={x}
                  y={y}
                  width={barWidth - barPadding}
                  height={barH}
                  fill="none"
                  stroke="#fff"
                  strokeWidth="1.5"
                  rx="3"
                />
              )}
              {data.length <= 12 && (
                <text x={x + (barWidth - barPadding) / 2} y={height - 8} fill="#64748b" fontSize="10" fontWeight="500" textAnchor="middle">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hover != null && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 px-3 py-2 rounded-lg bg-slate-800/95 border border-slate-600 shadow-xl text-xs"
          style={{
            left: `${((padding.left + hover * barWidth + barWidth / 2) / width) * 100}%`,
            top: '8px',
          }}
        >
          <div className="text-slate-400 mb-0.5">{data[hover].label}</div>
          <div
            className={`font-bold ${data[hover].value >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
          >
            {data[hover].value >= 0 ? '+' : ''}{formatValue(data[hover].value)}
          </div>
        </div>
      )}
    </div>
  );
}