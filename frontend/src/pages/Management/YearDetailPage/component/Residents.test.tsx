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
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
