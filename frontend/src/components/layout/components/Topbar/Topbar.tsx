import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import Logo from "../../../../images/logo.png";
import useAuth from "../../../../hooks/useAuth";
import useLogout from "../../../../hooks/useLogout";
import { useSidebarStore } from "../../../../store/sidebarStore";
import { useSearchStore } from "../../../../store/searchStore";

// Material UI
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import MenuIcon from "@mui/icons-material/Menu";
import SearchIcon from "@mui/icons-material/Search";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import useMediaQuery from "@mui/material/useMediaQuery";
import Avatar from "@mui/material/Avatar";
import Badge from "@mui/material/Badge";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import logger from "../../../../services/logger";

import Woman from "../../../../images/icons/Woman.png";
import Man from "../../../../images/icons/Man.png";
import InstallPrompt from "../../../small/InstallPrompt";

const HINT_KEY = "medatwork_v3_profile_hint";
type HintState = "prompt" | "later" | "done";

const linkTextSx = { textDecoration: "none", textTransform: "uppercase", color: "#2d3748" };

const ROLE_LABELS: Record<string, string> = {
  manager:        "Manager",
  resident:       "MACCS",
  hospital_admin: "Administrateur",
  super_admin:    "Super Admin",
};

interface TopbarProps {
  onSidebarOpen: () => void;
}

