import { useEffect, useState, useCallback } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useAuth from "../../../../../../hooks/useAuth";
import useNotificationContext from "../../../../../../hooks/useNotificationContext";

// Material UI
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import TuneIcon from "@mui/icons-material/Tune";
import Tooltip from "@mui/material/Tooltip";
import Avatar from "@mui/material/Avatar";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Collapse from "@mui/material/Collapse";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import Badge from "@mui/material/Badge";

import { linkTextSx, noAuth, manager, resident, superAdmin, hospitalAdmin } from "./sidebarNavData";
import { useNotificationsStore, type NotificationsState } from "@/store/notificationsStore";
import useLogout from "../../../../../../hooks/useLogout";
import logger from "../../../../../../services/logger";
import Logo from "../../../../../../images/logo.png";
import Woman from "../../../../../../images/icons/Woman.png";
import Man from "../../../../../../images/icons/Man.png";

// ── Types ─────────────────────────────────────────────────────────────────────

interface NavPage {
  title:      string;
  titleKey?:  string;
  href:       string;
  disabled?:  boolean;
  count?:     boolean;
  commCount?: boolean;
  exact?:     boolean;
  icon?:      React.ReactNode;
}

interface NavGroup {
  groupTitle:     string;
  groupTitleKey?: string;
  id:             string;
  pages:          NavPage[];
}

// ── Desktop expanded nav item ─────────────────────────────────────────────────

const NavItem = ({
  p, isActive, notifications, onSelect,
}: {
  p: NavPage; isActive: boolean; notifications: NotificationsState | undefined; onSelect: (title: string) => void;
}) => {
  const { commUnreadCount } = useNotificationsStore();
  const { t } = useTranslation();
  const totalCount = (notifications?.count ?? 0) + (p.commCount !== false ? commUnreadCount : 0);
  const label = p.titleKey ? t(p.titleKey, p.title) : p.title;

  return (
    <Box sx={{ position: "relative", mx: "14px", my: "2px" }}>
      {isActive && (
        <Box sx={{
          position: "absolute", left: -14, top: 8, bottom: 8,
          width: 3, borderRadius: 1.5, bgcolor: "primary.main",
        }} />
      )}
      <Button
        fullWidth disabled={p.disabled} onClick={() => onSelect(p.title)} startIcon={p.icon || null}
        sx={{
          justifyContent: "flex-start", textAlign: "left", textTransform: "uppercase",
          fontSize: 11.5, fontWeight: isActive ? 600 : 500, letterSpacing: "0.08em",
          color: isActive ? "primary.main" : "text.secondary",
          bgcolor: isActive ? "custom.primarySofter" : "transparent",
          borderRadius: "10px", py: "9px", px: "12px", minHeight: 0,
          "&:hover": {
            bgcolor: isActive ? "custom.primarySofter" : "action.hover",
            color: isActive ? "primary.main" : "text.primary",
          },
          "& .MuiButton-startIcon": { color: isActive ? "primary.main" : "text.disabled", mr: 1.5 },
        }}
      >
        <Box sx={{ flex: 1, textAlign: "left" }}>{label}</Box>
        {p.count && totalCount > 0 && (
          <Box sx={{
            ml: 1, bgcolor: "primary.main", color: "white", borderRadius: "10px",
            px: "6px", py: "1px", fontSize: 10, fontWeight: 700, lineHeight: 1.6,
            minWidth: 18, textAlign: "center", flexShrink: 0,
          }}>
            {totalCount > 9 ? "9+" : totalCount}
          </Box>
        )}
      </Button>
    </Box>
  );
};

// ── Desktop nav group ─────────────────────────────────────────────────────────

const NavGroupComponent = ({
  item, isActiveHref, notifications, onSelect,
}: {
  item: NavGroup; isActiveHref: (href: string, exact?: boolean) => boolean;
  notifications: NotificationsState | undefined; onSelect: (title: string) => void;
}) => {
  const { t } = useTranslation();
  const groupLabel = item.groupTitleKey ? t(item.groupTitleKey, item.groupTitle) : item.groupTitle;
  return (
    <Box mb={2} mt={1.75}>
      <Typography variant="overline" sx={{
        display: "block", px: "22px", pb: "8px",
        fontSize: 10.5, letterSpacing: "0.14em", fontWeight: 600,
        color: "text.disabled", lineHeight: 1.4,
      }}>
        {groupLabel}
      </Typography>
      {item.pages.map((p, i) => (
        <NavLink to={p.href} style={linkTextSx} key={i} disabled={p.disabled}>
          <NavItem p={p} isActive={isActiveHref(p.href, p.exact)} notifications={notifications} onSelect={onSelect} />
        </NavLink>
      ))}
    </Box>
  );
};

