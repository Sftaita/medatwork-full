/**
 * exportRealtimePdf.ts
 *
 * Génération de deux PDF via jsPDF (sans html2canvas) :
 *   - "export"       : rapport brut A4 paysage, tableau semaine × MACCS, adapté à l'archivage
 *   - "presentation" : rapport structuré A4 paysage, page de couverture, résumé exécutif,
 *                      graphique, points d'attention et conclusion — destiné aux réunions RH.
 *
 * Les données de démo (DEMO_MACCS, DEMO_WEEKS) sont utilisées en l'absence d'API.
 * Remplacer ces imports dès que l'endpoint GET managers/realtime/{yearId}/{month} est prêt.
 */

import { jsPDF } from 'jspdf';
import type { MaccsEntry } from './types';
import { statusOf, THRESHOLDS, SERIES_COLORS, FALLBACK_AV_COLORS } from './types';

// ── Palette & constantes ──────────────────────────────────────────────────────

const C = {
  violet:   [123, 63, 160] as [number,number,number],
  violetL:  [244, 236, 249] as [number,number,number],
  green:    [47, 158, 91]  as [number,number,number],
  greenL:   [232, 246, 238] as [number,number,number],
  amber:    [217, 146, 20] as [number,number,number],
  amberL:   [251, 241, 221] as [number,number,number],
  red:      [214, 72, 63]  as [number,number,number],
  redL:     [253, 238, 237] as [number,number,number],
  ink:      [38, 34, 43]   as [number,number,number],
  ink2:     [93, 87, 101]  as [number,number,number],
  ink3:     [147, 140, 156] as [number,number,number],
  line:     [236, 236, 239] as [number,number,number],
  bg:       [247, 245, 250] as [number,number,number],
  white:    [255, 255, 255] as [number,number,number],
};

function hex(color: [number,number,number]): string {
  return color.map(c => c.toString(16).padStart(2,'0')).join('');
}

function hexToRgb(hex: string): [number,number,number] {
  const h = hex.replace('#','');
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}

const FR_MONTHS = [
  'janvier','février','mars','avril','mai','juin',
  'juillet','août','septembre','octobre','novembre','décembre',
];

