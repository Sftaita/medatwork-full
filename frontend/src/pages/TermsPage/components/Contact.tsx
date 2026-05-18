import React from "react";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";

const Contact = () => {
  const theme = useTheme();

  return (
    <Box component={Card} boxShadow={0} border={`1px solid ${theme.palette.divider}`}>
      <Box padding={{ xs: 2, sm: 3 }}>
        <Typography
          sx={{
            fontWeight: "700",
          }}
          gutterBottom
        >
          Questions relatives à la protection des données
        </Typography>
        <Typography
          variant={"body2"}
          color={"text.secondary"}
          sx={{
            marginBottom: 2,
          }}
        >
          Si vous avez des questions ou des préoccupations concernant la politique de
          confidentialité, veuillez nous contacter.
        </Typography>
        <Typography variant={"subtitle2"}>
          privacy@medatwork.be
          <br />
          Belgique
        </Typography>
      </Box>
    </Box>
  );
};

export default Contact;
