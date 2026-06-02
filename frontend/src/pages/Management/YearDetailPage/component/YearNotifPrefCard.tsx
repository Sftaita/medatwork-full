import React, { useState, useCallback } from "react";
import { useTheme, alpha } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Checkbox from "@mui/material/Checkbox";
import Tooltip from "@mui/material/Tooltip";
import CircularProgress from "@mui/material/CircularProgress";
import { LoadingButton } from "@mui/lab";
import { toast } from "react-toastify";
import { toastSuccess, toastError } from "../../../../doc/ToastParams";
import { useYearNotifPrefs, type PatchBody, type EventPrefs } from "../../../../hooks/useYearNotifPrefs";
import { useUserSettings } from "../../../../hooks/useUserSettings";

// ── Constantes ────────────────────────────────────────────────────────────────

const KNOWN_EVENTS = [
  "COMPLIANCE_ALERT",
  "MONTH_VALIDATION",
  "STAFFPLANNER_EXPORT_DONE",
  "RESIDENT_INACTIVE",
  "YEAR_ENDING",
  "SCHEDULE_CHANGED",
  "VALIDATION_REJECTED",
] as const;

const EVENT_LABELS: Record<string, string> = {
  COMPLIANCE_ALERT:         "Alertes de conformité",
  MONTH_VALIDATION:         "Validation mensuelle",
  STAFFPLANNER_EXPORT_DONE: "Export StaffPlanner terminé",
  RESIDENT_INACTIVE:        "MACCS inactif",
  YEAR_ENDING:              "Fin d'année imminente",
  SCHEDULE_CHANGED:         "Changement de planning",
  VALIDATION_REJECTED:      "Validation rejetée",
};

const CHANNELS = ["email", "push", "sms", "callRh"] as const;
type Channel = typeof CHANNELS[number];

const CHANNEL_LABELS: Record<Channel, string> = {
  email:  "Email",
  push:   "Push",
  sms:    "SMS",
  callRh: "Appel RH",
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  yearId: number | null;
}

// ── Composant ─────────────────────────────────────────────────────────────────

