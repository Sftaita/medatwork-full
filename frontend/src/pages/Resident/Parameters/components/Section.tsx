// material UI
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import { Typography } from "@mui/material";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const Section = ({ title, subtitle, backIcon = false, children }) => {
  return (
    <Box sx={{ width: "100%", bgcolor: "background.paper" }}>
      <Card sx={{ minWidth: 275, mb: 2 }} variant="outlined">
        <CardContent sx={{ padding: 0 }}>
          <Stack
            direction="column"
            justifyContent="flex-start"
            alignItems="flex-start"
            spacing={0}
            sx={{ mt: 4, mb: 2, ml: 2 }}
          >
            <Stack direction="row" justifyContent="flex-start" alignItems="center" spacing={1}>
              {backIcon && <ArrowBackIcon />}
              <Typography variant="h6" component="div">
                {title}
              </Typography>
            </Stack>
            <Typography variant="subtitle2" component="div">
              {subtitle}
            </Typography>
          </Stack>
          <nav aria-label="section">
            <List>{children}</List>
          </nav>
        </CardContent>
      </Card>
    </Box>
  );
};
export default Section;
