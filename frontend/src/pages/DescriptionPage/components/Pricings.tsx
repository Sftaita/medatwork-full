import React from "react";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import CardActions from "@mui/material/CardActions";

const mock = [
  {
    title: "Mensuel",
    price: "14.99",
    info: "Par mois, par MACCS",
    features: [
      {
        title: "Interface MACCS",
        isIncluded: true,
      },
      {
        title: "Compte manager illimité",
        isIncluded: true,
      },
      {
        title: "Validation numérique",
        isIncluded: true,
      },
      {
        title: "Satistics",
        isIncluded: true,
      },
      {
        title: "Exportation des données",
        isIncluded: true,
      },
      {
        title: "Gestion d'équipe",
        isIncluded: true,
      },
      {
        title: "Nombre d'année illimité",
        isIncluded: true,
      },
      {
        title: "Exportation vers service tiers",
        isIncluded: false,
      },
    ],
    isHighlighted: false,
    btnText: "Je prends",
  },
  {
    title: "Annuel",
    price: "150",
    info: "Par année, par MACCS",
    features: [
      {
        title: "Interface MACCS",
        isIncluded: true,
      },
      {
        title: "Compte manager illimité",
        isIncluded: true,
      },
      {
        title: "Validation numérique",
        isIncluded: true,
      },
      {
        title: "Satistics",
        isIncluded: true,
      },
      {
        title: "Exportation des données",
        isIncluded: true,
      },
      {
        title: "Gestion d'équipe",
        isIncluded: true,
      },
      {
        title: "Nombre d'année illimité",
        isIncluded: true,
      },
      {
        title: "Exportation vers service tiers",
        isIncluded: false,
      },
    ],
    isHighlighted: true,
    btnText: "Je prends",
  },
  {
    title: "Sur mesure",
    price: "Variable",
    info: "Par groupe hospitalié",
    features: [
      {
        title: "Interface MACCS",
        isIncluded: true,
      },
      {
        title: "Compte manager illimité",
        isIncluded: true,
      },
      {
        title: "Validation numérique",
        isIncluded: true,
      },
      {
        title: "Satistics",
        isIncluded: true,
      },
      {
        title: "Exportation des données",
        isIncluded: true,
      },
      {
        title: "Gestion d'équipe",
        isIncluded: true,
      },
      {
        title: "Nombre d'année illimité",
        isIncluded: true,
      },
      {
        title: "Exportation vers service tiers",
        isIncluded: true,
      },
    ],
    isHighlighted: false,
    btnText: "Contactez-nous",
  },
];

const Pricing = () => {
  const theme = useTheme();

  return (
    <Box>
      <Box marginBottom={4}>
        <Typography sx={{ fontWeight: 700 }} variant={"h4"} align={"center"} gutterBottom>
          Prix transparents et flexibles
        </Typography>
        <Typography variant={"h6"} component={"p"} color={"text.secondary"} align={"center"}>
          Quel que soit vos ressources, nos offres évoluent en fonction de vos besoins.
        </Typography>
      </Box>
      <Grid container spacing={4}>
        {mock.map((item, i) => (
          <Grid
            item
            xs={12}
            md={4}
            key={i}
            data-aos={"fade-up"}
            data-aos-delay={i * 100}
            data-aos-offset={100}
            data-aos-duration={600}
          >
            <Box
              component={Card}
              height={1}
              display={"flex"}
              flexDirection={"column"}
              boxShadow={0}
              border={`1px solid ${theme.palette.divider}`}
            >
              <CardContent
                sx={{
                  padding: { sm: 4 },
                }}
              >
                <Box
                  marginBottom={4}
                  display={"flex"}
                  flexDirection={"column"}
                  alignItems={"center"}
                >
                  <Typography variant={"h6"} gutterBottom>
                    <Box component={"span"} fontWeight={600}>
                      {item.title}
                    </Box>
                  </Typography>
                  <Box display={"flex"} alignItems={"flex-start"}>
                    {item.price !== "Variable" && (
                      <Typography variant={"h4"} color={"primary"}>
                        <Box component={"span"} fontWeight={600} marginRight={1 / 2}>
                          €
                        </Box>
                      </Typography>
                    )}
                    <Typography variant={"h2"} color={"primary"} gutterBottom>
                      <Box component={"span"} fontWeight={600}>
                        {item.price}
                      </Box>
                    </Typography>
                  </Box>
                  <Typography variant={"subtitle2"} color={"text.secondary"}>
                    {item?.info}
                  </Typography>
                </Box>
                <Grid container spacing={1}>
                  {item.features.map((feature, j) => (
                    <Grid item xs={12} key={j}>
                      <Typography
                        component={"p"}
                        align={"center"}
                        style={{
                          textDecoration: !feature.isIncluded ? "line-through" : "none",
                        }}
                      >
                        {feature.title}
                      </Typography>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
              <Box flexGrow={1} />
              <CardActions sx={{ justifyContent: "flex-end", padding: 4 }}>
                <Button size={"large"} variant={item.isHighlighted ? "contained" : "outlined"}>
                  {item.btnText}
                </Button>
              </CardActions>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Pricing;
