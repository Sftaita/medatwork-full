/**
 * Tests — Residents.tsx (onglet MACCS)
 *
 * Couverture :
 *   — Bouton "Ajouter un MACCS" visible uniquement si adminRights=true
 *   — Clic sur le bouton ouvre le dialog d'ajout
 *   — Dialog contient les champs prénom, nom, email + bouton "Ajouter"
 *   — Bouton "Ajouter" du dialog est désactivé tant que les champs sont incomplets
 *   — Bouton "Ajouter" est activé quand les 3 champs sont valides
 *   — Annuler ferme le dialog
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { lightTheme } from '../../../../doc/CustomizedTheme';
import Residents from './Residents';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const { mockGet, mockPost, stableAxios } = vi.hoisted(() => {
  const mockGet  = vi.fn().mockResolvedValue({ data: { residents: [] } });
  const mockPost = vi.fn().mockResolvedValue({ data: {} });
  // Objet stable — évite que useCallback([axiosPrivate]) se réinitialise à chaque render
  const stableAxios = { get: mockGet, post: mockPost };
  return { mockGet, mockPost, stableAxios };
});

vi.mock('../../../../hooks/useAxiosPrivate', () => ({
  default: () => stableAxios,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback: string) => fallback ?? _key,
    i18n: { language: 'fr' },
  }),
}));

vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('../../../../services/residentsApi', () => ({
  default: {
    fetchResidents: () => ({ method: 'get', url: 'managers/GetYearResidents/' }),
  },
}));

vi.mock('../../../../services/yearsApi', () => ({
  default: {
    UpdateYearResidentRelation: () => ({ method: 'post', url: 'managers/residentValidation' }),
    deleteYearResidentRelation: () => ({ method: 'delete', url: 'managers/residentValidation/' }),
    updateYearResident: () => ({ method: 'put', url: 'managers/updateYearResidents/' }),
    addResidentToYear: (id: number) => ({ method: 'post', url: `managers/years/${id}/add-resident` }),
  },
}));

vi.mock('../../../../doc/ToastParams', () => ({
  toastSuccess: {},
  toastError:   {},
}));

vi.mock('@/services/apiError', () => ({
  handleApiError: vi.fn(),
}));

vi.mock('../../../../components/small/UserAvatar', () => ({
  default: () => null,
}));

vi.mock('../../../../components/medium/DateHandler', () => ({
  default: () => null,
}));

// ── Helper ────────────────────────────────────────────────────────────────────

function renderResidents(props: { yearId: number; adminRights?: boolean }) {
  return render(
    <ThemeProvider theme={lightTheme}>
      <Residents {...props} />
    </ThemeProvider>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Residents — bouton Ajouter', () => {
  beforeEach(() => {
    (mockGet as Mock).mockResolvedValue({ data: { residents: [] } });
    (mockPost as Mock).mockResolvedValue({ data: {} });
  });

  it('bouton Ajouter absent si adminRights=false', async () => {
    renderResidents({ yearId: 1, adminRights: false });
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(screen.queryByTestId('add-maccs-btn')).toBeNull();
  });

  it('bouton Ajouter présent si adminRights=true', async () => {
    renderResidents({ yearId: 1, adminRights: true });
    await waitFor(() => screen.getByTestId('add-maccs-btn'));
    expect(screen.getByTestId('add-maccs-btn')).toBeInTheDocument();
  });

  it('clic sur Ajouter ouvre le dialog', async () => {
    renderResidents({ yearId: 1, adminRights: true });
    await waitFor(() => screen.getByTestId('add-maccs-btn'));

    fireEvent.click(screen.getByTestId('add-maccs-btn'));

    await waitFor(() => screen.getByTestId('add-maccs-firstname'));
    expect(screen.getByTestId('add-maccs-lastname')).toBeInTheDocument();
    expect(screen.getByTestId('add-maccs-email')).toBeInTheDocument();
  });

  it('bouton Ajouter du dialog désactivé si champs vides', async () => {
    renderResidents({ yearId: 1, adminRights: true });
    await waitFor(() => screen.getByTestId('add-maccs-btn'));
    fireEvent.click(screen.getByTestId('add-maccs-btn'));

    await waitFor(() => screen.getByTestId('add-maccs-submit'));
    expect(screen.getByTestId('add-maccs-submit')).toBeDisabled();
  });

  it('bouton Ajouter activé quand les 3 champs sont valides', async () => {
    renderResidents({ yearId: 1, adminRights: true });
    await waitFor(() => screen.getByTestId('add-maccs-btn'));
    fireEvent.click(screen.getByTestId('add-maccs-btn'));

    await waitFor(() => screen.getByTestId('add-maccs-firstname'));
    fireEvent.change(screen.getByTestId('add-maccs-firstname'), { target: { value: 'Marie' } });
    fireEvent.change(screen.getByTestId('add-maccs-lastname'),  { target: { value: 'Dupont' } });
    fireEvent.change(screen.getByTestId('add-maccs-email'),     { target: { value: 'marie@example.com' } });

    expect(screen.getByTestId('add-maccs-submit')).not.toBeDisabled();
  });

  it('Annuler ferme le dialog', async () => {
    renderResidents({ yearId: 1, adminRights: true });
    await waitFor(() => screen.getByTestId('add-maccs-btn'));
    fireEvent.click(screen.getByTestId('add-maccs-btn'));

    await waitFor(() => screen.getByTestId('add-maccs-firstname'));
    fireEvent.click(screen.getByText('Annuler'));
    await waitFor(() => expect(screen.queryByTestId('add-maccs-firstname')).toBeNull());
  });
});

// ── Tests statut d'affichage ──────────────────────────────────────────────────

const BASE_RESIDENT = {
  residentId: 1, yearResidentId: 10,
  firstname: 'Alice', lastname: 'Martin', email: 'alice@test.com',
  allowed: true, accountActivated: true,
  legalLeaves: 0, scientificLeaves: 0, maternityLeaves: 0,
  paternityLeaves: 0, unpaidLeavesLeaves: 0,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeResident(overrides: Partial<typeof BASE_RESIDENT>) {
  return { ...BASE_RESIDENT, ...overrides };
}

async function renderWithResidents(list: (typeof BASE_RESIDENT)[]) {
  (mockGet as Mock).mockResolvedValue({ data: { residents: list } });
  await act(async () => {
    renderResidents({ yearId: 1 });
  });
  // Attendre que le spinner disparaisse = données chargées et DOM stabilisé
  await waitFor(() => expect(screen.queryByRole('progressbar')).toBeNull());
}

// ── Badges de statut ──────────────────────────────────────────────────────────

describe('Residents — badges de statut', () => {
  it('resident-status-active : allowed=true, accountActivated=true → texte "Actif"', async () => {
    await renderWithResidents([makeResident({ allowed: true, accountActivated: true })]);
    const badge = await screen.findByTestId('resident-status-active');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Actif');
  });

  it('resident-status-invited : allowed=true, accountActivated=false → texte "Invitation envoyée"', async () => {
    await renderWithResidents([makeResident({ allowed: true, accountActivated: false })]);
    const badge = await screen.findByTestId('resident-status-invited');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Invitation envoyée');
    expect(screen.queryByTestId('resident-status-active')).toBeNull();
  });

  it('resident-status-blocked : allowed=false → texte "Bloqué" (pas "En attente")', async () => {
    await renderWithResidents([makeResident({ allowed: false, accountActivated: false })]);
    const badge = await screen.findByTestId('resident-status-blocked');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Bloqué');
    // Vérifier que l'ancien label n'apparaît plus
    expect(screen.queryByText('En attente')).toBeNull();
    // Vérifier que les autres testids n'existent pas
    expect(screen.queryByTestId('resident-status-pending')).toBeNull();
    expect(screen.queryByTestId('resident-status-active')).toBeNull();
  });

  it('"Validé" n\'apparaît jamais dans la liste (aucune notion de validation workflow)', async () => {
    await renderWithResidents([
      makeResident({ residentId: 1, allowed: true,  accountActivated: true  }),
      makeResident({ residentId: 2, allowed: true,  accountActivated: false }),
      makeResident({ residentId: 3, allowed: false, accountActivated: false }),
    ]);
    await screen.findByTestId('resident-status-active');
    expect(screen.queryByText('Validé')).toBeNull();
    expect(screen.queryByText('Validés')).toBeNull();
  });

  it('"En attente" n\'apparaît plus jamais dans aucun badge', async () => {
    await renderWithResidents([
      makeResident({ residentId: 1, allowed: true,  accountActivated: true  }),
      makeResident({ residentId: 2, allowed: true,  accountActivated: false }),
      makeResident({ residentId: 3, allowed: false, accountActivated: false }),
    ]);
    await screen.findByTestId('resident-status-active');
    // "En attente" ne doit jamais apparaître dans les badges
    expect(screen.queryByText('En attente')).toBeNull();
  });
});

// ── Filtres — présence et compteurs ──────────────────────────────────────────

describe('Residents — filtres (labels, compteurs, comportement)', () => {
  const THREE_RESIDENTS = [
    makeResident({ residentId: 1, allowed: true,  accountActivated: true  }),  // Actif
    makeResident({ residentId: 2, allowed: true,  accountActivated: false }),  // Invitation envoyée
    makeResident({ residentId: 3, allowed: false, accountActivated: false }),  // Bloqué
  ];

  it('4 chips de filtre présents : Tous, Actifs, Invitation envoyée, Bloqués', async () => {
    await renderWithResidents(THREE_RESIDENTS);
    await screen.findByTestId('resident-status-active');
    expect(screen.getByRole('radio', { name: /^Tous/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^Actifs/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^Invitation envoyée/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^Bloqués/ })).toBeInTheDocument();
    // Vérifier que "Validés" et "En attente" n'existent plus
    expect(screen.queryByRole('radio', { name: /^Validés/ })).toBeNull();
    expect(screen.queryByRole('radio', { name: /^En attente/ })).toBeNull();
  });

  it('compteur "Tous" = 3', async () => {
    await renderWithResidents(THREE_RESIDENTS);
    await screen.findByTestId('resident-status-active');
    expect(screen.getByRole('radio', { name: /^Tous/ })).toHaveTextContent('3');
  });

  it('compteur "Actifs" = 1 (allowed=true && accountActivated=true)', async () => {
    await renderWithResidents(THREE_RESIDENTS);
    await screen.findByTestId('resident-status-active');
    expect(screen.getByRole('radio', { name: /^Actifs/ })).toHaveTextContent('1');
  });

  it('compteur "Invitation envoyée" = 1 (allowed=true && accountActivated=false)', async () => {
    await renderWithResidents(THREE_RESIDENTS);
    await screen.findByTestId('resident-status-active');
    expect(screen.getByRole('radio', { name: /^Invitation envoyée/ })).toHaveTextContent('1');
  });

  it('compteur "Bloqués" = 1 (!allowed uniquement)', async () => {
    await renderWithResidents(THREE_RESIDENTS);
    await screen.findByTestId('resident-status-active');
    expect(screen.getByRole('radio', { name: /^Bloqués/ })).toHaveTextContent('1');
  });

  it('filtre "Tous" actif par défaut (aria-checked=true)', async () => {
    await renderWithResidents(THREE_RESIDENTS);
    await screen.findByTestId('resident-status-active');
    expect(screen.getByRole('radio', { name: /^Tous/ })).toHaveAttribute('aria-checked', 'true');
  });

  it('filtre "Actifs" → affiche seulement le résident actif (residentId=1)', async () => {
    await renderWithResidents(THREE_RESIDENTS);
    await screen.findByTestId('resident-status-active');
    fireEvent.click(screen.getByRole('radio', { name: /^Actifs/ }));
    // residentId=1 visible
    await waitFor(() => screen.getByTestId('resident-row-1'));
    // residentId=2 et 3 absents
    expect(screen.queryByTestId('resident-row-2')).toBeNull();
    expect(screen.queryByTestId('resident-row-3')).toBeNull();
  });

  it('filtre "Invitation envoyée" → affiche seulement residentId=2', async () => {
    await renderWithResidents(THREE_RESIDENTS);
    await screen.findByTestId('resident-status-active');
    fireEvent.click(screen.getByRole('radio', { name: /^Invitation envoyée/ }));
    await waitFor(() => screen.getByTestId('resident-row-2'));
    expect(screen.queryByTestId('resident-row-1')).toBeNull();
    expect(screen.queryByTestId('resident-row-3')).toBeNull();
  });

  it('filtre "Bloqués" → affiche seulement residentId=3 (!allowed)', async () => {
    await renderWithResidents(THREE_RESIDENTS);
    await screen.findByTestId('resident-status-active');
    fireEvent.click(screen.getByRole('radio', { name: /^Bloqués/ }));
    await waitFor(() => screen.getByTestId('resident-row-3'));
    expect(screen.queryByTestId('resident-row-1')).toBeNull();
    expect(screen.queryByTestId('resident-row-2')).toBeNull();
  });

  it('filtre "Bloqués" n\'affiche PAS les "Invitation envoyée" (mutuellement exclusifs)', async () => {
    const manyResidents = [
      makeResident({ residentId: 1, allowed: false, accountActivated: false }),  // Bloqué
      makeResident({ residentId: 2, allowed: false, accountActivated: false }),  // Bloqué
      makeResident({ residentId: 3, allowed: true,  accountActivated: false }),  // Invitation envoyée
    ];
    await renderWithResidents(manyResidents);
    // 2 résidents bloqués — findAllByTestId (pluriel) évite l'erreur "multiple elements"
    const blockedBadges = await screen.findAllByTestId('resident-status-blocked');
    expect(blockedBadges).toHaveLength(2);

    fireEvent.click(screen.getByRole('radio', { name: /^Bloqués/ }));
    await waitFor(() => screen.getByTestId('resident-row-1'));
    expect(screen.getByTestId('resident-row-2')).toBeInTheDocument();
    // residentId=3 (Invitation envoyée) ne doit PAS apparaître sous "Bloqués"
    expect(screen.queryByTestId('resident-row-3')).toBeNull();
  });

  it('cliquer "Tous" après un filtre réaffiche tous les résidents', async () => {
    await renderWithResidents(THREE_RESIDENTS);
    await screen.findByTestId('resident-status-active');
    fireEvent.click(screen.getByRole('radio', { name: /^Actifs/ }));
    fireEvent.click(screen.getByRole('radio', { name: /^Tous/ }));
    await waitFor(() => {
      expect(screen.getByTestId('resident-row-1')).toBeInTheDocument();
      expect(screen.getByTestId('resident-row-2')).toBeInTheDocument();
      expect(screen.getByTestId('resident-row-3')).toBeInTheDocument();
    });
  });
});

// ── Recherche (non-régression) ────────────────────────────────────────────────

describe('Residents — recherche', () => {
  it('filtre par prénom (insensible à la casse)', async () => {
    await renderWithResidents([
      makeResident({ residentId: 1, firstname: 'Alice', lastname: 'Martin'  }),
      makeResident({ residentId: 2, firstname: 'Bob',   lastname: 'Dupont'  }),
    ]);
    await screen.findByTestId('resident-row-1');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'alice' } });
    await waitFor(() => expect(screen.queryByTestId('resident-row-2')).toBeNull());
    expect(screen.getByTestId('resident-row-1')).toBeInTheDocument();
  });

  it('état vide si aucun résultat', async () => {
    await renderWithResidents([makeResident({ residentId: 1 })]);
    await screen.findByTestId('resident-row-1');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'zzz_inexistant' } });
    await waitFor(() => expect(screen.queryByTestId('resident-row-1')).toBeNull());
    expect(screen.getByText(/Aucun MACCS ne correspond/i)).toBeInTheDocument();
  });
});

