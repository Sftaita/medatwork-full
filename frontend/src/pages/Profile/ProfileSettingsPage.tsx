import { useNavigate } from "react-router-dom";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Skeleton from "@mui/material/Skeleton";
import Alert from "@mui/material/Alert";
import Tooltip from "@mui/material/Tooltip";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import TranslateIcon from "@mui/icons-material/Translate";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import NotificationsIcon from "@mui/icons-material/Notifications";

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
      sx={{ bgcolor: "grey.50" }}
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

const ProfileSettingsPage = () => {
  const navigate                     = useNavigate();
  const { data: settings, isLoading, isError } = useUserSettings();
  const { mutate: update, isPending }           = useUpdateSettings();
  const { density, cycleDensity }              = useTableDensity();

  const current = settings ?? DEFAULT_SETTINGS;

  const patch = (p: UserSettingsPatch) => update(p);

  return (
    <Box p={3} maxWidth={760} mx="auto">
      {/* Header */}
      <Box display="flex" alignItems="center" gap={1.5} mb={4}>
        <Tooltip title="Retour au profil" arrow>
          <IconButton onClick={() => navigate("/profile")} size="small">
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Préférences
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Vos paramètres sont sauvegardés automatiquement et synchronisés entre vos appareils.
          </Typography>
        </Box>
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
                <InputLabel>Langue</InputLabel>
                <Select
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
                  <InputLabel>Vue</InputLabel>
                  <Select
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

        {/* ── Notifications ────────────────────────────────────────────────── */}
        <Section icon={<NotificationsIcon color="action" />} title="Notifications">
          {isLoading ? (
            <Stack spacing={1.5} py={1}>
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
              ))}
            </Stack>
          ) : (
            <>
              {(
                [
                  {
                    key: "email",
                    label: "Notifications par email",
                    description: "Validations, alertes de conformité",
                  },
                  {
                    key: "push",
                    label: "Notifications push",
                    description: "Alertes en temps réel dans l'application",
                  },
                  {
                    key: "compliance",
                    label: "Alertes de conformité",
                    description: "Dépassements des limites légales temps de travail",
                  },
                  {
                    key: "dailySummary",
                    label: "Résumé quotidien",
                    description: "Récapitulatif des activités de la journée",
                  },
                ] as const
              ).map((item, idx) => (
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
