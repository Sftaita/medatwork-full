/**
 * exportSchedulePdf — Planning listé par MACC, trié chronologiquement.
 * Génère un PDF A4 portrait via jsPDF et expose aussi une fonction print.
 */

import { jsPDF } from 'jspdf';
import type { MCMacc, MCService, MCEvent } from './MonthCalendar';

const FR_MONTHS    = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const FR_DAYS_FULL = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];

export interface ScheduleExportParams {
  activeMaccs:  MCMacc[];
  enabledMaccs: Set<string>;
  events:       Record<string, MCEvent[]>;
  services:     Record<string, MCService>;
  fromDate:     string; // YYYY-MM-DD
  toDate:       string; // YYYY-MM-DD
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateFull(key: string): string {
  const d   = new Date(key + 'T12:00:00');
  const dow = FR_DAYS_FULL[d.getDay()];
  return `${dow.charAt(0).toUpperCase() + dow.slice(1)} ${d.getDate()} ${FR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDateShort(key: string): string {
  const d = new Date(key + 'T12:00:00');
  return `${d.getDate()} ${FR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}

// ── Données structurées ───────────────────────────────────────────────────────

export interface MaccSchedule {
  mac:  MCMacc;
  days: { key: string; evts: MCEvent[] }[];
}

export function buildMaccSchedules(p: ScheduleExportParams): MaccSchedule[] {
  const keys = Object.keys(p.events)
    .filter((k) => k >= p.fromDate && k <= p.toDate)
    .sort();

  return p.activeMaccs
    .filter((m) => p.enabledMaccs.has(m.id))
    .map((mac) => ({
      mac,
      days: keys
        .map((key) => ({ key, evts: (p.events[key] ?? []).filter((e) => e.maccId === mac.id) }))
        .filter((d) => d.evts.length > 0),
    }))
    .filter((ms) => ms.days.length > 0);
}

// ── Génération PDF ────────────────────────────────────────────────────────────

function buildDoc(p: ScheduleExportParams): jsPDF {
  const schedules = buildMaccSchedules(p);
  const doc       = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const W  = 210, ML = 15, MR = 15, MT = 15, BOTTOM = 282;
  const UW = W - ML - MR;

  let y = MT;

  const newPage = () => { doc.addPage(); y = MT; };
  const need    = (h: number) => { if (y + h > BOTTOM) newPage(); };

  // Titre
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(30, 30, 30);
  doc.text('Planning des affectations', ML, y + 6);
  y += 10;

  // Sous-titre plage de dates
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 120);
  doc.text(`Du ${formatDateShort(p.fromDate)} au ${formatDateShort(p.toDate)}`, ML, y + 4);
  doc.text(`Exporté le ${new Date().toLocaleDateString('fr-BE')}`, W - MR, y + 4, { align: 'right' });
  y += 10;

  // Ligne de séparation
  doc.setDrawColor(210, 200, 225);
  doc.setLineWidth(0.4);
  doc.line(ML, y, W - MR, y);
  y += 7;

  if (schedules.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 160);
    doc.text('Aucune affectation dans cette plage de dates.', ML, y + 6);
    return doc;
  }