// ── Desktop mini (collapsed) nav item ─────────────────────────────────────────

const MiniNavItem = ({
  p, isActive, notifications, onSelect,
}: {
  p: NavPage; isActive: boolean; notifications: NotificationsState | undefined; onSelect: (title: string) => void;
}) => {
  const { commUnreadCount } = useNotificationsStore();
  const { t } = useTranslation();
  const totalCount = (notifications?.count ?? 0) + (p.commCount !== false ? commUnreadCount : 0);
  const label = p.titleKey ? t(p.titleKey, p.title) : p.title;
  const iconEl = p.count
    ? <Badge badgeContent={totalCount} max={9} color="primary">{p.icon}</Badge>
    : p.icon;

  return (
    <Tooltip title={label} placement="right" arrow disableInteractive>
      <span style={{ display: "block" }}>
        <NavLink to={p.href} style={{ display: "flex", justifyContent: "center" }} disabled={p.disabled}>
          <IconButton
            size="small" disabled={p.disabled}
            onClick={() => onSelect(p.title)} aria-label={label}
            sx={{
              width: 40, height: 40,
              color: isActive ? "primary.main" : "text.disabled",
              bgcolor: isActive ? "custom.primarySofter" : "transparent",
              "&:hover": { bgcolor: isActive ? "custom.primarySofter" : "action.hover" },
            }}
          >
            {iconEl}
          </IconButton>
        </NavLink>
      </span>
    </Tooltip>
  );
};

// ── Mobile nav item (Variant D — logged-in) ───────────────────────────────────

const MobileNavItem = ({
  p, isActive, notifications, onSelect,
}: {
  p: NavPage; isActive: boolean; notifications: NotificationsState | undefined; onSelect: (title: string) => void;
}) => {
  const { commUnreadCount } = useNotificationsStore();
  const { t } = useTranslation();
  const totalCount = (notifications?.count ?? 0) + (p.commCount !== false ? commUnreadCount : 0);
  const label = p.titleKey ? t(p.titleKey, p.title) : p.title;

  return (
    <Box sx={{ position: "relative", my: "2px" }}>
      {isActive && (
        <Box sx={{
          position: "absolute", left: -14, top: 8, bottom: 8,
          width: 3, borderRadius: "3px", bgcolor: "primary.main",
        }} />
      )}
      <Box
        component={p.disabled ? "span" : "button"}
        onClick={p.disabled ? undefined : () => onSelect(p.title)}
        sx={{
          width: "100%", display: "flex", alignItems: "center", gap: "12px",
          padding: "13px 10px", borderRadius: "10px",
          border: 0, bgcolor: isActive ? "custom.primarySofter" : "transparent",
          color: isActive ? "primary.main" : "text.primary",
          cursor: p.disabled ? "default" : "pointer",
          fontFamily: "inherit", textAlign: "left",
          transition: "background .12s",
          "&:hover": { bgcolor: isActive ? "custom.primarySofter" : "action.hover" },
        }}
      >
        <Box sx={{
          width: 26, height: 26, display: "flex", alignItems: "center",
          justifyContent: "center", color: isActive ? "primary.main" : "text.disabled", flexShrink: 0,
        }}>
          {p.icon}
        </Box>
        <Typography sx={{ fontSize: 16, fontWeight: 600, letterSpacing: "-.01em", color: "inherit", flex: 1 }}>
          {label}
        </Typography>
        {p.count && totalCount > 0 && (
          <Box sx={{
            fontFamily: "'IBM Plex Mono', ui-monospace, monospace", fontSize: 10,
            px: "6px", py: "2px", borderRadius: "999px",
            bgcolor: "#fbe8c9", color: "#7a5b15", letterSpacing: ".04em", flexShrink: 0,
          }}>
            {totalCount > 9 ? "9+" : totalCount}
          </Box>
        )}
      </Box>
    </Box>
  );
};

// ── Mobile nav group (Variant D — logged-in) ──────────────────────────────────

