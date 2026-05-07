import React, { useRef, CSSProperties } from 'react';

const S: Record<string, CSSProperties> = {
  wrap: {
    display: 'grid',
    gridTemplateColumns: 'var(--pw-label-w, 180px) 1fr',
    alignItems: 'stretch',
    position: 'sticky', top: 0, zIndex: 5,
    borderBottom: '1px solid #e2e8f0',
  },
  spacer: {
    padding: '10px 14px', fontSize: 11, fontWeight: 600,
    color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase',
    borderRight: '1px solid #f1f5f9',
    display: 'flex', alignItems: 'center',
    position: 'sticky', left: 0, zIndex: 6,
    background: '#fff',
  },
  ticks: {
    position: 'relative', height: 42,
    cursor: 'grab', userSelect: 'none', touchAction: 'pan-y',
  },
  tick: {
    position: 'absolute', top: 0, bottom: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
    fontSize: 11, fontWeight: 600, color: '#334155', paddingLeft: 6,
  },
};

interface Props {
  startHour: number;
  endHour: number;
}

export default function TimeRuler({ startHour, endHour }: Props) {
  const hours: number[] = [];
  for (let h = startHour; h <= endHour; h++) hours.push(h);
  const span = endHour - startHour;

  const dragRef = useRef<{ scroller: HTMLElement; startX: number; startScroll: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    let el: Element | null = e.currentTarget.parentElement;
    while (el) {
      const ov = getComputedStyle(el).overflowX;
      if ((ov === 'auto' || ov === 'scroll') && el.scrollWidth > el.clientWidth) break;
      el = el.parentElement;
    }
    if (!el) return;
    dragRef.current = { scroller: el as HTMLElement, startX: e.clientX, startScroll: (el as HTMLElement).scrollLeft };
    e.currentTarget.setPointerCapture(e.pointerId);
    (e.currentTarget as HTMLElement).style.cursor = 'grabbing';
    e.preventDefault();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    d.scroller.scrollLeft = d.startScroll - (e.clientX - d.startX);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    (e.currentTarget as HTMLElement).style.cursor = 'grab';
    dragRef.current = null;
  };

  return (
    <div style={S.wrap}>
      <div style={S.spacer}>Jour</div>
      <div
        style={S.ticks}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        title="Cliquer-glisser pour faire défiler"
      >
        {hours.map((h, i) => {
          const left = ((h - startHour) / span) * 100;
          return (
            <div
              key={h}
              style={{
                ...S.tick,
                left: `${left}%`,
                width: i === hours.length - 1 ? 'auto' : `${100 / span}%`,
                borderLeft: i === 0 ? 'none' : '1px solid #f1f5f9',
              }}
            >
              {String(h).padStart(2, '0')}h
            </div>
          );
        })}
      </div>
    </div>
  );
}
