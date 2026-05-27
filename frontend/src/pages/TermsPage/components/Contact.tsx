import React from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";

const CONTENT: Record<string, { title: string; body: string; country: string }> = {
  fr: {
    title:   "Questions relatives à la protection des données",
    body:    "Si vous avez des questions ou des préoccupations concernant la politique de confidentialité, veuillez nous contacter.",
    country: "Belgique",
  },
  en: {
    title:   "Questions Regarding Data Protection",
    body:    "If you have any questions or concerns regarding this Privacy Policy, please contact us.",
    country: "Belgium",
  },
  nl: {
    title:   "Vragen met betrekking tot gegevensbescherming",
    body:    "Indien u vragen of bezorgdheden heeft met betrekking tot dit privacybeleid, gelieve contact met ons op te nemen.",
    country: "België",
  },
};

interface ContactProps {
  email?: string;
}

const Contact = ({ email = "privacy@medatwork.be" }: ContactProps) => {
  const theme = useTheme();
  const { i18n } = useTranslation();
  const lang = i18n.language in CONTENT ? i18n.language : "fr";
  const { title, body, country } = CONTENT[lang];

  return (
    <Box component={Card} boxShadow={0} border={`1px solid ${theme.palette.divider}`}>
      <Box padding={{ xs: 2, sm: 3 }}>
        <Typography sx={{ fontWeight: "700" }} gutterBottom>
          {title}
        </Typography>
        <Typography variant={"body2"} color={"text.secondary"} sx={{ marginBottom: 2 }}>
          {body}
        </Typography>
        <Typography variant={"subtitle2"}>
          📧 {email}
          <br />
          {country}
        </Typography>
      </Box>
    </Box>
  );
};

export default Contact;
