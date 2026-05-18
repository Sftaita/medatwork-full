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
import useAuth from "../../hooks/useAuth";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n/config";
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

const CALENDAR_VIEW_KEYS = [
  { value: "month", labelKey: "settings.calViewMonth" },
  { value: "week",  labelKey: "settings.calViewWeek" },
  { value: "day",   labelKey: "settings.calViewDay" },
  { value: "list",  labelKey: "settings.calViewList" },
] as const;

const LANGUAGE_OPTIONS = [
  { value: "fr", labelKey: "settings.langFr" },
  { value: "nl", labelKey: "settings.langNl" },
  { value: "en", labelKey: "settings.langEn" },
] as const;

const PAGE_SIZE_KEYS = [
  { value: 25,  labelKey: "settings.rows25" },
  { value: 50,  labelKey: "settings.rows50" },
  { value: 100, labelKey: "settings.rows100" },
  { value: 200, labelKey: "settings.rows200" },
] as const;

const NOTIFICATION_KEYS = [
  { key: "email"       as const, labelKey: "settings.notifEmail",        descKey: "settings.notifEmailDesc" },
  { key: "push"        as const, labelKey: "settings.notifPush",         descKey: "settings.notifPushDesc" },
  { key: "compliance"  as const, labelKey: "settings.notifCompliance",   descKey: "settings.notifComplianceDesc" },
  { key: "validation"  as const, labelKey: "settings.notifValidation",   descKey: "settings.notifValidationDesc" },
  { key: "planning"    as const, labelKey: "settings.notifPlanning",     descKey: "settings.notifPlanningDesc" },
  { key: "dailySummary"as const, labelKey: "settings.notifDailySummary", descKey: "settings.notifDailySummaryDesc" },
] as const;

