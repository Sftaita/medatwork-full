import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useTheme, alpha } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Dialog from "@mui/material/Dialog";
import TextField from "@mui/material/TextField";
import DownloadIcon from "@mui/icons-material/Download";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import { toast } from "react-toastify";
import { toastSuccess } from "../../../../doc/ToastParams";

// ── Custom checkbox ───────────────────────────────────────────────────────────

function CustomCheck({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: () => void }) {
  const theme = useTheme();
  return (
    <Box
      component="label"
      sx={{
        display:      "flex",
        alignItems:   "center",
        gap:          "13px",
        px:           "6px",
        py:           "12px",
        borderRadius: "10px",
        cursor:       "pointer",
        fontSize:     14,
        fontWeight:   500,
        userSelect:   "none",
        "&:hover":    { bgcolor: theme.palette.background.default },
      }}
    >
      <Box
        sx={{
          width:        22,
          height:       22,
          borderRadius: "7px",
          border:       checked ? "none" : `2px solid ${theme.palette.divider}`,
          bgcolor:      checked ? "primary.main" : "transparent",
          color:        "#fff",
          flex:         "none",
          display:      "flex",
          alignItems:   "center",
          justifyContent: "center",
          transition:   theme.transitions.create(["background", "border"]),
        }}
        onClick={onChange}
      >
        {checked && <CheckIcon sx={{ fontSize: 14 }} />}
      </Box>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ display: "none" }} />
      {label}
    </Box>
  );
}

// ── Modale identifiants StaffPlanner ─────────────────────────────────────────

function StaffPlannerModal({
  open, onClose,
}: { open: boolean; onClose: () => void }) {
  const theme = useTheme();
  const [matricule, setMatricule] = useState("");
  const [section,   setSection]   = useState("");

  const handleSave = () => {
    toast.success("Identifiants StaffPlanner enregistrés", toastSuccess);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { borderRadius: "20px", maxWidth: 520, width: "100%", p: 0, border: "none" } }}
      BackdropProps={{ sx: { backdropFilter: "blur(2px)", background: "rgba(38,30,46,.42)" } }}
    >
      <Box sx={{ p: "28px" }}>
        <Typography sx={{ fontFamily: "'Poppins', sans-serif", fontSize: 19, fontWeight: 600, mb: 1 }}>
          Identifiants StaffPlanner
        </Typography>
        <Typography sx={{ fontSize: 13.5, color: "text.secondary", lineHeight: 1.55, mb: 2.5 }}>
          Ces informations sont liées à votre compte StaffPlanner. Consultez votre service informatique pour plus d'informations.
        </Typography>
        <Box sx={{ mb: "16px" }}>
          <TextField
            label="Matricule"
            placeholder="Ex. 480293"
            value={matricule}
            onChange={(e) => setMatricule(e.target.value)}
            fullWidth
            size="small"
          />
        </Box>
        <TextField
          label="Service / Section"
          placeholder="Ex. Urologie"
          value={section}
          onChange={(e) => setSection(e.target.value)}
          fullWidth
          size="small"
        />
        <Box display="flex" justifyContent="flex-end" gap={1.25} mt={2.5}>
          <Box component="button" onClick={onClose} sx={{ px: "18px", py: "11px", border: "none", background: "transparent", color: "text.secondary", fontWeight: 600, fontSize: 13.5, borderRadius: "11px", cursor: "pointer", fontFamily: "inherit", "&:hover": { bgcolor: "background.default" } }}>
            Annuler
          </Box>
          <Box component="button" onClick={handleSave} sx={{ px: "22px", py: "11px", border: "none", bgcolor: "primary.main", color: "#fff", fontWeight: 600, fontSize: 13.5, borderRadius: "11px", cursor: "pointer", fontFamily: "inherit", boxShadow: `0 6px 16px -5px ${alpha(theme.palette.primary.main, 0.5)}`, "&:hover": { filter: "brightness(.92)" } }}>
            Enregistrer
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
}

// ── Logo export (SP / XL) ─────────────────────────────────────────────────────

