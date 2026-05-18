import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { axiosPrivate } from "../services/Axios";
import useAuth from "../hooks/useAuth";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from "@mui/material/Typography";

// ── CGU version ───────────────────────────────────────────────────────────────
// Must match CguService::CGU_VERSION in the backend.
export const CGU_VERSION = "2026.1";

// ── Section helpers ───────────────────────────────────────────────────────────

const H2 = ({ children }: { children: string }) => (
  <Typography variant="subtitle1" fontWeight={700} mt={3} mb={0.75} color="text.primary">
    {children}
  </Typography>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <Typography variant="body2" color="text.secondary" mb={1} sx={{ lineHeight: 1.65 }}>
    {children}
  </Typography>
);

const Ul = ({ items }: { items: string[] }) => (
  <Box component="ul" sx={{ pl: 2.5, mt: 0, mb: 1 }}>
    {items.map((item, i) => (
      <Typography key={i} component="li" variant="body2" color="text.secondary" mb={0.25}>
        {item}
      </Typography>
    ))}
  </Box>
);

// ── CGU text ──────────────────────────────────────────────────────────────────

const CguText = () => (
  <Box>
    <Typography variant="caption" color="text.disabled" display="block" mb={2}>
      Dernière mise à jour : 18 mai 2026 — Version {CGU_VERSION}
    </Typography>

    <H2>1. Objet</H2>
    <P>Les présentes Conditions Générales d'Utilisation (« CGU ») définissent les règles d'utilisation de la plateforme MED@WORK, destinée à la gestion organisationnelle des MACCS, maîtres de stage, coordinateurs, ressources humaines et administrateurs hospitaliers.</P>
    <P>L'utilisation de la plateforme implique l'acceptation pleine et entière des présentes conditions.</P>

    <H2>2. Accès et responsabilité du compte</H2>
    <P>Chaque utilisateur est responsable :</P>
    <Ul items={["De la confidentialité de ses identifiants", "De la sécurité de son compte", "De l'utilisation faite depuis son compte", "Des informations qu'il encode dans la plateforme"]} />
    <P>Toute tentative d'accès non autorisé peut entraîner une suspension immédiate.</P>

    <H2>3. Obligations des utilisateurs</H2>
    <P>Les utilisateurs s'engagent à :</P>
    <Ul items={["Utiliser la plateforme conformément à la loi", "Respecter la confidentialité des informations accessibles", "Ne pas tenter de contourner les mesures de sécurité", "Respecter les obligations déontologiques et professionnelles applicables"]} />

    <H2>4. Données encodées</H2>
    <P>Chaque utilisateur est responsable des données qu'il introduit. MED@WORK n'est pas responsable des erreurs d'encodage.</P>

    <H2>5. Confidentialité et RGPD</H2>
    <P>L'utilisation est soumise à la Politique de confidentialité de la plateforme. Les utilisateurs s'engagent à respecter le RGPD et le secret professionnel.</P>

    <H2>6. Exports RH et conformité</H2>
    <P>Les fonctionnalités d'export et de suivi constituent des outils d'assistance. Les établissements et utilisateurs restent responsables de la vérification, de la conformité légale et des décisions administratives.</P>

    <H2>7. Disponibilité</H2>
    <P>MED@WORK peut être temporairement indisponible (maintenance, mise à jour, incident technique). Aucune disponibilité ininterrompue n'est garantie.</P>

    <H2>8. Limitation de responsabilité</H2>
    <P>MED@WORK ne pourra être tenu responsable d'erreurs d'encodage, d'une mauvaise utilisation, d'une interruption de service ou d'un incident causé par un tiers.</P>

    <H2>9. Propriété intellectuelle</H2>
    <P>La plateforme, son interface, son code source et son design sont protégés. Toute reproduction non autorisée est interdite.</P>

    <H2>10. Utilisation acceptable</H2>
    <P>Il est strictement interdit de tenter d'accéder aux données d'un autre utilisateur, d'utiliser des outils automatisés non autorisés ou de perturber le fonctionnement de la plateforme.</P>

    <H2>11. Modification des conditions</H2>
    <P>MED@WORK peut modifier les présentes conditions. En cas de modification importante, les utilisateurs seront invités à les accepter avant de continuer à utiliser la plateforme.</P>

    <H2>12. Droit applicable</H2>
    <P>Les présentes conditions sont régies par le droit belge. En cas de litige, les tribunaux de Bruxelles sont compétents.</P>

    <H2>13. Contact</H2>
    <P>📧 legal@medatwork.be</P>
  </Box>
);

// ── Modal ─────────────────────────────────────────────────────────────────────

const CguModal = () => {
  const { authentication, setAuthentication } = useAuth();
  const [checked, setChecked] = useState(false);

  const mutation = useMutation({
    mutationFn: () => axiosPrivate.post("user/accept-cgu").then((r) => r.data),
    onSuccess: () => {
      setAuthentication((prev) => ({ ...prev, cgvAccepted: true }));
    },
    onError: () => toast.error("Impossible d'enregistrer votre acceptation. Réessayez."),
  });

  // Only show when authenticated but CGU not yet accepted
  if (!authentication.isAuthenticated || authentication.cgvAccepted !== false) return null;

  return (
    <Dialog
      open
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown
      // Prevent closing by clicking outside
      onClose={() => {}}
      PaperProps={{ sx: { maxHeight: "90vh" } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" fontWeight={700}>
          Conditions Générales d'Utilisation — MED@WORK
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Une mise à jour des CGU a eu lieu. Veuillez les lire et les accepter pour continuer.
        </Typography>
      </DialogTitle>

      <Divider />

      {/* Scrollable CGU content */}
      <DialogContent sx={{ overflowY: "auto" }}>
        <CguText />
      </DialogContent>

      <Divider />

      {/* Sticky accept bar */}
      <Box
        sx={{
          px: 3, py: 2,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 2,
          bgcolor: "background.paper",
        }}
      >
        <FormControlLabel
          control={
            <Checkbox
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              color="primary"
            />
          }
          label={
            <Typography variant="body2">
              J'ai lu et j'accepte les Conditions Générales d'Utilisation (version {CGU_VERSION})
            </Typography>
          }
        />
        <Button
          variant="contained"
          color="primary"
          disabled={!checked || mutation.isPending}
          onClick={() => mutation.mutate()}
          sx={{ minWidth: 140 }}
        >
          {mutation.isPending ? <CircularProgress size={20} color="inherit" /> : "Accepter et continuer"}
        </Button>
      </Box>
    </Dialog>
  );
};

export default CguModal;