const MobileNavGroup = ({
  item, isActiveHref, notifications, onSelect,
}: {
  item: NavGroup; isActiveHref: (href: string, exact?: boolean) => boolean;
  notifications: NotificationsState | undefined; onSelect: (title: string) => void;
}) => {
  const { t } = useTranslation();
  const groupLabel = item.groupTitleKey ? t(item.groupTitleKey, item.groupTitle) : item.groupTitle;
  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: "10px", pt: "14px", pb: "8px" }}>
        <Typography sx={{
          fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
          fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase",
          color: "text.disabled", flexShrink: 0, whiteSpace: "nowrap",
        }}>
          {groupLabel}
        </Typography>
        <Box sx={{ flex: 1, height: "1px", bgcolor: "divider" }} />
      </Box>
      {item.pages.map((p, i) => (
        <NavLink to={p.href} style={linkTextSx} key={i} disabled={p.disabled}>
          <MobileNavItem
            p={p} isActive={isActiveHref(p.href, p.exact)}
            notifications={notifications} onSelect={onSelect}
          />
        </NavLink>
      ))}
    </Box>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

interface SidebarNavProps {
  onClose:        () => void;
  selected:       unknown;
  handleSelected: (title: string) => void;
  collapsed?:     boolean;
}

const SidebarNav = ({ onClose, selected, handleSelected, collapsed = false }: SidebarNavProps) => {
  const theme = useTheme();
  const isMd  = useMediaQuery(theme.breakpoints.up("md"), { defaultMatches: true });
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const logout   = useLogout();
  const { t, i18n } = useTranslation();

  const handleLogout = async () => {
    onClose();
    logger.clearUser();
    await logout();
    navigate("/login");
  };

  const [menu, setMenu] = useState<NavGroup[]>([]);
  const [accountActionsOpen, setAccountActionsOpen] = useState(false);
  const { notifications } = useNotificationContext();
  const { commUnreadCount } = useNotificationsStore();
  const { authentication } = useAuth();

  const totalBellCount = (notifications?.count ?? 0) + commUnreadCount;

  const isActiveHref = useCallback(
    (href: string, exact?: boolean) => {
      if (exact) return pathname === href;
      return pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
    },
    [pathname]
  );

  const handleSelect = useCallback(
    (title: string) => { onClose(); handleSelected(title); },
    [onClose, handleSelected]
  );

  useEffect(() => {
    if (authentication?.role === "manager") {
      const managerMenu = authentication.canCreateYear
        ? manager
        : manager.map((g) => ({ ...g, pages: g.pages.filter((p) => p.href !== "/manager/year") }));
      setMenu(authentication.hospitalName ? [...managerMenu, ...hospitalAdmin] : managerMenu);
    } else if (authentication?.role === "hospital_admin") setMenu(hospitalAdmin);
    else if (authentication?.role === "resident")         setMenu(resident);
    else if (authentication?.role === "super_admin")      setMenu(superAdmin);
  }, [authentication?.role, authentication?.hospitalName, authentication?.canCreateYear]);

  // ── Desktop logo header ───────────────────────────────────────────────────

  const logoHeader = collapsed ? (
    <Box display="flex" alignItems="center" justifyContent="center"
      sx={{ height: { xs: 58, sm: 66, md: 71 }, flexShrink: 0 }}>
      <Box component="img" sx={{ height: 28 }} alt="Logo Medatwork" src={Logo} />
    </Box>
  ) : (
    <Box display="flex" alignItems="center" gap={1.5}
      sx={{ height: { xs: 58, sm: 66, md: 71 }, px: "22px", flexShrink: 0 }}>
      <Box component="img" sx={{ height: 28 }} alt="Logo Medatwork" src={Logo} />
      <Typography fontWeight={800} fontSize={14} letterSpacing=".06em" color="text.primary">
        MED<Box component="span" sx={{ color: "primary.main" }}>@</Box>WORK
      </Typography>
    </Box>
  );

  // ── Desktop mini (collapsed) render ──────────────────────────────────────

  if (collapsed && authentication.isAuthenticated) {
    return (
      <Box display="flex" flexDirection="column" height="100%" sx={{ overflowX: "hidden" }}>
        {logoHeader}
        <Box flex={1} width="100%" py={1} sx={{ overflowY: "auto" }}>
          {menu.map((group, gi) => (
            <Box key={group.id}>
              {gi > 0 && <Divider sx={{ my: 0.75, mx: 1.5 }} />}
              <Box display="flex" flexDirection="column" alignItems="center" gap={0.25} py={0.25}>
                {group.pages.filter((p) => p.icon && p.href).map((p, pi) => (
                  <MiniNavItem
                    key={pi} p={p}
                    isActive={isActiveHref(p.href, p.exact)}
                    notifications={notifications}
                    onSelect={handleSelect}
                  />
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    );
  }

  // ── Mobile logged-out (Variant A — editorial hierarchy) ───────────────────

  if (!isMd && !authentication.isAuthenticated) {
    const marketingPages = noAuth.find(g => g.id === "general")?.pages ?? [];
    const signInHref     = "/login";
    const registerHref   = "/connecting";
    const langs          = ["fr", "nl", "en"] as const;
    const currentLang    = i18n.language.slice(0, 2);

    return (
      <Box display="flex" flexDirection="column" height="100%" sx={{ bgcolor: "background.paper" }}>

        {/* Header */}
        <Box sx={{
          pt: "60px", px: "22px", pb: "22px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid", borderColor: "divider",
        }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: "9px" }}>
            <Box component="img" src={Logo} alt="Logo Medatwork" sx={{ height: 28 }} />
            <Typography sx={{ fontWeight: 800, fontSize: 14, letterSpacing: ".04em", color: "text.primary" }}>
              MED<Box component="span" sx={{ color: "primary.main" }}>@</Box>WORK
            </Typography>
          </Box>
          <Box
            component="button"
            onClick={onClose}
            aria-label="Fermer le menu"
            sx={{
              width: 34, height: 34, borderRadius: "10px",
              border: "1px solid", borderColor: "divider",
              bgcolor: "transparent", color: "text.primary",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </Box>
        </Box>

        {/* Navigation */}
        <Box sx={{ flex: 1, px: "22px", pt: "4px", overflowY: "auto" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, pt: "14px", pb: "12px" }}>
            <Typography sx={{
              fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
              fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "text.disabled",
            }}>
              {t("nav.groups.general", "Explorer")}
            </Typography>
            <Box sx={{ flex: 1, height: "1px", bgcolor: "divider" }} />
          </Box>

          {marketingPages.map((p, i) => {
            const label = p.titleKey ? t(p.titleKey, p.title) : p.title;
            return (
              <NavLink to={p.href} style={linkTextSx} key={i}>
                <Box
                  onClick={() => { onClose(); handleSelected(p.title); }}
                  sx={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    py: "15px", px: "4px", cursor: "pointer",
                    borderBottom: "1px solid", borderColor: "divider",
                  }}
                >
                  <Typography sx={{ fontSize: 16, fontWeight: 600, letterSpacing: "-.01em", color: "text.primary" }}>
                    {label}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Typography sx={{
                      fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                      fontSize: 11, color: "text.disabled",
                    }}>
                      {String(i + 1).padStart(2, "0")}
                    </Typography>
                    <Typography sx={{ color: "primary.main", fontSize: 16, lineHeight: 1 }}>→</Typography>
                  </Box>
                </Box>
              </NavLink>
            );
          })}

          {/* Language pills */}
          <Box sx={{ display: "flex", gap: "6px", mt: "22px", mb: "16px" }}>
            {langs.map(l => (
              <Box
                key={l}
                component="button"
                onClick={() => i18n.changeLanguage(l)}
                sx={{
                  fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                  fontSize: 11, px: "10px", py: "6px", borderRadius: "999px",
                  border: "1px solid",
                  borderColor: currentLang === l ? "text.primary" : "divider",
                  bgcolor: currentLang === l ? "text.primary" : "transparent",
                  color: currentLang === l ? "background.paper" : "text.disabled",
                  cursor: "pointer", letterSpacing: ".1em", textTransform: "uppercase",
                  transition: "all .12s",
                }}
              >
                {l.toUpperCase()}
              </Box>
            ))}
          </Box>
        </Box>

        {/* CTA Stack */}
        <Box sx={{
          px: "22px", pb: "26px", pt: "18px",
          borderTop: "1px solid", borderColor: "divider",
          display: "flex", flexDirection: "column", gap: "10px",
        }}>
          <Box
            component={NavLink}
            to={signInHref}
            onClick={onClose}
            sx={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
              width: "100%", py: "16px", borderRadius: "12px",
              bgcolor: "primary.main", color: "#fff",
              fontWeight: 700, fontSize: 15, textDecoration: "none", fontFamily: "inherit",
            }}
          >
            {t("nav.signIn", "Se connecter")} →
          </Box>
          <Box
            component={NavLink}
            to={registerHref}
            onClick={onClose}
            sx={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: "100%", py: "16px", borderRadius: "12px",
              bgcolor: "transparent", color: "text.primary",
              fontWeight: 600, fontSize: 14, textDecoration: "none", fontFamily: "inherit",
              border: "1px solid", borderColor: "divider",
            }}
          >
            {t("nav.register", "Créer un compte")}
          </Box>
          <Typography sx={{
            fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
            fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase",
            color: "text.disabled", textAlign: "center", pt: "6px",
          }}>
            support@medwork.be
          </Typography>
        </Box>
      </Box>
    );
  }

  // ── Mobile logged-in (Variant D — identité d'abord) ──────────────────────

  if (!isMd && authentication.isAuthenticated) {
    const initials = [authentication.firstname?.[0], authentication.lastname?.[0]]
      .filter(Boolean).join("").toUpperCase();

    const roleLabel = [
      authentication.role === "manager"       ? "Manager"
        : authentication.role === "resident"  ? "MACCS"
        : authentication.role === "hospital_admin" ? "Admin"
        : "Super Admin",
      authentication.hospitalName,
    ].filter(Boolean).join(" · ");

    // First notification-type page for bell navigation
    const notifHref = menu.flatMap(g => g.pages).find(p => p.count)?.href;

    return (
      <Box display="flex" flexDirection="column" height="100%">

        {/* ── Profile header (gradient violet) ── */}
        <Box sx={{
          pt: "56px", px: "22px", pb: "22px", flexShrink: 0,
          background: `linear-gradient(165deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: "#fff",
        }}>

          {/* Top row: logo + [bell, close] */}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: "16px" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: "9px" }}>
              <Box sx={{
                width: 28, height: 28, borderRadius: "8px",
                bgcolor: "rgba(255,255,255,.18)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Box component="img" src={Logo} alt="" sx={{ width: 18, height: 18, objectFit: "contain", filter: "brightness(0) invert(1)" }} />
              </Box>
              <Typography sx={{ fontWeight: 800, fontSize: 14, letterSpacing: ".04em", color: "#fff" }}>
                MED<Box component="span" sx={{ color: "rgba(255,255,255,.65)" }}>@</Box>WORK
              </Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {/* Notification bell */}
              <Box
                component="button"
                onClick={() => { if (notifHref) { navigate(notifHref); } onClose(); }}
                sx={{
                  width: 32, height: 32, borderRadius: "10px",
                  bgcolor: "rgba(255,255,255,.14)", border: 0, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", position: "relative",
                }}
              >
                <NotificationsNoneIcon sx={{ fontSize: 18 }} />
                {totalBellCount > 0 && (
                  <Box sx={{
                    position: "absolute", top: 5, right: 6,
                    width: 7, height: 7, borderRadius: "50%",
                    bgcolor: "#d4a017", border: "1.5px solid rgba(107,49,146,1)",
                  }} />
                )}
              </Box>

              {/* Close button */}
              <Box
                component="button"
                onClick={onClose}
                aria-label="Fermer le menu"
                sx={{
                  width: 32, height: 32, borderRadius: "10px",
                  bgcolor: "rgba(255,255,255,.14)", border: 0, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <CloseIcon sx={{ fontSize: 18 }} />
              </Box>
            </Box>
          </Box>

          {/* Profile row: avatar + name/role + toggle */}
          <Box sx={{ display: "flex", alignItems: "center", gap: "14px" }}>
            {/* Avatar */}
            <Box sx={{
              width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
              bgcolor: "#f5e9c4", border: "2px solid rgba(255,255,255,.6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden",
            }}>
              {authentication.avatarUrl ? (
                <Box component="img" src={authentication.avatarUrl} alt="" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : initials ? (
                <Typography sx={{ fontWeight: 800, fontSize: 18, color: theme.palette.primary.dark, letterSpacing: ".04em" }}>
                  {initials}
                </Typography>
              ) : (
                <Box component="img"
                  src={authentication.gender === "male" ? Man : Woman} alt=""
                  sx={{ width: 40, height: 40, objectFit: "contain" }}
                />
              )}
            </Box>

            {/* Name & role */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 18, letterSpacing: "-.01em", color: "#fff", lineHeight: 1.2 }}>
                {authentication.firstname} {authentication.lastname}
              </Typography>
              <Typography sx={{
                fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                fontSize: 10.5, letterSpacing: ".14em", textTransform: "uppercase",
                color: "rgba(255,255,255,.7)", mt: "4px",
              }}>
                {roleLabel}
              </Typography>
            </Box>

            {/* Toggle chevron */}
            <Box
              component="button"
              onClick={() => setAccountActionsOpen(v => !v)}
              sx={{
                width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                bgcolor: accountActionsOpen ? "rgba(255,255,255,.26)" : "rgba(255,255,255,.14)",
                border: "1px solid rgba(255,255,255,.18)", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", transition: "background .2s",
              }}
            >
              <ExpandMoreIcon sx={{
                fontSize: 18,
                transform: accountActionsOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform .42s cubic-bezier(.4,0,.2,1)",
              }} />
            </Box>
          </Box>

          {/* Collapsible actions panel */}
          <Collapse in={accountActionsOpen} timeout={420}>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1, mt: 2 }}>

              {/* Préférences */}
              <Box
                component="button"
                onClick={() => { onClose(); navigate("/profile/settings"); }}
                sx={{
                  bgcolor: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.16)",
                  borderRadius: "12px", py: "10px", px: "6px",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
                  color: "#fff", cursor: "pointer", fontFamily: "inherit",
                }}
              >
                <Box sx={{ width: 26, height: 26, borderRadius: "8px", bgcolor: "rgba(255,255,255,.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <TuneIcon sx={{ fontSize: 16 }} />
                </Box>
                <Typography sx={{ fontSize: 10.5, fontWeight: 600, letterSpacing: ".04em", color: "#fff", lineHeight: 1.2, textAlign: "center" }}>
                  {t("topbar.preferences", "Préférences")}
                </Typography>
              </Box>

              {/* Paramètres */}
              <Box
                component="button"
                onClick={() => { onClose(); navigate("/profile/settings"); }}
                sx={{
                  bgcolor: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.16)",
                  borderRadius: "12px", py: "10px", px: "6px",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
                  color: "#fff", cursor: "pointer", fontFamily: "inherit",
                }}
              >
                <Box sx={{ width: 26, height: 26, borderRadius: "8px", bgcolor: "rgba(255,255,255,.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <SettingsIcon sx={{ fontSize: 16 }} />
                </Box>
                <Typography sx={{ fontSize: 10.5, fontWeight: 600, letterSpacing: ".04em", color: "#fff", lineHeight: 1.2, textAlign: "center" }}>
                  Paramètres
                </Typography>
              </Box>

              {/* Déconnexion */}
              <Box
                component="button"
                onClick={handleLogout}
                sx={{
                  bgcolor: "rgba(252,200,200,.18)", border: "1px solid rgba(255,255,255,.16)",
                  borderRadius: "12px", py: "10px", px: "6px",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
                  color: "#fff", cursor: "pointer", fontFamily: "inherit",
                }}
              >
                <Box sx={{ width: 26, height: 26, borderRadius: "8px", bgcolor: "rgba(255,255,255,.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <LogoutIcon sx={{ fontSize: 16 }} />
                </Box>
                <Typography sx={{ fontSize: 10.5, fontWeight: 600, letterSpacing: ".04em", color: "#fff", lineHeight: 1.2, textAlign: "center" }}>
                  {t("topbar.logout", "Déconnexion")}
                </Typography>
              </Box>
            </Box>
          </Collapse>
        </Box>

        {/* ── Navigation ── */}
        <Box sx={{ flex: 1, overflowY: "auto", px: "14px", pb: "6px", bgcolor: "background.paper" }}>
          {menu.map((item, i) => (
            <MobileNavGroup
              key={i} item={item}
              isActiveHref={isActiveHref}
              notifications={notifications}
              onSelect={handleSelect}
            />
          ))}
        </Box>
      </Box>
    );
  }

  // ── Desktop expanded render ───────────────────────────────────────────────

  return (
    <Box display="flex" flexDirection="column" height="100%">
      {logoHeader}
      <Box
        display="flex" flexDirection="column" justifyContent="space-between"
        flex={1}
        sx={{ py: "22px", overflowY: "auto" }}
      >
        <Box>
          {authentication.isAuthenticated && menu.map((item, i) => (
            <NavGroupComponent
              key={i} item={item}
              isActiveHref={isActiveHref}
              notifications={notifications}
              onSelect={handleSelect}
            />
          ))}

          {!authentication.isAuthenticated && noAuth.map((item, i) => (
            <NavGroupComponent
              key={i} item={item}
              isActiveHref={isActiveHref}
              notifications={notifications}
              onSelect={handleSelect}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default SidebarNav;
