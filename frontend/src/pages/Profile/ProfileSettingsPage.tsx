import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Skeleton from "@mui/material/Skeleton";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckIcon from "@mui/icons-material/Check";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import TranslateIcon from "@mui/icons-material/Translate";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import NotificationsIcon from "@mui/icons-material/Notifications";
import TableRowsIcon from "@mui/icons-material/TableRows";

import { useUserSettings, useUpdateSettings, DEFAULT_SETTINGS } from "../../hooks/useUserSettings";
import { useTableDensity } from "../../hooks/useTableDensity";
import { DensityToggleButton } from "../../components/DensityToggleButton";
import type { UserSettingsPatch } from "../../services/settingsApi";

// ── Section wrapper ───────────────────────────────────────────────────────────

const Section = ({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => (
  <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
    <Box
      display="flex"
      alignItems="center"
      gap={1.5}
      px={3}
      py={2}
      sx={{ bgcolor: "action.hover" }}
    >
      {icon}
      <Typography variant="subtitle1" fontWeight={700}>
        {title}
      </Typography>
    </Box>
    <Divider />
    <Box px={3} py={2}>
      {children}
    </Box>
  </Paper>
);

// ── Row dans une section ──────────────────────────────────────────────────────

const SettingRow = ({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <Box
    display="flex"
    justifyContent="space-between"
    alignItems="center"
    py={1.25}
    gap={2}
  >
    <Box flex={1} minWidth={0}>
      <Typography variant="body2" fontWeight={500}>
        {label}
      </Typography>
      {description && (
        <Typography variant="caption" color="text.secondary">
          {description}
        </Typography>
      )}
    </Box>
    <Box flexShrink={0}>{children}</Box>
  </Box>
);

// ── Page ──────────────────────────────────────────────────────────────────────

const CALENDAR_VIEWS = [
  { value: "month", label: "Mois" },
  { value: "week",  label: "Semaine" },
  { value: "day",   label: "Jour" },
  { value: "list",  label: "Liste" },
] as const;

const LANGUAGES = [
  { value: "fr", label: "Français" },
  { value: "nl", label: "Nederlands" },
  { value: "en", label: "English" },
] as const;

const PAGE_SIZES = [
  { value: 25,  label: "25 lignes" },
  { value: 50,  label: "50 lignes" },
  { value: 100, label: "100 lignes" },
  { value: 200, label: "200 lignes" },
] as const;

const NOTIFICATION_ROWS = [
  {
    key:         "email" as const,
    label:       "Notifications par email",
    description: "Validations, alertes de conformité",
  },
  {
    key:         "push" as const,
    label:       "Notifications push",
    description: "Alertes en temps réel dans l'application",
  },
  {
    key:         "compliance" as const,
    label:       "Alertes de conformité",
    description: "Dépassements des limites légales temps de travail",
  },
  {
    key:         "validation" as const,
    label:       "Validations de période",
    description: "Notifications lors de la validation ou du refus d'une période",
  },
  {
    key:         "planning" as const,
    label:       "Modifications de planning",
    description: "Changements d'affectation ou de garde",
  },
  {
    key:         "staffPlanner" as const,
    label:       "Exports Staff Planner",
    description: "Confirmation d'export et alertes de traitement",
  },
  {
    key:         "dailySummary" as const,
    label:       "Résumé quotidien",
    description: "Récapitulatif des activités de la journée",
  },
] as const;

const ProfileSettingsPage = () => {
  const navigate                     = useNavigate();
  const { data: settings, isLoading, isError } = useUserSettings();
  const { mutate: update, isPending, isSuccess } = useUpdateSettings();
  const { density, cycleDensity }                = useTableDensity();

  const current = settings ?? DEFAULT_SETTINGS;

  const patch = (p: UserSettingsPatch) => update(p);

  const [savedVisible, setSavedVisible] = useState(false);
  useEffect(() => {
    if (!isSuccess) return;
    setSavedVisible(true);
    const t = setTimeout(() => setSavedVisible(false), 2000);
    return () => clearTimeout(t);
  }, [isSuccess]);

  return (
    <Box p={3} maxWidth={760} mx="auto">
      {/* Header */}
      <Box display="flex" alignItems="center" gap={1.5} mb={4}>
        <Tooltip title="Retour au profil" arrow>
          <IconButton onClick={() => navigate("/profile")} size="small">
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Box flex={1}>
          <Typography variant="h5" fontWeight={700}>
            Préférences
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Vos paramètres sont sauvegardés automatiquement et synchronisés entre vos appareils.
          </Typography>
        </Box>
        {isPending && (
          <Chip size="small" label="Sauvegarde…" variant="outlined" sx={{ color: "text.secondary" }} />
        )}
        {savedVisible && !isPending && (
          <Chip
            size="small"
            icon={<CheckIcon fontSize="small" />}
            label="Sauvegardé"
            color="success"
            variant="outlined"
          />
        )}
      </Box>

      {isError && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Impossible de charger vos préférences — les valeurs par défaut sont affichées.
        </Alert>
      )}

      <Stack spacing={3}>
        {/* ── Apparence ───────────────────────────────────────────────────── */}
        <Section icon={<DarkModeIcon color="action" />} title="Apparence">
          {isLoading ? (
            <Stack spacing={1.5} py={1}>
              <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
              <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
            </Stack>
          ) : (
            <>
              <SettingRow
                label="Mode sombre"
                description="Appliqué immédiatement sur toute l'interface"
              >
                <Switch
                  checked={current.theme === "dark"}
                  disabled={isPending}
                  onChange={(e) => patch({ theme: e.target.checked ? "dark" : "light" })}
                  inputProps={{ "aria-label": "Activer le mode sombre" }}
                />
              </SettingRow>

              <Divider />

              <SettingRow
                label="Densité des tableaux"
                description="Persistée localement — s'applique sur tous les tableaux"
              >
                <DensityToggleButton density={density} onCycle={cycleDensity} />
              </SettingRow>
            </>
          )}
        </Section>

        {/* ── Langue ──────────────────────────────────────────────────────── */}
        <Section icon={<TranslateIcon color="action" />} title="Langue">
          {isLoading ? (
            <Skeleton variant="rectangular" height={48} sx={{ borderRadius: 1 }} />
          ) : (
            <SettingRow
              label="Langue de l'interface"
              description="Certains contenus médicaux restent en français"
            >
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel id="lang-label">Langue</InputLabel>
                <Select
                  labelId="lang-label"
                  label="Langue"
                  value={current.language}
                  disabled={isPending}
                  onChange={(e) => patch({ language: e.target.value as "fr" | "nl" | "en" })}
                >
                  {LANGUAGES.map((l) => (
                    <MenuItem key={l.value} value={l.value}>
                      {l.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </SettingRow>
          )}
        </Section>

        {/* ── Calendrier ──────────────────────────────────────────────────── */}
        <Section icon={<CalendarMonthIcon color="action" />} title="Calendrier">
          {isLoading ? (
            <Stack spacing={1.5} py={1}>
              <Skeleton variant="rectangular" height={48} sx={{ borderRadius: 1 }} />
              <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
            </Stack>
          ) : (
            <>
              <SettingRow label="Vue par défaut" description="Vue appliquée à l'ouverture du calendrier">
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel id="cal-view-label">Vue</InputLabel>
                  <Select
                    labelId="cal-view-label"
                    label="Vue"
                    value={current.calendar.defaultView}
                    disabled={isPending}
                    onChange={(e) =>
                      patch({ calendar: { defaultView: e.target.value as any } })
                    }
                  >
                    {CALENDAR_VIEWS.map((v) => (
                      <MenuItem key={v.value} value={v.value}>
                        {v.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </SettingRow>

              <Divider />

              <SettingRow label="Afficher les weekends">
                <Switch
                  checked={current.calendar.showWeekends}
                  disabled={isPending}
                  onChange={(e) =>
                    patch({ calendar: { showWeekends: e.target.checked } })
                  }
                  inputProps={{ "aria-label": "Afficher les weekends" }}
                />
              </SettingRow>
            </>
          )}
        </Section>

        {/* ── Tableaux ────────────────────────────────────────────────────── */}
        <Section icon={<TableRowsIcon color="action" />} title="Tableaux">
          {isLoading ? (
            <Stack spacing={1.5} py={1}>
              <Skeleton variant="rectangular" height={48} sx={{ borderRadius: 1 }} />
              <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
            </Stack>
          ) : (
            <>
              <SettingRow
                label="Densité des tableaux"
                description="Persistée localement — s'applique sur tous les tableaux"
              >
                <DensityToggleButton density={density} onCycle={cycleDensity} />
              </SettingRow>

              <Divider />

              <SettingRow
                label="Lignes par page — Staff Planner"
                description="Nombre de lignes affichées par page dans l'export Staff Planner"
              >
                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <InputLabel id="sp-pagesize-label">Lignes</InputLabel>
                  <Select
                    labelId="sp-pagesize-label"
                    label="Lignes"
                    value={current.tables.staffPlanner.pageSize}
                    disabled={isPending}
                    onChange={(e) =>
                      patch({ tables: { staffPlanner: { pageSize: e.target.value as any } } })
                    }
                  >
                    {PAGE_SIZES.map((p) => (
                      <MenuItem key={p.value} value={p.value}>
                        {p.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </SettingRow>
            </>
          )}
        </Section>

        {/* ── Notifications ────────────────────────────────────────────────── */}
        <Section icon={<NotificationsIcon color="action" />} title="Notifications">
          {isLoading ? (
            <Stack spacing={1.5} py={1}>
              {[...Array(7)].map((_, i) => (
                <Skeleton key={i} variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
              ))}
            </Stack>
          ) : (
            <>
              {NOTIFICATION_ROWS.map((item, idx) => (
                <Box key={item.key}>
                  {idx > 0 && <Divider />}
                  <SettingRow label={item.label} description={item.description}>
                    <Switch
                      checked={current.notifications[item.key]}
                      disabled={isPending}
                      onChange={(e) =>
                        patch({ notifications: { [item.key]: e.target.checked } })
                      }
                      inputProps={{ "aria-label": item.label }}
                    />
                  </SettingRow>
                </Box>
              ))}
            </>
          )}
        </Section>
      </Stack>
    </Box>
  );
};

export default ProfileSettingsPage;
