import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import Logo from "../../../../images/logo.png";
import useAuth from "../../../../hooks/useAuth";
import useLogout from "../../../../hooks/useLogout";

// Material UI
import { alpha, useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import MenuIcon from "@mui/icons-material/Menu";
import useMediaQuery from "@mui/material/useMediaQuery";
import Avatar from "@mui/material/Avatar";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Badge from "@mui/material/Badge";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import logger from "../../../../services/logger";

// Local component
import Woman from "../../../../images/icons/Woman.png";
import Man from "../../../../images/icons/Man.png";
import InstallPrompt from "../../../small/InstallPrompt";

const HINT_KEY = "medatwork_v3_profile_hint";
type HintState = "prompt" | "later" | "done";

const linkTextSx = { textDecoration: "none", textTransform: "uppercase", color: "#2d3748" };

interface TopbarProps {
  onSidebarOpen: () => void;
}

const Topbar = ({ onSidebarOpen }: TopbarProps) => {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });

  const { authentication } = useAuth();
  const navigate = useNavigate();
  const logout = useLogout();

  const [profileHint, setProfileHint] = useState<HintState>(() => {
    const stored = localStorage.getItem(HINT_KEY);
    if (stored === "later") return "later";
    if (stored === "done") return "done";
    return "prompt";
  });

  const handleHintLater = () => {
    localStorage.setItem(HINT_KEY, "later");
    setProfileHint("later");
  };

  const handleHintConfigure = () => {
    localStorage.setItem(HINT_KEY, "done");
    setProfileHint("done");
    navigate("/profile");
  };

  const handleAvatarClick = () => {
    if (profileHint !== "done") {
      localStorage.setItem(HINT_KEY, "done");
      setProfileHint("done");
    }
    navigate("/profile");
  };

  const handleLogout = async () => {
    logger.clearUser();
    await logout();
    navigate("/login");
  };

  return (
    <Box
      maxWidth="100%"
      height={{ xs: 58, sm: 66, md: 71 }}
      display="flex"
      justifyContent="space-between"
      paddingRight={{ xs: 2, sm: 3, md: 4 }}
      paddingLeft={{ xs: 2, sm: 3, md: 4 }}
    >
      <Box display={"flex"} alignItems={"center"} color={"primary.dark"}>
        <Box
          component="img"
          sx={{
            height: 30,
          }}
          alt="Your logo."
          src={Logo}
        />
        <Typography fontWeight={700} marginLeft={1}>
          MED@WORK
        </Typography>
        {authentication.role === "hospital_admin" && (
          <Box
            sx={{
              ml: 1,
              px: 0.8,
              py: 0.2,
              borderRadius: 1,
              bgcolor: "primary.main",
              fontSize: "0.65rem",
              fontWeight: 700,
              letterSpacing: "0.06em",
              lineHeight: 1.4,
            }}
          >
            <span style={{ color: "white" }}>ADMIN</span>
          </Box>
        )}
        {authentication.role === "hospital_admin" && authentication.hospitalName && (
          <Box
            display="flex"
            alignItems="center"
            marginLeft={1.5}
            sx={{
              borderLeft: "1px solid",
              borderColor: "divider",
              paddingLeft: 1.5,
            }}
          >
            <Typography
              variant="caption"
              fontWeight={600}
              sx={{
                color: "#B8860B",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {authentication.hospitalName}
            </Typography>
          </Box>
        )}
      </Box>

      <Box display={"flex"} alignItems={"center"}>
        {!authentication.isAuthenticated && isMd && (
          <>
            <NavLink to="/description" style={linkTextSx} sx={{ marginRight: theme.spacing(2) }}>
              <Button
                variant="text"
                color="primary"
                sx={{ marginRight: theme.spacing(2) }}
                disabled={false}
              >
                Notre service
              </Button>
            </NavLink>
            <NavLink to="/login" style={linkTextSx} sx={{ marginRight: theme.spacing(2) }}>
              <Button variant="contained" color="primary" sx={{ marginRight: theme.spacing(2) }}>
                Se connecter
              </Button>
            </NavLink>
            <NavLink to="/connecting" style={linkTextSx}>
              <Button variant="outlined" color="primary">
                S'enregistrer
              </Button>
            </NavLink>
          </>
        )}
        {authentication.isAuthenticated && isMd && (
          <>
            <Box
              display="flex"
              flexDirection={"row"}
              alignItems={"center"}
              justifyContent={"space-between"}
            >
              <Tooltip
                open={profileHint === "later"}
                title="Cliquez sur votre avatar pour configurer votre photo de profil"
                arrow
                placement="bottom-end"
              >
                <Box
                  display={"flex"}
                  flexDirection={"row"}
                  alignItems={"center"}
                  marginRight={"16px"}
                  sx={{ cursor: "pointer" }}
                  onClick={handleAvatarClick}
                  role="button"
                  aria-label="Mon profil"
                >
                  <Stack sx={{ marginRight: "6px" }}>
                    <Badge
                      variant="dot"
                      color="error"
                      invisible={profileHint !== "later"}
                      sx={{
                        "& .MuiBadge-dot": {
                          animation: profileHint === "later"
                            ? "pulse 1.4s ease-in-out infinite"
                            : "none",
                        },
                        "@keyframes pulse": {
                          "0%, 100%": { transform: "scale(1)", opacity: 1 },
                          "50%": { transform: "scale(1.6)", opacity: 0.6 },
                        },
                      }}
                    >
                      <Avatar
                        src={
                          authentication.avatarUrl ??
                          (authentication.gender === "male" ? Man : Woman)
                        }
                        sx={{ width: 35, height: 35 }}
                      />
                    </Badge>
                  </Stack>
                  <Typography color="primary">
                    {authentication.firstname + " " + authentication.lastname}
                  </Typography>
                </Box>
              </Tooltip>

              <InstallPrompt />
              <Button variant="outlined" color="primary" onClick={handleLogout} style={linkTextSx}>
                Se déconnecter
              </Button>
            </Box>
          </>
        )}
        <Box sx={{ display: { xs: "block", md: "none" } }} marginLeft={2}>
          <Button
            onClick={() => onSidebarOpen()}
            aria-label="Menu"
            variant={"outlined"}
            sx={{
              borderRadius: 2,
              minWidth: "auto",
              padding: 1,
              borderColor: alpha(theme.palette.divider, 0.2),
            }}
          >
            <MenuIcon />
          </Button>
        </Box>
      </Box>

      {/* Onboarding v3 — photo de profil */}
      <Snackbar
        open={profileHint === "prompt" && authentication.isAuthenticated}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        sx={{ mt: { xs: 7, md: 9 } }}
      >
        <Alert
          severity="info"
          icon={<PhotoCameraIcon fontSize="small" />}
          sx={{ alignItems: "center" }}
          action={
            <Box display="flex" gap={1} ml={1}>
              <Button size="small" color="inherit" onClick={handleHintLater}>
                Plus tard
              </Button>
              <Button
                size="small"
                color="inherit"
                variant="outlined"
                onClick={handleHintConfigure}
              >
                Configurer
              </Button>
            </Box>
          }
        >
          Nouveau — ajoutez une photo à votre profil !
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Topbar;