const ProfileSettingsPage = () => {
  const navigate                     = useNavigate();
  const { data: settings, isLoading, isError } = useUserSettings();
  const { mutate: update, isPending, isSuccess } = useUpdateSettings();
  const { density, cycleDensity }                = useTableDensity();
  const { authentication }                       = useAuth();
  const { t }                                    = useTranslation();

  const isHospitalAdmin = authentication.role === "hospital_admin";

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
          <Typography variant="h5" fontWeight={700}>{t("settings.title")}</Typography>
          <Typography variant="body2" color="text.secondary">{t("settings.subtitle")}</Typography>
        </Box>
        {isPending && (
          <Chip size="small" label={t("settings.saving")} variant="outlined" sx={{ color: "text.secondary" }} />
        )}
        {savedVisible && !isPending && (
          <Chip
            size="small"
            icon={<CheckIcon fontSize="small" />}
            label={t("settings.saved")}
            color="success"
            variant="outlined"
          />
        )}
      </Box>

      {isError && (
        <Alert severity="warning" sx={{ mb: 3 }}>{t("settings.loadError")}</Alert>
      )}

      <Stack spacing={3}>
        {/* ── Apparence ───────────────────────────────────────────────────── */}
        <Section icon={<DarkModeIcon color="action" />} title={t("settings.appearance")}>
          {isLoading ? (
            <Stack spacing={1.5} py={1}><Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} /></Stack>
          ) : (
            <SettingRow label={t("settings.darkMode")} description={t("settings.darkModeDesc")}>
              <Switch
                checked={current.theme === "dark"}
                disabled={isPending}
                onChange={(e) => patch({ theme: e.target.checked ? "dark" : "light" })}
                inputProps={{ "aria-label": t("settings.darkMode") }}
              />
            </SettingRow>
          )}
        </Section>

        {/* ── Langue ──────────────────────────────────────────────────────── */}
        <Section icon={<TranslateIcon color="action" />} title={t("settings.language")}>
          {isLoading ? (
            <Skeleton variant="rectangular" height={48} sx={{ borderRadius: 1 }} />
          ) : (
            <SettingRow label={t("settings.languageLabel")} description={t("settings.languageDesc")}>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel id="lang-label">{t("settings.language")}</InputLabel>
                <Select
                  labelId="lang-label"
                  label={t("settings.language")}
                  value={current.language}
                  disabled={isPending}
                  onChange={(e) => {
                    const lang = e.target.value as "fr" | "nl" | "en";
                    patch({ language: lang });
                    i18n.changeLanguage(lang);
                    localStorage.setItem("medatwork_lang", lang);
                  }}
                >
                  {LANGUAGE_OPTIONS.map((l) => (
                    <MenuItem key={l.value} value={l.value}>{t(l.labelKey)}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </SettingRow>
          )}
        </Section>

        {/* ── Calendrier ──────────────────────────────────────────────────── */}
        <Section icon={<CalendarMonthIcon color="action" />} title={t("settings.calendar")}>
          {isLoading ? (
            <Stack spacing={1.5} py={1}><Skeleton variant="rectangular" height={48} sx={{ borderRadius: 1 }} /></Stack>
          ) : (
            <>
              <SettingRow label={t("settings.calendarView")} description={t("settings.calendarViewDesc")}>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel id="cal-view-label">{t("settings.calendarView")}</InputLabel>
                  <Select
                    labelId="cal-view-label"
                    label={t("settings.calendarView")}
                    value={current.calendar.defaultView}
                    disabled={isPending}
                    onChange={(e) => patch({ calendar: { defaultView: e.target.value as any } })}
                  >
                    {CALENDAR_VIEW_KEYS.map((v) => (
                      <MenuItem key={v.value} value={v.value}>{t(v.labelKey)}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </SettingRow>
              <Divider />
              <SettingRow label={t("settings.showWeekends")}>
                <Switch
                  checked={current.calendar.showWeekends}
                  disabled={isPending}
                  onChange={(e) => patch({ calendar: { showWeekends: e.target.checked } })}
                  inputProps={{ "aria-label": t("settings.showWeekends") }}
                />
              </SettingRow>
            </>
          )}
        </Section>

        {/* ── Tableaux ────────────────────────────────────────────────────── */}
        <Section icon={<TableRowsIcon color="action" />} title={t("settings.tables")}>
          {isLoading ? (
            <Stack spacing={1.5} py={1}><Skeleton variant="rectangular" height={48} sx={{ borderRadius: 1 }} /></Stack>
          ) : (
            <>
              <SettingRow label={t("settings.tableDensity")} description={t("settings.tableDensityDesc")}>
                <DensityToggleButton density={density} onCycle={cycleDensity} />
              </SettingRow>
              {isHospitalAdmin && (
                <>
                  <Divider />
                  <SettingRow label={t("settings.staffPlannerRows")} description={t("settings.staffPlannerDesc")}>
                    <FormControl size="small" sx={{ minWidth: 130 }}>
                      <InputLabel id="sp-pagesize-label">{t("settings.staffPlannerRows")}</InputLabel>
                      <Select
                        labelId="sp-pagesize-label"
                        label={t("settings.staffPlannerRows")}
                        value={current.tables.staffPlanner.pageSize}
                        disabled={isPending}
                        onChange={(e) => patch({ tables: { staffPlanner: { pageSize: e.target.value as any } } })}
                      >
                        {PAGE_SIZE_KEYS.map((p) => (
                          <MenuItem key={p.value} value={p.value}>{t(p.labelKey)}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </SettingRow>
                </>
              )}
            </>
          )}
        </Section>

        {/* ── Notifications ────────────────────────────────────────────────── */}
        <Section icon={<NotificationsIcon color="action" />} title={t("settings.notifications")}>
          {isLoading ? (
            <Stack spacing={1.5} py={1}>
              {[...Array(6)].map((_, i) => <Skeleton key={i} variant="rectangular" height={40} sx={{ borderRadius: 1 }} />)}
            </Stack>
          ) : (
            <>
              {NOTIFICATION_KEYS.map((item, idx) => (
                <Box key={item.key}>
                  {idx > 0 && <Divider />}
                  <SettingRow label={t(item.labelKey)} description={t(item.descKey)}>
                    <Switch
                      checked={current.notifications[item.key]}
                      disabled={isPending}
                      onChange={(e) => patch({ notifications: { [item.key]: e.target.checked } })}
                      inputProps={{ "aria-label": t(item.labelKey) }}
                    />
                  </SettingRow>
                </Box>
              ))}
              {isHospitalAdmin && (
                <Box>
                  <Divider />
                  <SettingRow label={t("settings.notifStaffPlanner")} description={t("settings.notifStaffPlannerDesc")}>
                    <Switch
                      checked={current.notifications.staffPlanner}
                      disabled={isPending}
                      onChange={(e) => patch({ notifications: { staffPlanner: e.target.checked } })}
                      inputProps={{ "aria-label": t("settings.notifStaffPlanner") }}
                    />
                  </SettingRow>
                </Box>
              )}
            </>
          )}
        </Section>
      </Stack>
    </Box>
  );
};

export default ProfileSettingsPage;