function nowStr(): string {
  const d = new Date();
  return `${d.getDate()} ${FR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function statusLabel(st: string): string {
  return st === 'bad' ? 'Dépassement' : st === 'warn' ? 'À surveiller' : 'Conforme';
}

function statusColor(st: string): [number,number,number] {
  return st === 'bad' ? C.red : st === 'warn' ? C.amber : C.green;
}

// ── Calculs résumé ────────────────────────────────────────────────────────────

interface Summary {
  total:  number;
  bad:    number;
  warn:   number;
  ok:     number;
}

function computeSummary(maccs: MaccsEntry[]): Summary {
  const statuses = maccs.map(statusOf);
  return {
    total: maccs.length,
    bad:   statuses.filter(s => s === 'bad').length,
    warn:  statuses.filter(s => s === 'warn').length,
    ok:    statuses.filter(s => s === 'ok').length,
  };
}

// ── Helper jsPDF ──────────────────────────────────────────────────────────────

function pageFooter(doc: jsPDF, page: number, W: number, H: number, title: string): void {
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.ink3);
  doc.text(`MED@WORK — ${title}`, 15, H - 7);
  doc.text(`Page ${page} · Généré le ${nowStr()}`, W - 15, H - 7, { align: 'right' });
}

// ── PDF EXPORT (brut) — A4 paysage ───────────────────────────────────────────

export function buildExportPdf(
  maccs:     MaccsEntry[],
  weeks:     string[],
  yearTitle: string,
  month:     string,
): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = 297, H = 210;
  const ML = 15, MR = 15, MT = 15;
  const UW = W - ML - MR;
  const summary = computeSummary(maccs);
  let pageNum = 1;

  // ── En-tête ───────────────────────────────────────────────────────────────
  doc.setFillColor(...C.violet);
  doc.rect(0, 0, W, 18, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...C.white);
  doc.text('Rapport Temps réel — Heures prestées', ML, 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`${yearTitle} · ${month}`, W - MR, 11, { align: 'right' });

  let y = MT + 12;

  // ── Bandeau résumé ────────────────────────────────────────────────────────
  const cards = [
    { label: 'MACCS suivis',   value: summary.total, col: C.violet },
    { label: 'En dépassement', value: summary.bad,   col: C.red    },
    { label: 'À surveiller',   value: summary.warn,  col: C.amber  },
    { label: 'Conformes',      value: summary.ok,    col: C.green  },
  ];
  const cw = (UW - 9) / 4;
  cards.forEach(({ label, value, col }, i) => {
    const cx = ML + i * (cw + 3);
    doc.setFillColor(...col);
    doc.roundedRect(cx, y, cw, 14, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...C.white);
    doc.text(String(value), cx + cw / 2, y + 8, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(label, cx + cw / 2, y + 12.5, { align: 'center' });
  });
  y += 19;

  // ── Tableau heures semaine × MACCS ────────────────────────────────────────
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.ink);
  doc.text('Heures prestées par semaine (h)', ML, y + 4);
  y += 8;

  const COL_NOM = 52;
  const COL_W   = (UW - COL_NOM - (weeks.length + 1) * 0.5) / weeks.length;
  const ROW_H   = 8;

  // Header tableau
  doc.setFillColor(...C.bg);
  doc.rect(ML, y, UW, ROW_H, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...C.ink2);
  doc.text('MACCS', ML + 2, y + 5.5);
  weeks.forEach((w, i) => {
    doc.text(w, ML + COL_NOM + i * COL_W + COL_W / 2, y + 5.5, { align: 'center' });
  });
  doc.text('Total', ML + UW - 14, y + 5.5, { align: 'right' });
  y += ROW_H;

  // Lignes triées par statut (bad en premier)
  const sorted = [...maccs].sort((a, b) => {
    const rank = (s: string) => s === 'bad' ? 0 : s === 'warn' ? 1 : 2;
    return rank(statusOf(a)) - rank(statusOf(b));
  });

  sorted.forEach((m, idx) => {
    const st   = statusOf(m);
    const stC  = statusColor(st);
    const fill = idx % 2 === 0 ? C.white : C.bg;

    doc.setFillColor(...fill);
    doc.rect(ML, y, UW, ROW_H, 'F');

    // Bande statut à gauche
    doc.setFillColor(...stC);
    doc.rect(ML, y, 2.5, ROW_H, 'F');

    // Nom
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...C.ink);
    doc.text(m.name, ML + 5, y + 5.5);

    // Heures par semaine avec code couleur
    m.week.prest.forEach((h, i) => {
      const cellColor = h > THRESHOLDS.abs ? C.red :
                        h > THRESHOLDS.max ? C.amber : C.green;
      const cx = ML + COL_NOM + i * COL_W;

      doc.setFillColor(...cellColor);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...C.white);
      const cellW = COL_W - 1;
      doc.roundedRect(cx + 0.5, y + 1, cellW, ROW_H - 2, 1, 1, 'F');
      doc.text(`${h}h`, cx + cellW / 2 + 0.5, y + 5.5, { align: 'center' });
    });

    // Total
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...C.ink);
    doc.text(m.totH, ML + UW - 1, y + 5.5, { align: 'right' });

    y += ROW_H;
  });

  y += 6;

  // ── Légende seuils ────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...C.ink2);
  doc.text('Seuils légaux : ', ML, y + 4);
  const legend = [
    { label: '≤ 60h — Conforme', col: C.green },
    { label: '> 60h — À surveiller', col: C.amber },
    { label: '> 72h — Dépassement', col: C.red },
  ];
  let lx = ML + 30;
  legend.forEach(({ label, col }) => {
    doc.setFillColor(...col);
    doc.roundedRect(lx, y + 0.5, 3, 3, 0.5, 0.5, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.ink2);
    doc.text(label, lx + 5, y + 4);
    lx += 55;
  });

  pageFooter(doc, pageNum, W, H, `${yearTitle} · ${month}`);
  return doc;
}

// ── PDF PRÉSENTATION — A4 paysage ─────────────────────────────────────────────

export function buildPresentationPdf(
  maccs:     MaccsEntry[],
  weeks:     string[],
  yearTitle: string,
  month:     string,
): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = 297, H = 210;
  const ML = 18, MR = 18;
  const UW = W - ML - MR;
  const summary = computeSummary(maccs);
  let pageNum = 1;

  // ════════════════════════════════════════════════════════════
  // PAGE 1 — Couverture
  // ════════════════════════════════════════════════════════════

  // Fond violet
  doc.setFillColor(...C.violet);
  doc.rect(0, 0, W * 0.38, H, 'F');

  // Bande décorative
  doc.setFillColor(103, 43, 140);
  doc.rect(0, H * 0.62, W * 0.38, H * 0.38, 'F');

  // Titre sur fond violet
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(...C.white);
  doc.text('Temps réel', 8, 55);
  doc.text('MACCS', 8, 68);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(210, 185, 235);
  doc.text('Rapport d\'activité', 8, 80);

  doc.setFontSize(9);
  doc.setTextColor(180, 155, 210);
  doc.text('MED@WORK', 8, H - 12);

  // Partie droite — informations
  const rx = W * 0.38 + 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...C.ink);
  doc.text(yearTitle, rx, 50);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(...C.ink2);
  doc.text(month, rx, 62);

  doc.setFontSize(10);
  doc.setTextColor(...C.ink3);
  doc.text(`Généré le ${nowStr()}`, rx, 74);

  // Séparateur
  doc.setDrawColor(...C.line);
  doc.setLineWidth(0.5);
  doc.line(rx, 82, W - MR, 82);

  // Résumé cartes
  const cards = [
    { label: 'MACCS suivis',    value: summary.total, col: C.violet, bg: C.violetL },
    { label: 'En dépassement',  value: summary.bad,   col: C.red,    bg: C.redL    },
    { label: 'À surveiller',    value: summary.warn,  col: C.amber,  bg: C.amberL  },
    { label: 'Conformes',       value: summary.ok,    col: C.green,  bg: C.greenL  },
  ];
  const cw = (W - MR - rx - 9) / 4;
  cards.forEach(({ label, value, col, bg }, i) => {
    const cx = rx + i * (cw + 3);
    doc.setFillColor(...bg);
    doc.roundedRect(cx, 90, cw, 22, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(...col);
    doc.text(String(value), cx + cw / 2, 104, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.ink2);
    doc.text(label, cx + cw / 2, 110, { align: 'center' });
  });

  // Explication seuils
  const sy = 122;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...C.ink2);
  doc.text('Seuils légaux de référence :', rx, sy);

  [
    { h: 48, label: 'Cible légale — opting-out non activé',   col: C.green },
    { h: 60, label: 'Maximum légal avec opting-out',           col: C.amber },
    { h: 72, label: 'Limite absolue — dépassement interdit',   col: C.red   },
  ].forEach(({ h, label, col }, i) => {
    const ty = sy + 8 + i * 9;
    doc.setFillColor(...col);
    doc.roundedRect(rx, ty - 3, 14, 5, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...C.white);
    doc.text(`${h}h`, rx + 7, ty + 0.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.ink);
    doc.text(label, rx + 18, ty + 0.5);
  });

  pageFooter(doc, pageNum, W, H, `${yearTitle} · ${month}`);

  // ════════════════════════════════════════════════════════════
  // PAGE 2 — Tableau synthétique par MACCS
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  pageNum++;

  // En-tête page
  doc.setFillColor(...C.bg);
  doc.rect(0, 0, W, 14, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...C.violet);
  doc.text('Tableau synthétique par MACCS', ML, 9.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...C.ink3);
  doc.text(`${yearTitle} · ${month}`, W - MR, 9.5, { align: 'right' });

  let y = 22;

  // Colonnes : Nom | Total prestées | Pic hebdo | Statut légal | Prévisionnel | Commentaire
  const cols = [
    { label: 'MACCS',              w: 55  },
    { label: 'Total prestées',     w: 28  },
    { label: 'Pic hebdo',          w: 22  },
    { label: 'Statut légal',       w: 32  },
    { label: 'Prévisionnel',       w: 28  },
    { label: 'Commentaire',        w: 0   }, // reste
  ];
  const lastW = UW - cols.slice(0,-1).reduce((s,c) => s + c.w, 0);
  cols[cols.length - 1].w = lastW;

  // Header row
  doc.setFillColor(...C.violet);
  doc.rect(ML, y, UW, 8, 'F');
  let cx = ML;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.white);
  cols.forEach(col => {
    doc.text(col.label, cx + 2, y + 5.5);
    cx += col.w;
  });
  y += 8;

  const sorted2 = [...maccs].sort((a, b) => {
    const rank = (s: string) => s === 'bad' ? 0 : s === 'warn' ? 1 : 2;
    return rank(statusOf(a)) - rank(statusOf(b));
  });

  sorted2.forEach((m, idx) => {
    const st   = statusOf(m);
    const stC  = statusColor(st);
    const peak = Math.max(...m.week.prest);
    const peakW = weeks[m.week.prest.indexOf(peak)];
    const rowH = 9;
    const fill = idx % 2 === 0 ? C.white : C.bg;

    doc.setFillColor(...fill);
    doc.rect(ML, y, UW, rowH, 'F');
    doc.setFillColor(...stC);
    doc.rect(ML, y, 2, rowH, 'F');

    cx = ML + 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...C.ink);
    doc.text(m.name, cx + 2, y + 6);
    cx += cols[0].w;

    doc.setFont('helvetica', 'normal');
    doc.text(m.totH, cx + 2, y + 6);
    cx += cols[1].w;

    const peakC = peak > THRESHOLDS.abs ? C.red : peak > THRESHOLDS.max ? C.amber : C.green;
    doc.setTextColor(...peakC);
    doc.setFont('helvetica', 'bold');
    doc.text(`${peak}h (${peakW})`, cx + 2, y + 6);
    cx += cols[2].w;

    doc.setFillColor(...stC);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.white);
    doc.roundedRect(cx + 1, y + 2, cols[3].w - 4, 5.5, 1, 1, 'F');
    doc.text(statusLabel(st), cx + (cols[3].w - 3) / 2, y + 6, { align: 'center' });
    cx += cols[3].w;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.ink);
    const prevLabel = m.prevH !== null ? `${m.prevH}h prévu` : 'Non établi';
    const prevC     = m.prevH !== null ? C.ink : C.ink3;
    doc.setTextColor(...prevC);
    doc.text(prevLabel, cx + 2, y + 6);
    cx += cols[4].w;

    // Commentaire court si dépassement
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    let comment = '';
    if (st === 'bad' && peak > THRESHOLDS.abs) {
      comment = `Pic ${peak}h · limite 72h dépassée`;
    } else if (st === 'bad' && m.pct !== null && m.pct >= 100) {
      comment = `${m.pct}% du prévisionnel atteint`;
    } else if (st === 'warn' && peak > THRESHOLDS.max) {
      comment = `Pic ${peak}h · surveiller`;
    }
    doc.setTextColor(comment ? C.ink[0] : C.ink3[0], comment ? C.ink[1] : C.ink3[1], comment ? C.ink[2] : C.ink3[2]);
    doc.text(comment || '—', cx + 2, y + 6);

    y += rowH;
  });

  pageFooter(doc, pageNum, W, H, `${yearTitle} · ${month}`);

  // ════════════════════════════════════════════════════════════
  // PAGE 3 — Graphique heures prestées par semaine
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  pageNum++;

  doc.setFillColor(...C.bg);
  doc.rect(0, 0, W, 14, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...C.violet);
  doc.text('Vue d\'ensemble — Heures prestées par semaine', ML, 9.5);

  y = 22;

  // Chart area
  const chartML = ML + 12;
  const chartW  = UW - 12;
  const chartH  = 100;
  const padB    = 14;
  const padT    = 6;
  const innerH  = chartH - padB - padT;
  const maxV    = 100;

  const xOf = (i: number) => chartML + (chartW / (weeks.length - 1)) * i;
  const yOf = (v: number) => y + padT + innerH - (v / maxV) * innerH;

  // Fond chart
  doc.setFillColor(...C.white);
  doc.roundedRect(chartML - 6, y, chartW + 12, chartH + 6, 2, 2, 'F');

  // Lignes de grille + repères légaux
  [0, 25, THRESHOLDS.cible, THRESHOLDS.max, THRESHOLDS.abs, 100].forEach(v => {
    const yy  = yOf(v);
    const ref = v === THRESHOLDS.cible ? C.green :
                v === THRESHOLDS.max   ? C.amber :
                v === THRESHOLDS.abs   ? C.red : null;

    doc.setDrawColor(...(ref ?? C.line));
    doc.setLineWidth(ref ? 0.35 : 0.2);
    if (ref) doc.setLineDashPattern([1.5, 1.5], 0);
    else doc.setLineDashPattern([], 0);
    doc.line(chartML, yy, chartML + chartW, yy);

    doc.setFontSize(7);
    doc.setFont('helvetica', ref ? 'bold' : 'normal');
    doc.setTextColor(...(ref ?? C.ink3));
    doc.text(`${v}h`, chartML - 8, yy + 2, { align: 'right' });
  });
  doc.setLineDashPattern([], 0);

  // Labels semaines
  weeks.forEach((w, i) => {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.ink3);
    doc.text(`S.${w.slice(1)}`, xOf(i), y + chartH - 2, { align: 'center' });
  });

  // Courbes par MACCS
  maccs.forEach((m, mi) => {
    const col = hexToRgb(SERIES_COLORS[m.last] ?? FALLBACK_AV_COLORS[mi % FALLBACK_AV_COLORS.length]);
    const pts = m.week.prest.map((v, i): [number,number] => [xOf(i), yOf(v)]);

    doc.setDrawColor(...col);
    doc.setLineWidth(1);
    for (let i = 0; i < pts.length - 1; i++) {
      doc.line(pts[i][0], pts[i][1], pts[i+1][0], pts[i+1][1]);
    }

    // Points
    pts.forEach(([px, py]) => {
      doc.setFillColor(...C.white);
      doc.circle(px, py, 1.2, 'FD');
      doc.setFillColor(...col);
      doc.circle(px, py, 0.8, 'F');
    });
  });

  // Légende
  const ly = y + chartH + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.ink2);
  doc.text('Légende :', ML, ly + 2);

  let lx = ML + 22;
  maccs.forEach((m, mi) => {
    const col = hexToRgb(SERIES_COLORS[m.last] ?? FALLBACK_AV_COLORS[mi % FALLBACK_AV_COLORS.length]);
    const peak = Math.max(...m.week.prest);
    doc.setFillColor(...col);
    doc.circle(lx + 2, ly + 1.5, 2, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.ink);
    doc.text(`${m.last} (${peak}h pic)`, lx + 5.5, ly + 2.5);
    lx += 40;
    if (lx > W - MR - 40) { lx = ML + 22; }
  });

  pageFooter(doc, pageNum, W, H, `${yearTitle} · ${month}`);

  // ════════════════════════════════════════════════════════════
  // PAGE 4 — Points d'attention + Conclusion
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  pageNum++;

  doc.setFillColor(...C.bg);
  doc.rect(0, 0, W, 14, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...C.violet);
  doc.text('Points d\'attention', ML, 9.5);

  y = 22;
  const badMaccs  = maccs.filter(m => statusOf(m) === 'bad');
  const warnMaccs = maccs.filter(m => statusOf(m) === 'warn');

  if (badMaccs.length === 0 && warnMaccs.length === 0) {
    doc.setFillColor(...C.greenL);
    doc.roundedRect(ML, y, UW, 18, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...C.green);
    doc.text('✓  Tous les MACCS sont conformes pour ce mois.', ML + 8, y + 11);
    y += 24;
  } else {
    if (badMaccs.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...C.red);
      doc.text(`Dépassements légaux (${badMaccs.length})`, ML, y + 4);
      y += 8;

      badMaccs.forEach(m => {
        const peak  = Math.max(...m.week.prest);
        const peakW = weeks[m.week.prest.indexOf(peak)];
        doc.setFillColor(...C.redL);
        doc.roundedRect(ML, y, UW, 11, 2, 2, 'F');
        doc.setFillColor(...C.red);
        doc.rect(ML, y, 2.5, 11, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...C.ink);
        doc.text(m.name, ML + 6, y + 4.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...C.ink2);
        const detail: string[] = [];
        if (peak > THRESHOLDS.abs) detail.push(`Pic de ${peak}h en ${peakW} (limite 72h)`);
        if (m.pct !== null && m.pct >= 100) detail.push(`${m.pct}% du prévisionnel atteint (${m.totH}/${m.prevH}h)`);
        doc.text(detail.join(' · '), ML + 6, y + 8.5);
        y += 14;
      });
    }

    if (warnMaccs.length > 0) {
      y += 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...C.amber);
      doc.text(`À surveiller (${warnMaccs.length})`, ML, y + 4);
      y += 8;

      warnMaccs.forEach(m => {
        const peak = Math.max(...m.week.prest);
        doc.setFillColor(...C.amberL);
        doc.roundedRect(ML, y, UW, 10, 2, 2, 'F');
        doc.setFillColor(...C.amber);
        doc.rect(ML, y, 2.5, 10, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...C.ink);
        doc.text(m.name, ML + 6, y + 4);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...C.ink2);
        doc.text(`Pic hebdomadaire de ${peak}h (> 60h)`, ML + 6, y + 8);
        y += 13;
      });
    }
  }

  // Conclusion
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...C.ink);
  doc.text('Conclusion', ML, y + 4);
  y += 10;

  const conclusionLines: string[] = [];
  if (summary.bad > 0) {
    conclusionLines.push(
      `Ce mois présente ${summary.bad} MACCS en situation de dépassement légal.`,
      'Une action correctrice est recommandée (réduction des gardes, révision du planning).',
    );
  } else if (summary.warn > 0) {
    conclusionLines.push(
      `Aucun dépassement légal cette période, mais ${summary.warn} MACCS approche(nt) du seuil de 72h.`,
      'Un suivi attentif est conseillé pour les prochaines semaines.',
    );
  } else {
    conclusionLines.push(
      'Tous les MACCS sont conformes aux seuils légaux ce mois.',
      'La situation est satisfaisante. Aucune action particulière requise.',
    );
  }

  conclusionLines.forEach(line => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...C.ink);
    doc.text(line, ML, y + 4);
    y += 7;
  });

  pageFooter(doc, pageNum, W, H, `${yearTitle} · ${month}`);
  return doc;
}

// ── PDF GRAPHIQUE — une page A4 paysage ──────────────────────────────────────

function buildChartPdf(
  maccs:     MaccsEntry[],
  weeks:     string[],
  yearTitle: string,
  month:     string,
): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = 297, H = 210;
  const ML = 18, MR = 18;
  const UW = W - ML - MR;

  doc.setFillColor(...C.bg);
  doc.rect(0, 0, W, 14, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...C.violet);
  doc.text('Vue d\'ensemble — Heures prestées par semaine', ML, 9.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...C.ink3);
  doc.text(`${yearTitle} · ${month}`, W - MR, 9.5, { align: 'right' });

  const y      = 22;
  const cML    = ML + 12;
  const cW     = UW - 12;
  const cH     = 135;
  const cPadB  = 14;
  const cPadT  = 6;
  const innerH = cH - cPadB - cPadT;
  const maxV   = 100;

  const xOf = (i: number) => cML + (cW / (weeks.length - 1)) * i;
  const yOf = (v: number) => y + cPadT + innerH - (v / maxV) * innerH;

  doc.setFillColor(...C.white);
  doc.roundedRect(cML - 6, y, cW + 12, cH + 6, 2, 2, 'F');

  [0, 25, THRESHOLDS.cible, THRESHOLDS.max, THRESHOLDS.abs, 100].forEach(v => {
    const yy  = yOf(v);
    const ref = v === THRESHOLDS.cible ? C.green :
                v === THRESHOLDS.max   ? C.amber :
                v === THRESHOLDS.abs   ? C.red : null;
    doc.setDrawColor(...(ref ?? C.line));
    doc.setLineWidth(ref ? 0.35 : 0.2);
    if (ref) doc.setLineDashPattern([1.5, 1.5], 0);
    else     doc.setLineDashPattern([], 0);
    doc.line(cML, yy, cML + cW, yy);
    doc.setFontSize(7);
    doc.setFont('helvetica', ref ? 'bold' : 'normal');
    doc.setTextColor(...(ref ?? C.ink3));
    doc.text(`${v}h`, cML - 8, yy + 2, { align: 'right' });
  });
  doc.setLineDashPattern([], 0);

  weeks.forEach((w, i) => {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.ink3);
    doc.text(`S.${w.slice(1)}`, xOf(i), y + cH - 2, { align: 'center' });
  });

  maccs.forEach((m, mi) => {
    const col = hexToRgb(SERIES_COLORS[m.last] ?? FALLBACK_AV_COLORS[mi % FALLBACK_AV_COLORS.length]);
    const pts = m.week.prest.map((v, i): [number, number] => [xOf(i), yOf(v)]);
    doc.setDrawColor(...col);
    doc.setLineWidth(1);
    for (let i = 0; i < pts.length - 1; i++) {
      doc.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    }
    pts.forEach(([px, py]) => {
      doc.setFillColor(...C.white);
      doc.circle(px, py, 1.2, 'FD');
      doc.setFillColor(...col);
      doc.circle(px, py, 0.8, 'F');
    });
  });

  const ly = y + cH + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.ink2);
  doc.text('Légende :', ML, ly + 2);

  let lx = ML + 22;
  maccs.forEach((m, mi) => {
    const col  = hexToRgb(SERIES_COLORS[m.last] ?? FALLBACK_AV_COLORS[mi % FALLBACK_AV_COLORS.length]);
    const peak = Math.max(...m.week.prest);
    doc.setFillColor(...col);
    doc.circle(lx + 2, ly + 1.5, 2, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.ink);
    doc.text(`${m.last} (${peak}h pic)`, lx + 5.5, ly + 2.5);
    lx += 40;
    if (lx > W - MR - 40) { lx = ML + 22; }
  });

  pageFooter(doc, 1, W, H, `${yearTitle} · ${month}`);
  return doc;
}

// ── API publique ──────────────────────────────────────────────────────────────

export function downloadExportPdf(maccs: MaccsEntry[], weeks: string[], yearTitle: string, month: string): void {
  buildChartPdf(maccs, weeks, yearTitle, month)
    .save(`graphique-maccs-${yearTitle}-${month}.pdf`);
}

export function downloadPresentationPdf(maccs: MaccsEntry[], weeks: string[], yearTitle: string, month: string): void {
  buildPresentationPdf(maccs, weeks, yearTitle, month)
    .save(`rapport-presentation-${yearTitle}-${month}.pdf`);
}

export function presentationPdfToBase64(maccs: MaccsEntry[], weeks: string[], yearTitle: string, month: string): string {
  return buildPresentationPdf(maccs, weeks, yearTitle, month)
    .output('datauristring').split(',')[1];
}