export default function YearNotifPrefCard({ yearId }: Props) {
  const theme = useTheme();
  const { prefs, loading, error, patch } = useYearNotifPrefs(yearId);
  const { current: globalSettings }      = useUserSettings();

  // Modifications locales non encore sauvegardées
  const [localChanges, setLocalChanges] = useState<PatchBody>({});
  const [dirty,        setDirty]        = useState(false);
  const [saving,       setSaving]       = useState(false);

  // Pas de rendu si pas d'année ou erreur d'accès
  if (yearId === null) {
    return null;
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (error === "ACCESS_DENIED") {
    return (
      <Box sx={{ p: 3, color: "text.secondary" }}>
        Vous n&apos;avez pas accès à ces paramètres.
      </Box>
    );
  }

  if (!prefs) return null;

  // ── Valeur effective : merge prefs serveur + changes locaux ───────────────

  const effectivePrefs = (event: string, channel: Channel): boolean => {
    const localEventPatch = localChanges[event];
    if (localEventPatch && channel in localEventPatch) {
      return !!(localEventPatch as Record<string, boolean>)[channel];
    }
    return !!(prefs[event]?.[channel as keyof EventPrefs]);
  };

  const isGloballyDisabled = (channel: Channel): boolean => {
    return !(globalSettings?.notifications?.[channel] ?? true);
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleToggle = useCallback((event: string, channel: Channel) => {
    if (isGloballyDisabled(channel)) return;

    const current = effectivePrefs(event, channel);
    setLocalChanges(prev => ({
      ...prev,
      [event]: {
        ...(prev[event] ?? {}),
        [channel]: !current,
      },
    }));
    setDirty(true);
  }, [localChanges, prefs, globalSettings]); // eslint-disable-line

  const handleSave = useCallback(async () => {
    if (!dirty || Object.keys(localChanges).length === 0) return;

    setSaving(true);
    try {
      const err = await patch(localChanges);
      if (err) {
        toast.error("Erreur lors de l'enregistrement.", toastError);
      } else {
        setLocalChanges({});
        setDirty(false);
        toast.success("Préférences enregistrées.", toastSuccess);
      }
    } catch {
      toast.error("Erreur lors de l'enregistrement.", toastError);
    } finally {
      setSaving(false);
    }
  }, [dirty, localChanges, patch]);

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <Box
      sx={{
        bgcolor:      "background.paper",
        border:       `1px solid ${theme.palette.divider}`,
        borderRadius: "18px",
        p:            { xs: "20px", sm: "24px 26px" },
      }}
    >
      {/* En-tête */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2.5}>
        <Box>
          <Typography sx={{ fontFamily: "'Poppins', sans-serif", fontSize: 19, fontWeight: 600 }}>
            Mes notifications pour cette année
          </Typography>
          <Typography sx={{ fontSize: 13, color: "text.secondary", mt: "5px" }}>
            Personnalisez ce que vous recevez. Soumis à vos{" "}
            <Box component="a" href="/profile/settings" sx={{ color: "primary.main", fontWeight: 600 }}>
              préférences globales
            </Box>.
          </Typography>
        </Box>
        {dirty && (
          <Box sx={{
            display: "inline-flex", alignItems: "center", gap: "7px",
            fontSize: 12, fontWeight: 600, color: "warning.main",
            "&::before": { content: '""', width: 7, height: 7, borderRadius: 999, bgcolor: "warning.main", display: "block" },
          }}>
            Non sauvegardé
          </Box>
        )}
      </Box>

      {/* Table des événements */}
      <Box sx={{ overflowX: "auto" }}>
        <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
          {/* Header canaux */}
          <Box component="thead">
            <Box component="tr">
              <Box component="th" sx={{ textAlign: "left", p: "8px 12px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "text.disabled", width: "40%" }}>
                Événement
              </Box>
              {CHANNELS.map(channel => (
                <Box component="th" key={channel} sx={{ textAlign: "center", p: "8px 8px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "text.disabled" }}>
                  {CHANNEL_LABELS[channel]}
                  {isGloballyDisabled(channel) && (
                    <Box
                      component="span"
                      data-testid={`disabled-channel-${channel}`}
                      sx={{
                        display: "block",
                        fontSize: 9,
                        color: "text.disabled",
                        fontWeight: 400,
                        letterSpacing: 0,
                        textTransform: "none",
                      }}
                    >
                      (désactivé)
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          </Box>

          {/* Lignes événements */}
          <Box component="tbody">
            {KNOWN_EVENTS.map(event => (
              <Box
                component="tr"
                key={event}
                data-testid={`event-row-${event}`}
                sx={{
                  borderTop: `1px solid ${theme.palette.divider}`,
                  "&:hover":  { bgcolor: "background.default" },
                }}
              >
                <Box component="td" sx={{ p: "10px 12px", fontSize: 13, fontWeight: 500 }}>
                  {EVENT_LABELS[event] ?? event}
                </Box>
                {CHANNELS.map(channel => {
                  const globalOff = isGloballyDisabled(channel);
                  const checked   = effectivePrefs(event, channel);

                  return (
                    <Box component="td" key={channel} sx={{ textAlign: "center", p: "4px" }}>
                      <Tooltip
                        title={globalOff ? `${CHANNEL_LABELS[channel]} désactivé dans vos paramètres globaux` : ""}
                        placement="top"
                      >
                        <span>
                          <Checkbox
                            checked={checked}
                            disabled={globalOff || saving}
                            onChange={() => handleToggle(event, channel)}
                            size="small"
                            sx={{ opacity: globalOff ? 0.35 : 1 }}
                            inputProps={{
                              "aria-label": `${EVENT_LABELS[event] ?? event} ${CHANNEL_LABELS[channel]}`,
                              // data-testid sur l'<input> pour que toBeChecked() fonctionne
                              "data-testid": `checkbox-${event}-${channel}`,
                            } as React.InputHTMLAttributes<HTMLInputElement>}
                          />
                        </span>
                      </Tooltip>
                    </Box>
                  );
                })}
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Footer */}
      <Box display="flex" justifyContent="flex-end" mt={2.5} pt={2} sx={{ borderTop: `1px solid ${theme.palette.divider}` }}>
        <LoadingButton
          variant="contained"
          loading={saving}
          disabled={!dirty}
          onClick={handleSave}
          data-testid="btn-save-notif-prefs"
          sx={{ height: 40, px: 3 }}
        >
          Enregistrer
        </LoadingButton>
      </Box>
    </Box>
  );
}
