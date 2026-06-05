import type { MaccsEntry } from './types';

// ── DEMO DATA ──────────────────────────────────────────────────────────────────
// Source : realtime-data.js (design handoff)
// Ce fichier est le SEUL endroit où les données de démo vivent.
// Quand l'endpoint GET managers/realtime/{yearId}/{month} sera prêt :
//   1. Remplacer l'usage de DEMO_MACCS / DEMO_WEEKS dans index.tsx par un hook useQuery
//   2. Supprimer ce fichier ou le garder comme fallback de chargement
// ──────────────────────────────────────────────────────────────────────────────

export const DEMO_WEEKS: string[] = ['S9', 'S10', 'S11', 'S12', 'S13', 'S14'];

export const DEMO_MACCS: MaccsEntry[] = [
  {
    name: 'Marie Dorenlot', last: 'Dorenlot', prevH: 242,
    totH: '182h50', totVal: 182.8, pct: 76,
    inconf: '70h50', inconfV: 70.8, tres: '16h', tresV: 16,
    app: 0, place: '0h',
    conge: {
      used: 5, total: 34,
      items: [
        { nm: 'Congé annuel', a: 11, b: 24 },
        { nm: 'Scientifique', a: 0, b: 10 },
        { nm: 'Paternité', a: 0, b: 0 },
        { nm: 'Maternité', a: 0, b: 0 },
        { nm: 'Non rémunéré', a: 0, b: 0 },
      ],
    },
    week: { prest: [44, 76, 40, 57, 55, 64], prev: [50, 52, 48, 55, 53, 50] },
  },
  {
    name: 'Francesca Manicone', last: 'Manicone', prevH: 264,
    totH: '264h45', totVal: 264.75, pct: 100,
    inconf: '43h30', inconfV: 43.5, tres: '24h', tresV: 24,
    app: 0, place: '0h',
    conge: {
      used: 0, total: 34,
      items: [
        { nm: 'Congé annuel', a: 17, b: 24 },
        { nm: 'Scientifique', a: 0, b: 10 },
        { nm: 'Paternité', a: 0, b: 0 },
        { nm: 'Maternité', a: 0, b: 0 },
        { nm: 'Non rémunéré', a: 0, b: 0 },
      ],
    },
    week: { prest: [48, 55, 90, 60, 62, 66], prev: [52, 54, 58, 60, 60, 56] },
  },
  {
    name: 'Sofia Manon', last: 'Manon', prevH: 210,
    totH: '198h20', totVal: 198.3, pct: 94,
    inconf: '28h', inconfV: 28, tres: '4h', tresV: 4,
    app: 1, place: '0h',
    conge: {
      used: 8, total: 34,
      items: [
        { nm: 'Congé annuel', a: 9, b: 24 },
        { nm: 'Scientifique', a: 2, b: 10 },
        { nm: 'Paternité', a: 0, b: 0 },
        { nm: 'Maternité', a: 0, b: 0 },
        { nm: 'Non rémunéré', a: 0, b: 0 },
      ],
    },
    week: { prest: [49, 80, 50, 54, 55, 48], prev: [50, 52, 52, 54, 54, 50] },
  },
  {
    name: 'Adrien Michel', last: 'Michel', prevH: 250,
    totH: '236h10', totVal: 236.2, pct: 95,
    inconf: '52h', inconfV: 52, tres: '30h', tresV: 30,
    app: 2, place: '6h',
    conge: {
      used: 3, total: 34,
      items: [
        { nm: 'Congé annuel', a: 6, b: 24 },
        { nm: 'Scientifique', a: 1, b: 10 },
        { nm: 'Paternité', a: 0, b: 0 },
        { nm: 'Maternité', a: 0, b: 0 },
        { nm: 'Non rémunéré', a: 0, b: 0 },
      ],
    },
    week: { prest: [92, 56, 78, 70, 66, 70], prev: [60, 58, 60, 60, 58, 58] },
  },
  {
    // Scénario B : horaire prévisionnel NON renseigné (cf. AJOUT-temps-reel.md)
    name: 'Vinh hao Truong', last: 'Truong', prevH: null,
    totH: '188h00', totVal: 188, pct: null,
    inconf: '34h', inconfV: 34, tres: '8h', tresV: 8,
    app: 0, place: '0h',
    conge: {
      used: 6, total: 34,
      items: [
        { nm: 'Congé annuel', a: 12, b: 24 },
        { nm: 'Scientifique', a: 0, b: 10 },
        { nm: 'Paternité', a: 0, b: 0 },
        { nm: 'Maternité', a: 0, b: 0 },
        { nm: 'Non rémunéré', a: 0, b: 0 },
      ],
    },
    week: { prest: [46, 53, 56, 58, 67, 60], prev: null },
  },
  {
    name: 'Yasmine Zerouali', last: 'Zerouali', prevH: 205,
    totH: '171h30', totVal: 171.5, pct: 84,
    inconf: '22h', inconfV: 22, tres: '2h', tresV: 2,
    app: 0, place: '0h',
    conge: {
      used: 9, total: 34,
      items: [
        { nm: 'Congé annuel', a: 14, b: 24 },
        { nm: 'Scientifique', a: 3, b: 10 },
        { nm: 'Paternité', a: 0, b: 0 },
        { nm: 'Maternité', a: 0, b: 0 },
        { nm: 'Non rémunéré', a: 0, b: 0 },
      ],
    },
    week: { prest: [44, 49, 38, 46, 54, 47], prev: [48, 50, 48, 50, 52, 48] },
  },
];