const Topbar = ({ onSidebarOpen }: TopbarProps) => {
  const theme = useTheme();
  const isMd  = useMediaQuery(theme.breakpoints.up("md"), { defaultMatches: true });

  const { authentication }             = useAuth();
  const { collapsed, toggle }          = useSidebarStore();
  const { active: searchActive, placeholder: searchPlaceholder, value: searchValue, setValue: setSearchValue } = useSearchStore();
  const navigate = useNavigate();
  const logout   = useLogout();

  const [profileHint, setProfileHint] = useState<HintState>(() => {
    const s = localStorage.getItem(HINT_KEY);
    if (s === "later") return "later";
    if (s === "done")  return "done";
    return "prompt";
  });

  // ── Menu déroulant ────────────────────────────────────────────────────────
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(menuAnchor);

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => {
    if (profileHint !== "done") { localStorage.setItem(HINT_KEY, "done"); setProfileHint("done"); }
    setMenuAnchor(e.currentTarget);
  };
  const handleMenuClose = () => setMenuAnchor(null);

  const handleGoToAccount  = () => { handleMenuClose(); navigate("/profile/account"); };
  const handleGoToSettings = () => { handleMenuClose(); navigate("/profile/settings"); };

  const handleLogout = async () => {
    handleMenuClose();
    logger.clearUser();
    await logout();
    navigate("/login");
  };

  const handleHintLater     = () => { localStorage.setItem(HINT_KEY, "later"); setProfileHint("later"); };
  const handleHintConfigure = () => { localStorage.setItem(HINT_KEY, "done"); setProfileHint("done"); navigate("/profile/settings"); };

  const roleLabel = authentication.role ? (ROLE_LABELS[authentication.role] ?? "") : "";
  const subtitle  = [roleLabel, authentication.hospitalName].filter(Boolean).join(" · ");

  // Sur desktop authentifié : le contenu de la topbar démarre après la sidebar
  const sidebarW = collapsed ? 64 : 240;

  return (
    <Box
      maxWidth="100%"
      height={{ xs: 58, sm: 66, md: 71 }}
      display="flex"
      alignItems="center"
      pl={{
        xs: 2,
        sm: 3,
        md: authentication.isAuthenticated ? `calc(${sidebarW}px + 24px)` : "36px",
      }}
      pr={{ xs: 2, sm: 3, md: "36px" }}
      sx={{
        bgcolor: "background.paper",
        borderBottom: "1px solid",
        borderBottomColor: "divider",
        transition: theme.transitions.create("padding-left"),
      }}
    >
      {/* ── Gauche (flex:1) : toggle + logo mobile ───────────────────────── */}
      <Box flex={1} display="flex" alignItems="center" gap={1.5}>
        {/* Bouton < / > — desktop authentifié */}
        {isMd && authentication.isAuthenticated && (
          <Tooltip title={collapsed ? "Agrandir le menu" : "Réduire le menu"} arrow>
            <IconButton
              onClick={toggle}
              aria-label={collapsed ? "Agrandir le menu" : "Réduire le menu"}
              sx={{
                width: 32, height: 32,
                borderRadius: "8px",
                bgcolor: "background.default",
                border: "1px solid",
                borderColor: "divider",
                color: "text.secondary",
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              {collapsed
                ? <ChevronRightIcon sx={{ fontSize: 16 }} />
                : <ChevronLeftIcon  sx={{ fontSize: 16 }} />}
            </IconButton>
          </Tooltip>
        )}

        {/* Logo — mobile toujours + desktop si non authentifié (pas de sidebar) */}
        {(!isMd || !authentication.isAuthenticated) && (
          <>
            <Box component="img" sx={{ height: 28 }} alt="Logo Medatwork" src={Logo} />
            <Typography fontWeight={800} fontSize={14} letterSpacing=".06em" color="primary.main">
              MED<span style={{ opacity: 0.55, margin: "0 1px" }}>@</span>WORK
            </Typography>
          </>
        )}
      </Box>

      {/* ── Centre : barre de recherche — slide+fade selon searchActive ── */}
      {authentication.isAuthenticated && isMd && (
        <Box
          sx={{
            flexShrink: 0,
            overflow: "hidden",
            // Slide : maxWidth 0 → 380px
            maxWidth: searchActive ? 380 : 0,
            // Fade + marges
            opacity:  searchActive ? 1 : 0,
            mx:       searchActive ? 2 : 0,
            // Transitions
            transition: "max-width 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease, margin 0.28s cubic-bezier(0.4,0,0.2,1)",
            pointerEvents: searchActive ? "auto" : "none",
          }}
        >
          {/* Largeur fixe à l'intérieur — c'est le parent qui anime */}
          <Box sx={{ width: 380 }}>
            <InputBase
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder={searchPlaceholder}
              autoComplete="off"
              startAdornment={
                <SearchIcon sx={{ fontSize: 16, color: "text.disabled", mr: 1, flexShrink: 0 }} />
              }
              sx={{
                width: "100%",
                bgcolor: "background.default",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 999,
                px: "12px",
                py: "9px",
                fontSize: 13,
                color: "text.primary",
                "& input": { p: 0 },
                "& input::placeholder": { color: "text.disabled", opacity: 1 },
              }}
            />
          </Box>
        </Box>
      )}

      {/* ── Droite (flex:1) : actions — justifié à droite ────────────────── */}
      <Box flex={1} display="flex" alignItems="center" justifyContent="flex-end" gap={1}>

        {!authentication.isAuthenticated && isMd && (
          <>
            <NavLink to="/description" style={linkTextSx}>
              <Button variant="text">Notre service</Button>
            </NavLink>
            <NavLink to="/login" style={linkTextSx}>
              <Button variant="contained" color="primary">Se connecter</Button>
            </NavLink>
            <NavLink to="/connecting" style={linkTextSx}>
              <Button variant="outlined">S'enregistrer</Button>
            </NavLink>
          </>
        )}

        {authentication.isAuthenticated && isMd && (
          <>
            <InstallPrompt />

            {/* Avatar + nom + sous-titre — desktop */}
            <Tooltip
              open={profileHint === "later"}
              title="Cliquez sur votre avatar pour configurer votre photo de profil"
              arrow placement="bottom-end"
            >
              <Box
                display="flex" alignItems="center" gap={1.5}
                sx={{ cursor: "pointer", borderRadius: 2, px: 1, py: 0.5, "&:hover": { bgcolor: "action.hover" } }}
                onClick={handleMenuOpen}
                role="button"
                aria-label="Mon compte"
                aria-controls={menuOpen ? "account-menu" : undefined}
                aria-haspopup="true"
                aria-expanded={menuOpen ? "true" : undefined}
              >
                <Box sx={{ textAlign: "right" }}>
                  <Typography variant="body2" fontWeight={600} color="text.primary" lineHeight={1.25}>
                    {authentication.firstname} {authentication.lastname}
                  </Typography>
                  {subtitle && (
                    <Typography variant="caption" color="text.disabled" lineHeight={1.2} sx={{ fontSize: 11 }}>
                      {subtitle}
                    </Typography>
                  )}
                </Box>

                <Badge
                  variant="dot" color="error" invisible={profileHint !== "later"}
                  sx={{
                    "& .MuiBadge-dot": { animation: profileHint === "later" ? "pulse 1.4s ease-in-out infinite" : "none" },
                    "@keyframes pulse": { "0%, 100%": { transform: "scale(1)", opacity: 1 }, "50%": { transform: "scale(1.6)", opacity: 0.6 } },
                  }}
                >
                  <Avatar
                    src={authentication.avatarUrl ?? undefined}
                    sx={{
                      width: 32, height: 32,
                      background: !authentication.avatarUrl
                        ? `linear-gradient(135deg, color-mix(in srgb, var(--primary-color, #9C27B0) 35%, white), color-mix(in srgb, var(--primary-color, #9C27B0) 65%, white))`
                        : undefined,
                      border: "2px solid",
                      borderColor: "background.paper",
                      boxShadow: `0 0 0 1px ${theme.palette.divider}`,
                      bgcolor: "primary.main",
                    }}
                  >
                    {!authentication.avatarUrl && (
                      <img
                        src={authentication.gender === "male" ? Man : Woman}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    )}
                  </Avatar>
                </Badge>
              </Box>
            </Tooltip>
          </>
        )}

        {/* Menu compte — partagé desktop + mobile */}
        {authentication.isAuthenticated && (
          <Menu
            id="account-menu"
            anchorEl={menuAnchor}
            open={menuOpen}
            onClose={handleMenuClose}
            onClick={handleMenuClose}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            slotProps={{ paper: { elevation: 2, sx: { minWidth: 190, mt: 0.5 } } }}
          >
            <MenuItem onClick={handleGoToAccount}>
              <ListItemIcon><AccountCircleIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Mon compte</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleGoToSettings}>
              <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Préférences</ListItemText>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout} sx={{ color: "error.main" }}>
              <ListItemIcon><LogoutIcon fontSize="small" color="error" /></ListItemIcon>
              <ListItemText>Se déconnecter</ListItemText>
            </MenuItem>
          </Menu>
        )}

        {/* Avatar cliquable — mobile uniquement */}
        {authentication.isAuthenticated && (
          <Box sx={{ display: { xs: "flex", md: "none" }, alignItems: "center" }}>
            <IconButton
              onClick={handleMenuOpen}
              size="small"
              aria-label="Mon compte"
              aria-controls={menuOpen ? "account-menu" : undefined}
              aria-haspopup="true"
              aria-expanded={menuOpen ? "true" : undefined}
              sx={{ p: 0.5 }}
            >
              <Avatar
                src={authentication.avatarUrl ?? undefined}
                sx={{
                  width: 32, height: 32,
                  bgcolor: "primary.main",
                  border: "2px solid",
                  borderColor: "background.paper",
                  boxShadow: `0 0 0 1px ${theme.palette.divider}`,
                }}
              >
                {!authentication.avatarUrl && (
                  <img
                    src={authentication.gender === "male" ? Man : Woman}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                )}
              </Avatar>
            </IconButton>
          </Box>
        )}

        {/* Burger mobile */}
        <Box sx={{ display: { xs: "block", md: "none" } }}>
          <IconButton onClick={() => onSidebarOpen()} aria-label="Menu" size="small">
            <MenuIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Onboarding */}
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
              <Button size="small" color="inherit" onClick={handleHintLater}>Plus tard</Button>
              <Button size="small" color="inherit" variant="outlined" onClick={handleHintConfigure}>Configurer</Button>
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
