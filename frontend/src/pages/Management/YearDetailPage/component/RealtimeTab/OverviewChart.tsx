import { useState } from 'react';
import type { MaccsEntry } from './types';
import { THRESHOLDS, SERIES_COLORS, FALLBACK_AV_COLORS } from './types';

interface OverviewChartProps {
  maccs: MaccsEntry[];
  weeks: string[];
}

const OW = 900, OH = 380;
const padL = 44, padR = 16, padB = 40, padT = 14;
const MAX_V = 100;

const Y_AXIS_VALUES = [0, 25, THRESHOLDS.cible, THRESHOLDS.max, THRESHOLDS.abs, MAX_V];

function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const cx = (x0 + x1) / 2;
    d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
  }
  return d;
}

const OverviewChart = ({ maccs, weeks }: OverviewChartProps) => {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [tooltip, setTooltip] = useState<{
    name: string; week: string; val: number; xPct: number; yPct: number;
  } | null>(null);

  const innerH = OH - padB - padT;
  const innerW = OW - padL - padR;
  const xOf    = (i: number) => padL + (innerW / (weeks.length - 1)) * i;
  const yOf    = (v: number) => padT + innerH - (v / MAX_V) * innerH;

  const toggleSeries = (last: string) => {
    setHidden(prev => {
      const next = new Set(prev);
      next.has(last) ? next.delete(last) : next.add(last);
      return next;
    });
  };

  const focused = hidden.size > 0;

  return (
    <div>
      {/* SVG chart */}
      <div style={{ position: 'relative' }}>
        <svg
          viewBox={`0 0 ${OW} ${OH}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', display: 'block' }}
          aria-label="Vue d'ensemble des heures prestées par semaine"
          role="img"
        >
          {/* Y-axis grid + coloured reference lines */}
          {Y_AXIS_VALUES.map(v => {
            const yy  = yOf(v);
            const ref = v === THRESHOLDS.cible ? '#2f9e5b'
              : v === THRESHOLDS.max ? '#d99214'
              : v === THRESHOLDS.abs ? '#d6483f'
              : null;
            return (
              <g key={v}>
                <line
                  x1={padL} x2={OW - padR} y1={yy} y2={yy}
                  stroke={ref ?? '#ececef'} strokeWidth="1"
                  {...(ref ? { strokeDasharray: '5 5', opacity: '.6' } : {})}
                />
                <text
                  x={padL - 8} y={yy + 3}
                  fontSize="10" fill={ref ?? '#938c9c'} textAnchor="end"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {v}h
                </text>
              </g>
            );
          })}

          {/* X-axis labels */}
          {weeks.map((w, i) => (
            <text
              key={i} x={xOf(i)} y={OH - 16}
              fontSize="11" fill="#938c9c" textAnchor="middle"
              fontFamily="Inter, sans-serif"
            >
              Semaine {w.slice(1)}
            </text>
          ))}

          {/* Series lines + dots */}
          {maccs.map((m, mi) => {
            if (hidden.has(m.last)) return null;
            const col = SERIES_COLORS[m.last] ?? FALLBACK_AV_COLORS[mi % FALLBACK_AV_COLORS.length];
            const pts = m.week.prest.map((v, i): [number, number] => [xOf(i), yOf(v)]);
            return (
              <g key={m.last}>
                <path
                  d={smoothPath(pts)}
                  fill="none" stroke={col}
                  strokeWidth={focused ? 3 : 2.4}
                  strokeLinecap="round"
                  opacity={focused ? 1 : 0.92}
                />
                {pts.map((p, i) => (
                  <circle
                    key={i}
                    cx={p[0]} cy={p[1]} r="3.4"
                    fill="#fff" stroke={col} strokeWidth="2"
                    style={{ cursor: 'default' }}
                    onMouseEnter={() => setTooltip({
                      name: m.name, week: weeks[i],
                      val: m.week.prest[i],
                      xPct: (p[0] / OW) * 100,
                      yPct: (p[1] / OH) * 100,
                    })}
                    onMouseLeave={() => setTooltip(null)}
                  />
                ))}
              </g>
            );
          })}
        </svg>

        {tooltip && (
          <div
            role="tooltip"
            style={{
              position: 'absolute',
              left: `${tooltip.xPct}%`,
              top: `${tooltip.yPct}%`,
              transform: 'translate(-50%, -120%)',
              background: '#26222b',
              color: '#fff',
              borderRadius: 8,
              padding: '4px 10px',
              fontSize: 12,
              fontFamily: 'Inter, sans-serif',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              zIndex: 10,
            }}
          >
            <b>{tooltip.name}</b> · {tooltip.week} : {tooltip.val}h
          </div>
        )}
      </div>

      {/* Clickable legend */}
      <div
        style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}
        role="group"
        aria-label="Légende — cliquer pour isoler un MACCS"
      >
        {maccs.map((m, mi) => {
          const col  = SERIES_COLORS[m.last] ?? FALLBACK_AV_COLORS[mi % FALLBACK_AV_COLORS.length];
          const off  = hidden.has(m.last);
          const peak = Math.max(...m.week.prest);
          return (
            <button
              key={m.last}
              data-testid={`legend-${m.last}`}
              onClick={() => toggleSeries(m.last)}
              aria-pressed={!off}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                border: `1px solid ${off ? '#e2dee8' : col}`,
                borderRadius: 999,
                padding: '4px 10px',
                background: off ? '#f7f5fa' : '#fff',
                cursor: 'pointer',
                fontSize: 12,
                opacity: off ? 0.5 : 1,
                fontFamily: 'Inter, sans-serif',
                transition: 'opacity .15s',
              }}
            >
              <span
                style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: col, display: 'inline-block', flexShrink: 0,
                }}
              />
              {m.last}
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#938c9c' }}>
                {peak}h
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default OverviewChart;
