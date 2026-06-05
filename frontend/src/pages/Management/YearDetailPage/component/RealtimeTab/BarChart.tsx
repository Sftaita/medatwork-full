import { useState } from 'react';
import { THRESHOLDS } from './types';

interface BarChartProps {
  weeks: string[];
  prest: number[];
  prev: number[] | null;
}

interface Tip {
  label: string;
  x: number;
  y: number;
}

const W = 520, H = 210, padL = 30, padB = 26, padT = 10;

const THRESHOLD_LINES: Array<{ key: keyof typeof THRESHOLDS; color: string }> = [
  { key: 'cible', color: '#2f9e5b' },
  { key: 'max',   color: '#d99214' },
  { key: 'abs',   color: '#d6483f' },
];

const TIP_W = 90, TIP_H = 22, TIP_R = 5;

const BarChart = ({ weeks, prest, prev }: BarChartProps) => {
  const [tip, setTip] = useState<Tip | null>(null);

  const hasPrev  = prev !== null;
  const prevArr  = hasPrev ? prev! : [];
  const maxV     = Math.max(THRESHOLDS.abs, ...prest, ...prevArr) * 1.08;
  const innerH   = H - padB - padT;
  const innerW   = W - padL - 8;
  const yOf      = (v: number) => padT + innerH - (v / maxV) * innerH;
  const groupW   = innerW / weeks.length;
  const bw = 13, gap = 5;

  const showTip = (label: string, cx: number, barTopY: number) => {
    // Positionne la bulle au-dessus de la barre, centrée horizontalement
    const tx = Math.min(Math.max(cx - TIP_W / 2, padL), W - 8 - TIP_W);
    const ty = Math.max(barTopY - TIP_H - 6, padT);
    setTip({ label, x: tx, y: ty });
  };

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', display: 'block' }}
      role="img"
      aria-label="Graphe prévisionnel par semaine"
      onMouseLeave={() => setTip(null)}
    >
      {/* baseline */}
      <line x1={padL} x2={W - 8} y1={H - padB} y2={H - padB} stroke="#e2dee8" />

      {/* threshold reference lines — 48h / 60h / 72h */}
      {THRESHOLD_LINES.map(({ key, color }) => {
        const v  = THRESHOLDS[key];
        const yy = yOf(v);
        return (
          <g key={key}>
            <line
              x1={padL} x2={W - 8} y1={yy} y2={yy}
              stroke={color} strokeWidth="1" strokeDasharray="4 4" opacity=".55"
            />
            <text
              x={W - 6} y={yy - 3}
              fontSize="9" fill={color} textAnchor="end"
              fontFamily="JetBrains Mono, monospace"
            >
              {v}h
            </text>
          </g>
        );
      })}

      {/* bars */}
      {prest.map((pv, i) => {
        const gx   = padL + i * groupW + groupW / 2;
        const over = pv > THRESHOLDS.abs;
        const week = weeks[i];

        if (hasPrev && prevArr.length > 0) {
          const x0      = gx - bw - gap / 2;
          const x1      = gx + gap / 2;
          const prevVal = prevArr[i];
          return (
            <g key={i}>
              {/* prévisionnel */}
              <rect
                x={x1} y={yOf(prevVal)}
                width={bw} height={Math.max(0, H - padB - yOf(prevVal))}
                rx="3" fill="#d9c2ec"
                style={{ cursor: 'default' }}
                onMouseEnter={() => showTip(`${week} · ${prevVal}h prévues`, x1 + bw / 2, yOf(prevVal))}
              />
              {/* prestées */}
              <rect
                x={x0} y={yOf(pv)}
                width={bw} height={Math.max(0, H - padB - yOf(pv))}
                rx="3" fill={over ? '#d6483f' : '#2f9e5b'}
                style={{ cursor: 'default' }}
                onMouseEnter={() => showTip(`${week} · ${pv}h prestées`, x0 + bw / 2, yOf(pv))}
              />
            </g>
          );
        }

        // No prev: single centred bar
        const x0 = gx - bw / 2;
        return (
          <rect
            key={i}
            x={x0} y={yOf(pv)}
            width={bw} height={Math.max(0, H - padB - yOf(pv))}
            rx="3" fill={over ? '#d6483f' : '#2f9e5b'}
            style={{ cursor: 'default' }}
            onMouseEnter={() => showTip(`${week} · ${pv}h`, x0 + bw / 2, yOf(pv))}
          />
        );
      })}

      {/* week labels */}
      {weeks.map((w, i) => (
        <text
          key={i}
          x={padL + i * groupW + groupW / 2} y={H - 9}
          fontSize="10" fill="#938c9c" textAnchor="middle"
          fontFamily="JetBrains Mono, monospace"
        >
          {w}
        </text>
      ))}

      {/* Tooltip bulle */}
      {tip && (
        <g style={{ pointerEvents: 'none' }}>
          <rect
            x={tip.x} y={tip.y}
            width={TIP_W} height={TIP_H}
            rx={TIP_R} fill="#26222b" opacity=".92"
          />
          <text
            x={tip.x + TIP_W / 2} y={tip.y + TIP_H / 2 + 4}
            fontSize="10" fill="#fff" textAnchor="middle"
            fontFamily="JetBrains Mono, monospace"
          >
            {tip.label}
          </text>
        </g>
      )}
    </svg>
  );
};

export default BarChart;
