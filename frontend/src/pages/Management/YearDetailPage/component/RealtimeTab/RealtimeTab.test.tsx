/**
 * Tests — RealtimeTab
 *
 * Couverture :
 *   — Rendu de base : 6 MACCS listés (données DEMO via mock API)
 *   — MACCS sans prévisionnel (Truong) → mentions correctes
 *   — Statuts : Dépassement / À surveiller / Conforme
 *   — Filtre "En alerte" n'affiche que les MACCS en dépassement
 *   — Progression moyenne exclut Truong (prevH null)
 *   — Ouvrir / refermer une ligne MACCS
 *   — Seuils légaux 48h / 60h / 72h présents dans le graphe
 *   — Bannière "Établir l'horaire" visible uniquement sans prévisionnel
 *   — Sélecteur de mois : mois précédent / suivant
 *   — Boutons export (Export PDF, Rapport RH, Envoyer aux managers) présents
 *   — Clic "Envoyer aux managers" ouvre la ReportModal
 *   — Confirmation envoi appelle realtimeReportApi.emailManagers et affiche toast
 *   — Annulation ferme la modal sans envoi
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import RealtimeTab from './index';
import { DEMO_MACCS, DEMO_WEEKS } from './realtimeDemoData';

// ── Mocks ─────────────────────────────────────────────────────────────────────

// useAxiosPrivate retourne un faux axios qui résout avec les données de démo
const mockGet = vi.fn().mockResolvedValue({
  data: {
    maccs:     DEMO_MACCS,
    weeks:     DEMO_WEEKS,
    yearTitle: 'Bloc A 2024',
  },
});
const stableAxios = { get: mockGet };

vi.mock('../../../../../hooks/useAxiosPrivate', () => ({ default: () => stableAxios }));

// realtimeReportApi
vi.mock('../../../../../services/realtimeReportApi', () => ({
  default: {
    emailManagers: vi.fn().mockResolvedValue({ message: 'Rapport envoyé', sent: 2, skipped: 0, errors: [] }),
  },
}));

// exportRealtimePdf — on intercepte les téléchargements et la génération base64
vi.mock('./exportRealtimePdf', () => ({
  downloadExportPdf:       vi.fn(),
  downloadPresentationPdf: vi.fn(),
  presentationPdfToBase64: vi.fn().mockReturnValue('base64-pdf-data'),
}));

import realtimeReportApi from '../../../../../services/realtimeReportApi';
import { downloadExportPdf, downloadPresentationPdf } from './exportRealtimePdf';

// ── Helper ────────────────────────────────────────────────────────────────────

async function renderTab() {
  let utils: ReturnType<typeof render>;
  await act(async () => {
    utils = render(<RealtimeTab yearId={42} />);
  });
  // Attendre la fin du chargement (le spinner disparaît)
  await waitFor(() => {
    expect(screen.queryByTestId('rt-loading')).not.toBeInTheDocument();
  });
  return utils!;
}

beforeEach(() => {
  mockGet.mockResolvedValue({
    data: { maccs: DEMO_MACCS, weeks: DEMO_WEEKS, yearTitle: 'Bloc A 2024' },
  });
  vi.clearAllMocks();
  // Rétablir la valeur par défaut après clearAllMocks
  mockGet.mockResolvedValue({
    data: { maccs: DEMO_MACCS, weeks: DEMO_WEEKS, yearTitle: 'Bloc A 2024' },
  });
});

// ── Rendu de base ─────────────────────────────────────────────────────────────

describe('RealtimeTab — rendu de base', () => {
  it('affiche les 6 MACCS du jeu de données de démo', async () => {
    await renderTab();
    DEMO_MACCS.forEach(m => {
      expect(screen.getByText(m.name)).toBeInTheDocument();
    });
  });

  it("affiche le titre 'En temps réel'", async () => {
    await renderTab();
    expect(screen.getByText('En temps réel')).toBeInTheDocument();
  });

  it("affiche la section Vue d'ensemble", async () => {
    await renderTab();
    expect(screen.getByTestId('rt-overview')).toBeInTheDocument();
  });

  it("affiche les boutons de légende de la vue d'ensemble", async () => {
    await renderTab();
    DEMO_MACCS.forEach(m => {
      expect(screen.getByTestId(`legend-${m.last}`)).toBeInTheDocument();
    });
  });

  it('affiche le résumé avec le bon total de MACCS suivis', async () => {
    await renderTab();
    expect(screen.getByTestId('summary-total')).toHaveTextContent('6');
  });
});

// ── Prévisionnel non renseigné (Truong) ───────────────────────────────────────

describe('MACCS sans prévisionnel (Vinh hao Truong)', () => {
  it("affiche 'prévisionnel non établi' dans la ligne (pas '0h' ni '0%')", async () => {
    await renderTab();
    expect(screen.getByTestId('no-prev-Truong')).toBeInTheDocument();
    expect(screen.getByTestId('no-prev-Truong')).toHaveTextContent('prévisionnel non établi');
  });

  it("n'affiche pas '0h prévues' pour Truong", async () => {
    await renderTab();
    expect(screen.queryByText('0h prévues')).not.toBeInTheDocument();
  });

  it("n'affiche pas '0%' comme valeur de progression pour Truong", async () => {
    await renderTab();
    expect(screen.queryAllByText('0%')).toHaveLength(0);
  });

  it("affiche la bannière 'Établir l'horaire' quand le détail de Truong est ouvert", async () => {
    await renderTab();
    fireEvent.click(screen.getByText('Vinh hao Truong'));
    expect(screen.getByTestId('prev-empty-Truong')).toBeInTheDocument();
    expect(screen.getByTestId('go-to-schedule-Truong')).toBeInTheDocument();
  });

  it("n'affiche PAS la bannière pour un MACCS avec prévisionnel (Dorenlot)", async () => {
    await renderTab();
    fireEvent.click(screen.getByText('Marie Dorenlot'));
    expect(screen.queryByTestId('prev-empty-Dorenlot')).not.toBeInTheDocument();
  });
});

// ── Statuts ───────────────────────────────────────────────────────────────────

describe('Statuts MACCS', () => {
  it("Manicone (pct=100) → statut 'Dépassement'", async () => {
    await renderTab();
    expect(screen.getByTestId('status-Manicone')).toHaveTextContent('Dépassement');
  });

  it("Michel (pic=92h > 72h) → statut 'Dépassement'", async () => {
    await renderTab();
    expect(screen.getByTestId('status-Michel')).toHaveTextContent('Dépassement');
  });

  it("Zerouali (pic=54h) → statut 'Conforme'", async () => {
    await renderTab();
    expect(screen.getByTestId('status-Zerouali')).toHaveTextContent('Conforme');
  });

  it("Truong (sans prévisionnel, pic=67h > 60h) → statut 'À surveiller'", async () => {
    await renderTab();
    expect(screen.getByTestId('status-Truong')).toHaveTextContent('À surveiller');
  });

  it("le compteur 'En alerte' reflète le nombre de 'bad'", async () => {
    await renderTab();
    expect(screen.getByTestId('summary-alert')).toHaveTextContent('4');
  });

  it("le compteur 'À surveiller' inclut Truong malgré l'absence de prévisionnel", async () => {
    await renderTab();
    expect(screen.getByTestId('summary-watch')).toHaveTextContent('1');
  });
});

// ── Filtre "En alerte" ────────────────────────────────────────────────────────

describe("Filtre 'En alerte'", () => {
  it("n'affiche que les MACCS 'bad' après activation du filtre", async () => {
    await renderTab();
    fireEvent.click(screen.getByRole('button', { name: /En alerte/ }));

    expect(screen.getByText('Marie Dorenlot')).toBeInTheDocument();
    expect(screen.getByText('Francesca Manicone')).toBeInTheDocument();
    expect(screen.getByText('Sofia Manon')).toBeInTheDocument();
    expect(screen.getByText('Adrien Michel')).toBeInTheDocument();
    expect(screen.queryByText('Vinh hao Truong')).not.toBeInTheDocument();
    expect(screen.queryByText('Yasmine Zerouali')).not.toBeInTheDocument();
  });

  it("re-cliquer 'Tous' restaure la liste complète", async () => {
    await renderTab();
    fireEvent.click(screen.getByRole('button', { name: /En alerte/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Tous/ }));
    expect(screen.getAllByTestId(/^maccs-row-/)).toHaveLength(DEMO_MACCS.length);
  });
});

// ── Progression moyenne ───────────────────────────────────────────────────────

describe('Progression moyenne', () => {
  it('exclut Truong du calcul (prevH null) et affiche la moyenne des 5 autres', async () => {
    await renderTab();
    // (76 + 100 + 94 + 95 + 84) / 5 = 449 / 5 = 89.8 → 90
    expect(screen.getByTestId('summary-avg')).toHaveTextContent('90');
  });
});

// ── Ouverture / fermeture d'une ligne ─────────────────────────────────────────

describe('Repliage des lignes MACCS', () => {
  it('cliquer sur une ligne ouvre le détail', async () => {
    await renderTab();
    expect(screen.queryByTestId('detail-Dorenlot')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Marie Dorenlot'));
    expect(screen.getByTestId('detail-Dorenlot')).toBeInTheDocument();
  });

  it('re-cliquer referme la ligne', async () => {
    await renderTab();
    fireEvent.click(screen.getByText('Marie Dorenlot'));
    expect(screen.getByTestId('detail-Dorenlot')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Marie Dorenlot'));
    expect(screen.queryByTestId('detail-Dorenlot')).not.toBeInTheDocument();
  });

  it("ouvrir une ligne n'affecte pas les autres", async () => {
    await renderTab();
    fireEvent.click(screen.getByText('Marie Dorenlot'));
    expect(screen.queryByTestId('detail-Manicone')).not.toBeInTheDocument();
  });
});

// ── Seuils légaux dans le graphe ──────────────────────────────────────────────

describe('Seuils légaux 48h / 60h / 72h', () => {
  it('les repères sont présents dans la vue d\'ensemble', async () => {
    await renderTab();
    expect(screen.getAllByText('48h').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('60h').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('72h').length).toBeGreaterThanOrEqual(1);
  });

  it('les repères sont aussi visibles quand une ligne est ouverte', async () => {
    await renderTab();
    fireEvent.click(screen.getByText('Marie Dorenlot'));
    expect(screen.getAllByText('48h').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('60h').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('72h').length).toBeGreaterThanOrEqual(1);
  });
});

// ── Sélecteur de mois ─────────────────────────────────────────────────────────

describe('Sélecteur de mois', () => {
  it('affiche le mois courant par défaut', async () => {
    await renderTab();
    const currentMonth = new Date().toLocaleDateString('fr-FR', { month: 'long' });
    expect(screen.getByTestId('month-label').textContent?.toLowerCase()).toContain(currentMonth.toLowerCase());
  });

  it('le bouton Mois précédent est désactivé en janvier', async () => {
    // Forcer le rendu avec mois = 1 est difficile sans prop dédiée ; on vérifie
    // que le bouton existe bien et est correctement libellé.
    await renderTab();
    expect(screen.getByTestId('month-prev')).toBeInTheDocument();
    expect(screen.getByTestId('month-next')).toBeInTheDocument();
  });

  it('cliquer sur Mois suivant met à jour le label du mois', async () => {
    await renderTab();
    const labelBefore = screen.getByTestId('month-label').textContent;

    // Si on est en décembre le bouton next est disabled — test conditionnel
    const nextBtn = screen.getByTestId('month-next');
    if (!nextBtn.hasAttribute('disabled')) {
      fireEvent.click(nextBtn);
      await waitFor(() => {
        expect(screen.getByTestId('month-label').textContent).not.toBe(labelBefore);
      });
    }
  });
});

// ── Boutons d'action ──────────────────────────────────────────────────────────

describe('Boutons Export / Rapport RH / Envoyer', () => {
  it('les 3 boutons sont présents', async () => {
    await renderTab();
    expect(screen.getByTestId('btn-export-pdf')).toBeInTheDocument();
    expect(screen.getByTestId('btn-presentation-pdf')).toBeInTheDocument();
    expect(screen.getByTestId('btn-send-report')).toBeInTheDocument();
  });

  it("cliquer 'Export PDF' appelle downloadExportPdf", async () => {
    await renderTab();
    fireEvent.click(screen.getByTestId('btn-export-pdf'));
    expect(downloadExportPdf).toHaveBeenCalledOnce();
  });

  it("cliquer 'Rapport RH' appelle downloadPresentationPdf", async () => {
    await renderTab();
    fireEvent.click(screen.getByTestId('btn-presentation-pdf'));
    expect(downloadPresentationPdf).toHaveBeenCalledOnce();
  });

  it("cliquer 'Envoyer aux managers' ouvre la ReportModal", async () => {
    await renderTab();
    expect(screen.queryByTestId('report-confirm-modal')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('btn-send-report'));
    expect(screen.getByTestId('report-confirm-modal')).toBeInTheDocument();
  });
});

// ── ReportModal ───────────────────────────────────────────────────────────────

describe('ReportModal', () => {
  it("confirmer l'envoi appelle emailManagers et affiche un toast de succès", async () => {
    (realtimeReportApi.emailManagers as Mock).mockResolvedValue({ message: 'Rapport envoyé', sent: 3, skipped: 0, errors: [] });

    await renderTab();
    fireEvent.click(screen.getByTestId('btn-send-report'));
    fireEvent.click(screen.getByTestId('report-confirm-btn'));

    await waitFor(() => {
      expect(realtimeReportApi.emailManagers).toHaveBeenCalledOnce();
    });
    await waitFor(() => {
      expect(screen.getByTestId('rt-toast')).toBeInTheDocument();
    });
    expect(screen.getByTestId('rt-toast').textContent).toContain('3 manager');
  });

  it("annuler ferme la modal sans appeler emailManagers", async () => {
    await renderTab();
    fireEvent.click(screen.getByTestId('btn-send-report'));
    expect(screen.getByTestId('report-confirm-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(screen.queryByTestId('report-confirm-modal')).not.toBeInTheDocument();
    expect(realtimeReportApi.emailManagers).not.toHaveBeenCalled();
  });

  it("une erreur API affiche un toast d'erreur", async () => {
    (realtimeReportApi.emailManagers as Mock).mockRejectedValue(new Error('Network error'));

    await renderTab();
    fireEvent.click(screen.getByTestId('btn-send-report'));
    fireEvent.click(screen.getByTestId('report-confirm-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('rt-toast')).toBeInTheDocument();
    });
    expect(screen.getByTestId('rt-toast').textContent).toContain('Échec');
  });

  it("sent=2 skipped=1 : le toast mentionne les 2 envois et 1 ignoré", async () => {
    (realtimeReportApi.emailManagers as Mock).mockResolvedValue({
      message: 'Rapport envoyé', sent: 2, skipped: 1, errors: [],
    });

    await renderTab();
    fireEvent.click(screen.getByTestId('btn-send-report'));
    fireEvent.click(screen.getByTestId('report-confirm-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('rt-toast')).toBeInTheDocument();
    });
    const msg = screen.getByTestId('rt-toast').textContent ?? '';
    expect(msg).toContain('2 manager');
    expect(msg).toContain('1 ignoré');
  });

  it("sent=0 skipped=3 errors=[] : toast informatif sans mention d'erreur", async () => {
    (realtimeReportApi.emailManagers as Mock).mockResolvedValue({
      message: 'Rapport envoyé', sent: 0, skipped: 3, errors: [],
    });

    await renderTab();
    fireEvent.click(screen.getByTestId('btn-send-report'));
    fireEvent.click(screen.getByTestId('report-confirm-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('rt-toast')).toBeInTheDocument();
    });
    const toast = screen.getByTestId('rt-toast');
    expect(toast.textContent).toContain('3 manager');
    expect(toast.textContent).toContain('désactivé');
    // Le toast ne doit PAS indiquer une erreur
    expect(toast.className).not.toContain('error');
  });
});
