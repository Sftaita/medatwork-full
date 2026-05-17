/**
 * exportCalendarPdf — Génère un PDF A4 paysage du calendrier mensuel.
 * Seuls les événements des MACCs cochés sont inclus.
 */

import { jsPDF } from 'jspdf';
import type { MCMacc, MCService, MCEvent } from './MonthCalendar';

const FR_MONTHS    = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const FR_DAYS_HEAD = ['Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.', 'Dim.'];

interface Cell {
  key:     string;
  day:     number;
  inMonth: boolean;
  dow:     number; // 0=Sun … 6=Sat
}

interface ExportParams {
  viewMonth:    Date;
  cells:        Cell[];
  events:       Record<string, MCEvent[]>;
  enabledMaccs: Set<string>;
  macById:      Record<string, MCMacc>;
  services:     Record<string, MCService>;
  todayKey:     string;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function truncate(doc: jsPDF, text: string, maxMm: number): string {
  if (doc.getTextWidth(text) <= maxMm) return text;
  let s = text;
  while (s.length > 1 && doc.getTextWidth(s + '…') > maxMm) s = s.slice(0, -1);
  return s + '…';
}

export function exportCalendarPdf({
  viewMonth, cells, events, enabledMaccs, macById, services, todayKey,
}: ExportParams): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // ── Dimensions ──────────────────────────────────────────────────────────────
  const W = 297, H = 210;
  const ML = 10, MR = 10, MT = 10, MB = 8;
  const usableW = W - ML - MR;               // 277 mm
  const colW    = usableW / 7;               // ≈ 39.6 mm / colonne

  const HEADER_H  = 7;   // hauteur bande jours de semaine
  const TITLE_H   = 18;  // zone titre + sous-titre
  const gridStartY = MT + TITLE_H + HEADER_H;
  const gridH      = H - MB - gridStartY;
  const totalRows  = Math.ceil(cells.length / 7);
  const rowH       = gridH / totalRows;

  // ── Titre ───────────────────────────────────────────────────────────────────
  const monthLabel = `${FR_MONTHS[viewMonth.getMonth()]} ${viewMonth.getFullYear()}`;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(30, 30, 30);
  doc.text(`Agenda — ${monthLabel}`, ML, MT + 7);

  // MACCs filtrés
  const activeMaccs = Object.values(macById).filter((m) => enabledMaccs.has(m.id));
  const maccLine    = activeMaccs.length
    ? activeMaccs.map((m) => m.name).join(', ')
    : 'Aucun MACC sélectionné';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 110);
  doc.text(`MACCs : ${maccLine}`, ML, MT + 13, { maxWidth: usableW - 40 });

  // Date d'export
  const today = new Date();
  doc.text(
    `Exporté le ${today.toLocaleDateString('fr-BE')}`,
    W - MR, MT + 13,
    { align: 'right' },
  );
  doc.setTextColor(0, 0, 0);

  // ── En-têtes colonnes (lun.–dim.) ───────────────────────────────────────────
  const headerY = MT + TITLE_H;
  doc.setFillColor(240, 235, 248);
  doc.rect(ML, headerY, usableW, HEADER_H, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 60, 140);
  FR_DAYS_HEAD.forEach((label, i) => {
    doc.text(label, ML + i * colW + colW / 2, headerY + 4.8, { align: 'center' });
  });
  doc.setTextColor(0, 0, 0);

  // ── Grille des jours ────────────────────────────────────────────────────────
  cells.forEach((cell, idx) => {
    const col = idx % 7;
    const row = Math.floor(idx / 7);
    const x   = ML + col * colW;
    const y   = gridStartY + row * rowH;

    const isWeekend = cell.dow === 0 || cell.dow === 6;

    // Fond de cellule
    if (!cell.inMonth)    doc.setFillColor(248, 248, 250);
    else if (isWeekend)   doc.setFillColor(252, 248, 255);
    else                  doc.setFillColor(255, 255, 255);
    doc.rect(x, y, colW, rowH, 'F');

    // Bordure
    doc.setDrawColor(215, 215, 220);
    doc.setLineWidth(0.15);
    doc.rect(x, y, colW, rowH);

    // Numéro du jour
    const numX = x + 3;
    const numY = y + 4.5;

    if (cell.key === todayKey) {
      // Cercle plein pour aujourd'hui
      doc.setFillColor(156, 39, 176);
      doc.circle(numX + 1.5, numY - 1.2, 3, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text(String(cell.day), numX + 1.5, numY - 0.4, { align: 'center' });
      doc.setTextColor(0, 0, 0);
    } else {
      doc.setFont('helvetica', cell.inMonth ? 'bold' : 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(cell.inMonth ? (isWeekend ? 100 : 30) : 180, cell.inMonth ? (isWeekend ? 100 : 30) : 180, cell.inMonth ? (isWeekend ? 100 : 30) : 180);
      doc.text(String(cell.day), numX, numY);
      doc.setTextColor(0, 0, 0);
    }

    if (!cell.inMonth) return;

    // Événements du jour (filtrés sur MACCs cochés)
    const dayEvts = (events[cell.key] ?? []).filter((e) => enabledMaccs.has(e.maccId));
    if (dayEvts.length === 0) return;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);

    const lineH       = 3.8;
    const evtStartY   = y + 7.5;
    const maxVisible  = Math.max(1, Math.floor((rowH - 8) / lineH));
    const shown       = dayEvts.slice(0, maxVisible);
    const more        = dayEvts.length - shown.length;

    shown.forEach((ev, k) => {
      const mac = macById[ev.maccId];
      const svc = services[ev.serviceId];
      if (!mac) return;

      const ey = evtStartY + k * lineH;

      // Pastille colorée
      const [r, g, b] = hexToRgb(mac.color);
      doc.setFillColor(r, g, b);
      doc.rect(x + 1.5, ey - 2.2, 1.5, 2.8, 'F');

      // Texte : initiales + code service + heure de début
      const initials  = mac.name.split(' ').filter(Boolean).map((w) => w[0]).join('').toUpperCase().slice(0, 2);
      const svcCode   = svc?.code ?? ev.serviceId.slice(0, 4);
      const raw       = `${initials} · ${svcCode}  ${ev.start}`;
      const textMaxW  = colW - 5.5;
      doc.setTextColor(40, 40, 40);
      doc.text(truncate(doc, raw, textMaxW), x + 4, ey);
    });

    if (more > 0) {
      const ey = evtStartY + shown.length * lineH;
      doc.setFontSize(5.2);
      doc.setTextColor(156, 39, 176);
      doc.text(`+ ${more} de plus`, x + 1.5, ey);
    }
  });

  // ── Sauvegarde ──────────────────────────────────────────────────────────────
  const mm = String(viewMonth.getMonth() + 1).padStart(2, '0');
  doc.save(`agenda-${viewMonth.getFullYear()}-${mm}.pdf`);
}