function ExportLogo({ letters, gradient }: { letters: string; gradient: string }) {
  return (
    <Box sx={{
      width: 42, height: 42, borderRadius: "12px", flex: "none",
      background: gradient,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 14, color: "#fff",
    }}>
      {letters}
    </Box>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

const Setup = ({ setActiveLink }: { setActiveLink: (k: string) => void }) => {
  const { t }    = useTranslation();
  const theme    = useTheme();

  // ── Paramètres de l'année — état des cases ─────────────────────────────────
  const [notif, setNotif] = useState({
    emailEvent:  true,
    pushEvent:   true,
    smsEvent:    true,
    hrCall:      false,
    emailAlert:  false,
    pushAlert:   true,
  });
  const [dirty,      setDirty]      = useState(false);
  const [spModalOpen, setSpModalOpen] = useState(false);

  const toggleNotif = (key: keyof typeof notif) => {
    setNotif((prev) => ({ ...prev, [key]: !prev[key] }));
    setDirty(true);
  };

  const handleSaveNotif = () => {
    setDirty(false);
    toast.success(t("yearDetail.setup.saved", "Paramètres enregistrés"), toastSuccess);
  };

  // ── Excel options ──────────────────────────────────────────────────────────
  const [excel, setExcel] = useState({ headers: true, oneSheetPerMonth: true, alerts: false });
  const toggleExcel = (key: keyof typeof excel) =>
    setExcel((prev) => ({ ...prev, [key]: !prev[key] }));

  // ── Card shell ─────────────────────────────────────────────────────────────
  const cardSx = {
    bgcolor:      "background.paper",
    border:       `1px solid ${theme.palette.divider}`,
    borderRadius: "18px",
    p:            { xs: "20px", sm: "24px 26px" },
    mb:           "22px",
  };

  const setHeadSx = {
    pb:           "18px",
    mb:           "22px",
    borderBottom: `1px solid ${theme.palette.divider}`,
  };

  const cardTitle = (title: string, desc: string) => (
    <Box sx={setHeadSx}>
      <Typography sx={{ fontFamily: "'Poppins', sans-serif", fontSize: 19, fontWeight: 600 }}>
        {title}
      </Typography>
      <Typography sx={{ fontSize: 13, color: "text.secondary", mt: "5px" }}>
        {desc}
      </Typography>
    </Box>
  );

  return (
    <Box>
      {/* ── Carte 1 : Paramètres de l'année ─────────────────────────── */}
      <Box sx={cardSx}>
        {cardTitle(
          t("yearDetail.setup.title", "Paramètres de l'année"),
          t("yearDetail.setup.eventsDesc", "Choisissez comment vous souhaitez être prévenu·e pour cette année.")
        )}

        <Box display="grid" sx={{ gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: { xs: "22px", sm: "36px" } }}>
          {/* Évènement */}
          <Box>
            <Typography sx={{ fontFamily: "'Poppins', sans-serif", fontSize: 15, fontWeight: 600 }}>
              {t("yearDetail.setup.events", "Évènement")}
            </Typography>
            <Typography component="span" sx={{ display: "block", fontSize: 12, color: "text.disabled", mt: "4px", mb: 1 }}>
              Sur l'adresse email liée au compte.
            </Typography>
            <CustomCheck label={t("yearDetail.setup.emailNotif", "Notification email")} checked={notif.emailEvent}  onChange={() => toggleNotif("emailEvent")} />
            <CustomCheck label={t("yearDetail.setup.pushNotif",  "Notification push")}  checked={notif.pushEvent}   onChange={() => toggleNotif("pushEvent")} />
            <CustomCheck label={t("yearDetail.setup.sms",        "SMS")}                checked={notif.smsEvent}    onChange={() => toggleNotif("smsEvent")} />
            <CustomCheck label={t("yearDetail.setup.hrCall",     "Appel RH")}           checked={notif.hrCall}      onChange={() => toggleNotif("hrCall")} />
          </Box>

          {/* Incohérence / Dépassement */}
          <Box>
            <Typography sx={{ fontFamily: "'Poppins', sans-serif", fontSize: 15, fontWeight: 600 }}>
              {t("yearDetail.setup.inconsistency", "Incohérence / Dépassement")}
            </Typography>
            <Typography component="span" sx={{ display: "block", fontSize: 12, color: "text.disabled", mt: "4px", mb: 1 }}>
              Sur l'adresse email liée au compte.
            </Typography>
            <CustomCheck label={t("yearDetail.setup.emailNotif", "Notification email")} checked={notif.emailAlert} onChange={() => toggleNotif("emailAlert")} />
            <CustomCheck label={t("yearDetail.setup.pushNotif",  "Notification push")}  checked={notif.pushAlert}  onChange={() => toggleNotif("pushAlert")} />
          </Box>
        </Box>

        {/* Pied de carte */}
        <Box
          display="flex"
          alignItems="center"
          gap={2}
          mt={3}
          pt={2.5}
          flexWrap="wrap"
          sx={{ borderTop: `1px solid ${theme.palette.divider}` }}
        >
          <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
            Vous pouvez aussi mettre à jour vos{" "}
            <Link href="#" underline="none" color="primary" fontWeight={600} sx={{ cursor: "pointer" }}>
              {t("yearDetail.setup.securityLink", "paramètres de sécurité")}
            </Link>.
          </Typography>

          {dirty && (
            <Box sx={{
              display: "inline-flex", alignItems: "center", gap: "7px",
              fontSize: 12, fontWeight: 600, color: "warning.main",
              ml: { xs: 0, sm: "auto" },
              "&::before": { content: '""', width: 7, height: 7, borderRadius: 999, bgcolor: "warning.main", display: "block" },
            }}>
              Modifications non enregistrées
            </Box>
          )}

          <Button
            variant="contained"
            onClick={handleSaveNotif}
            sx={{
              height:   44,
              px:       3,
              ml:       dirty ? 0 : { xs: 0, sm: "auto" },
              width:    { xs: "100%", sm: "auto" },
            }}
          >
            {t("yearDetail.setup.save", "Enregistrer")}
          </Button>
        </Box>
      </Box>

      {/* ── Carte 2 : Paramètres d'exportations ─────────────────────── */}
      <Box sx={cardSx}>
        {cardTitle(
          t("yearDetail.setup.exports", "Paramètres d'exportations"),
          t("yearDetail.setup.exportsDesc", "Configurez les intégrations utilisées pour exporter les horaires.")
        )}

        <Box display="grid" sx={{ gridTemplateColumns: { xs: "1fr", sm: "1.3fr 1fr" }, gap: "22px" }}>

          {/* StaffPlanner */}
          <Box sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: "16px", p: "18px" }}>
            <Box display="flex" alignItems="center" gap={1.5} mb={2}>
              <ExportLogo letters="SP" gradient="linear-gradient(135deg,#7B3FA0,#5d2a82)" />
              <Box>
                <Typography sx={{ fontFamily: "'Poppins', sans-serif", fontSize: 15, fontWeight: 600 }}>
                  {t("yearDetail.setup.staffPlannerTitle", "StaffPlanner")}
                </Typography>
                <Typography sx={{ fontSize: 12, color: "text.secondary", mt: "2px" }}>
                  {t("yearDetail.setup.staffPlannerDesc", "Renseignez les informations pour permettre l'export.")}
                </Typography>
              </Box>
            </Box>

            {/* Mini-table */}
            <Box sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: "12px", overflow: "hidden" }}>
              {/* Header */}
              <Box
                display="grid"
                sx={{
                  gridTemplateColumns: "1.4fr 1fr 1fr 44px",
                  gap: "12px", px: "16px", py: "13px",
                  bgcolor: theme.palette.custom.primarySofter,
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em",
                  textTransform: "uppercase", color: "text.disabled",
                  display: { xs: "none", sm: "grid" },
                }}
              >
                <Box>Nom</Box><Box>Matricule</Box><Box>Section</Box><Box />
              </Box>
              {/* Row placeholder */}
              <Box display="grid" sx={{ gridTemplateColumns: { xs: "1fr auto", sm: "1.4fr 1fr 1fr 44px" }, gap: "12px", px: "16px", py: "13px", alignItems: "center" }}>
                <Typography sx={{ fontWeight: 600, fontSize: 13.5 }}>
                  {t("yearDetail.setup.staffPlannerResident", "Résidents de l'année")}
                </Typography>
                <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: "text.disabled", fontStyle: "italic", display: { xs: "none", sm: "block" } }}>
                  Non défini
                </Typography>
                <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: "text.disabled", fontStyle: "italic", display: { xs: "none", sm: "block" } }}>
                  Non défini
                </Typography>
                <Box
                  component="button"
                  onClick={() => setSpModalOpen(true)}
                  sx={{
                    width: 34, height: 34, borderRadius: "10px",
                    border: `1px solid ${theme.palette.divider}`,
                    bgcolor: "background.paper",
                    color: "primary.main",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer",
                    "&:hover": { bgcolor: theme.palette.custom.primarySoft },
                  }}
                >
                  <EditIcon sx={{ fontSize: 16 }} />
                </Box>
              </Box>
            </Box>

            {/* Bouton vers la vue complète */}
            <Button
              variant="text"
              size="small"
              sx={{ mt: 1.5, color: "text.secondary", fontSize: 12 }}
              onClick={() => setActiveLink("staffPlanner")}
            >
              {t("yearDetail.setup.configure", "Voir la configuration complète →")}
            </Button>
          </Box>

          {/* Excel */}
          <Box sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: "16px", p: "18px" }}>
            <Box display="flex" alignItems="center" gap={1.5} mb={2}>
              <ExportLogo letters="XL" gradient="linear-gradient(135deg,#1f9d57,#147a41)" />
              <Box>
                <Typography sx={{ fontFamily: "'Poppins', sans-serif", fontSize: 15, fontWeight: 600 }}>
                  {t("yearDetail.setup.excelTitle", "Excel")}
                </Typography>
                <Typography sx={{ fontSize: 12, color: "text.secondary", mt: "2px" }}>
                  {t("yearDetail.setup.excelDesc", "Export .xlsx aux colonnes standard Med@Work.")}
                </Typography>
              </Box>
            </Box>

            <CustomCheck
              label={t("yearDetail.setup.excelHeaders",       "Inclure les en-têtes")}
              checked={excel.headers}
              onChange={() => toggleExcel("headers")}
            />
            <CustomCheck
              label={t("yearDetail.setup.excelOneSheet",      "Une feuille par mois")}
              checked={excel.oneSheetPerMonth}
              onChange={() => toggleExcel("oneSheetPerMonth")}
            />
            <CustomCheck
              label={t("yearDetail.setup.excelAlerts",        "Inclure les alertes de conformité")}
              checked={excel.alerts}
              onChange={() => toggleExcel("alerts")}
            />

            <Box
              component="button"
              onClick={() => toast.success("Modèle Excel téléchargé", toastSuccess)}
              sx={{
                display:      "inline-flex",
                alignItems:   "center",
                gap:          "7px",
                mt:           "6px",
                height:       40,
                px:           2,
                border:       `1px solid ${theme.palette.divider}`,
                bgcolor:      "background.paper",
                borderRadius: "11px",
                color:        "text.primary",
                fontWeight:   600,
                fontSize:     13,
                fontFamily:   "inherit",
                cursor:       "pointer",
                "&:hover":    { bgcolor: "background.default" },
              }}
            >
              <DownloadIcon sx={{ fontSize: 16 }} />
              {t("yearDetail.setup.downloadTemplate", "Télécharger un modèle")}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ── Modale StaffPlanner ───────────────────────────────────────── */}
      <StaffPlannerModal open={spModalOpen} onClose={() => setSpModalOpen(false)} />
    </Box>
  );
};

export default Setup;