  schedules.forEach(({ mac, days }, maccIdx) => {
    need(16);

    // ── En-tête MACC ──────────────────────────────────────────────────────────
    const [r, g, b] = hexToRgb(mac.color);
    doc.setFillColor(r, g, b);
    doc.roundedRect(ML, y, UW, 9, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(mac.name, ML + 5, y + 6);
    y += 12;

    days.forEach(({ key, evts }) => {
      need(7 + evts.length * 6);

      // ── En-tête jour ─────────────────────────────────────────────────────────
      doc.setFillColor(248, 245, 252);
      doc.rect(ML + 1, y, UW - 1, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(70, 50, 100);
      doc.text(formatDateFull(key), ML + 4, y + 4.2);
      y += 7;

      evts.forEach((ev) => {
        need(6.5);
        const svc = p.services[ev.serviceId];

        // Pastille couleur MACC
        doc.setFillColor(r, g, b);
        doc.roundedRect(ML + 4, y + 0.5, 2, 4, 0.5, 0.5, 'F');

        // Libellé du poste
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(30, 30, 40);
        const label = svc?.label ?? ev.serviceId;
        doc.text(label, ML + 9, y + 4);

        // Horaire (droite)
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(r, g, b);
        doc.text(`${ev.start} – ${ev.end}`, W - MR, y + 4, { align: 'right' });

        doc.setTextColor(30, 30, 40);
        y += 6;
      });

      y += 2;
    });

    // Séparateur inter-MACCs
    if (maccIdx < schedules.length - 1) {
      need(8);
      doc.setDrawColor(220, 215, 230);
      doc.setLineWidth(0.2);
      doc.line(ML, y + 2, W - MR, y + 2);
      y += 8;
    }
  });

  return doc;
}

// ── API publique ──────────────────────────────────────────────────────────────

export function downloadSchedulePdf(p: ScheduleExportParams): void {
  const doc = buildDoc(p);
  const mm  = String(new Date(p.fromDate + 'T12:00:00').getMonth() + 1).padStart(2, '0');
  const yy  = new Date(p.fromDate + 'T12:00:00').getFullYear();
  doc.save(`planning-${yy}-${mm}.pdf`);
}

export function pdfToBase64(p: ScheduleExportParams): string {
  return buildDoc(p).output('datauristring').split(',')[1];
}

export function printSchedule(p: ScheduleExportParams): void {
  const schedules = buildMaccSchedules(p);

  const evtRows = (evts: MCEvent[], mac: MCMacc) =>
    evts.map((ev) => {
      const svc = p.services[ev.serviceId];
      return `<div class="evt">
        <span class="dot" style="background:${mac.color}"></span>
        <span class="lbl">${svc?.label ?? ev.serviceId}</span>
        <span class="time">${ev.start} – ${ev.end}</span>
      </div>`;
    }).join('');

  const maccBlocks = schedules.map(({ mac, days }) => `
    <div class="macc-block">
      <div class="macc-hd" style="background:${mac.color}">${mac.name}</div>
      ${days.map(({ key, evts }) => `
        <div class="day-block">
          <div class="day-hd">${formatDateFull(key)}</div>
          ${evtRows(evts, mac)}
        </div>
      `).join('')}
    </div>`).join('<div class="sep"></div>');

  const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8">
<title>Planning des affectations</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,Arial,sans-serif;font-size:10pt;color:#1a1a2e;padding:16mm}
  h1{font-size:16pt;margin-bottom:3px}
  .sub{color:#777;font-size:8.5pt;margin-bottom:14px}
  .macc-block{margin-bottom:14px}
  .macc-hd{color:#fff;font-weight:700;font-size:11pt;padding:5px 10px;border-radius:4px;margin-bottom:6px}
  .day-block{margin-left:8px;margin-bottom:7px}
  .day-hd{font-weight:600;font-size:8pt;color:#4a3264;text-transform:capitalize;
          border-bottom:1px solid #e0d8f0;padding-bottom:2px;margin-bottom:4px}
  .evt{display:flex;align-items:center;gap:7px;padding:2px 0 2px 6px}
  .dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
  .lbl{flex:1;font-size:9pt}
  .time{font-weight:600;font-size:9pt;font-variant-numeric:tabular-nums;color:#7b3fa0}
  .sep{border-top:1px solid #ddd;margin:10px 0}
  @media print{body{padding:12mm}.macc-block{page-break-inside:avoid}}
</style></head>
<body>
  <h1>Planning des affectations</h1>
  <div class="sub">Du ${formatDateShort(p.fromDate)} au ${formatDateShort(p.toDate)}</div>
  ${schedules.length === 0 ? '<p style="color:#999">Aucune affectation dans cette plage.</p>' : maccBlocks}
</body></html>`;

  const win = window.open('', '_blank', 'width=820,height=700');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}
