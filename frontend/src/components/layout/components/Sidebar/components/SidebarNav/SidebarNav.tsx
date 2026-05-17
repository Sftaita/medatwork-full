import { useEffect, useState, useCallback } from "react";
import { NavLink, useLocation } from "react-router-dom";
import useAuth from "../../../../../../hooks/useAuth";
import useNotificationContext from "../../../../../../hooks/useNotificationContext";

// Material UI
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Avatar from "@mui/material/Avatar";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import Badge from "@mui/material/Badge";

import { linkTextSx, noAuth, manager, resident, superAdmin, hospitalAdmin } from "./sidebarNavData";
import { useNotificationsStore, type NotificationsState } from "@/store/notificationsStore";
import Logo from "../../../../../../images/logo.png";

// ── Types ─────────────────────────────────────────────────────────────────────

interface NavPage {
  title:    string;
  href:     string;
  disabled?: boolean;
  count?:   boolean;
  icon?:    React.ReactNode;
}

interface NavGroup {
  groupTitle: string;
  id:         string;
  pages:      NavPage[];
}

// ── Expanded nav item ─────────────────────────────────────────────────────────
// Reproduit exactement le pattern du design :
//   container: margin 2px 14px, position relative
//   indicateur actif: position absolute, left -14px (= bord gauche sidebar)
//   bouton: pleine largeur, padding 9px 12px, borderRadius 10

const NavItem = ({
  p,
  isActive,
  notifications,
  onSelect,
}: {
  p:             NavPage;
  isActive:      boolean;
  notifications: NotificationsState | undefined;
  onSelect:      (title: string) => void;
}) => {
  const { commUnreadCount } = useNotificationsStore();
  const totalCount = (notifications?.count ?? 0) + commUnreadCount;

  const inner = (
    <Box sx={{ position: "relative", mx: "14px", my: "2px" }}>
      {/* Barre indicatrice active — absolue à gauche de la sidebar */}
      {isActive && (
        <Box
          sx={{
            position: "absolute",
            left:   -14,   // compense le margin left de 14px → flush bord sidebar
            top:      8,
            bottom:   8,
            width:    3,
            borderRadius: 1.5,
            bgcolor: "primary.main",
          }}
        />
      )}

      <Button
        fullWidth
        disabled={p.disabled}
        onClick={() => onSelect(p.title)}
        startIcon={p.icon || null}
        sx={{
          justifyContent: "flex-start",
          textAlign: "left",
          textTransform: "uppercase",
          fontSize: 11.5,
          fontWeight: isActive ? 600 : 500,
          letterSpacing: "0.08em",
          color: isActive ? "primary.main" : "text.secondary",
          bgcolor: isActive ? "custom.primarySofter" : "transparent",
          borderRadius: "10px",
          py: "9px",
          px: "12px",
          minHeight: 0,
          "&:hover": {
            bgcolor: isActive ? "custom.primarySofter" : "action.hover",
            color:   isActive ? "primary.main" : "text.primary",
          },
          "& .MuiButton-startIcon": {
            color: isActive ? "primary.main" : "text.disabled",
            mr: 1.5,
          },
        }}
      >
        {p.title}
      </Button>
    </Box>
  );

  return p.count ? (
    <Badge badgeContent={totalCount} max={9} color="primary" sx={{ display: "block" }}>
      {inner}
    </Badge>
  ) : inner;
};

// ── Expanded group ────────────────────────────────────────────────────────────

const NavGroupComponent = ({
  item,
  isActiveHref,
  notifications,
  onSelect,
}: {
  item:         NavGroup;
  isActiveHref: (href: string) => boolean;
  notifications: NotificationsState | undefined;
  onSelect:     (title: string) => void;
}) => (
  <Box mb={2} mt={1.75}>
    {/* Titre de groupe — 22px horizontal, petit, gris discret */}
    <Typography
      variant="overline"
      sx={{
        display: "block",
        px: "22px",
        pb: "8px",
        fontSize: 10.5,
        letterSpacing: "0.14em",
        fontWeight: 600,
        color: "text.disabled",
        lineHeight: 1.4,
      }}
    >
      {item.groupTitle}
    </Typography>

    {item.pages.map((p, i) => (
      <NavLink to={p.href} style={linkTextSx} key={i} disabled={p.disabled}>
        <NavItem
          p={p}
          isActive={isActiveHref(p.href)}
          notifications={notifications}
          onSelect={onSelect}
        />
      </NavLink>
    ))}
  </Box>
);

// ── Mini (collapsed) nav item ─────────────────────────────────────────────────

const MiniNavItem = ({
  p,
  isActive,
  notifications,
  onSelect,
}: {
  p:             NavPage;
  isActive:      boolean;
  notifications: NotificationsState | undefined;
  onSelect:      (title: string) => void;
}) => {
  const { commUnreadCount } = useNotificationsStore();
  const totalCount = (notifications?.count ?? 0) + commUnreadCount;

  const iconEl = p.count ? (
    <Badge badgeContent={totalCount} max={9} color="primary">{p.icon}</Badge>
  ) : p.icon;

  return (
    <Tooltip title={p.title} placement="right" arrow disableInteractive>
      <span style={{ display: "block" }}>
        <NavLink to={p.href} style={{ display: "flex", justifyContent: "center" }} disabled={p.disabled}>
          <IconButton
            size="small"
            disabled={p.disabled}
            onClick={() => onSelect(p.title)}
            aria-label={p.title}
            sx={{
              width: 40, height: 40,
              color:  isActive ? "primary.main" : "text.disabled",
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

// ── Main component ────────────────────────────────────────────────────────────

interface SidebarNavProps {
  onClose:        () => void;
  selected:       unknown;
  handleSelected: (title: string) => void;
  collapsed?:     boolean;
}

const SidebarNav = ({ onClose, selected, handleSelected, collapsed = false }: SidebarNavProps) => {
  const theme  = useTheme();
  const isMd   = useMediaQuery(theme.breakpoints.up("md"), { defaultMatches: true });
  const { pathname } = useLocation();
  const [menu, setMenu] = useState<NavGroup[]>([]);
  const { notifications } = useNotificationContext();
  const { authentication } = useAuth();

  const isActiveHref = useCallback(
    (href: string) => pathname === href || (href !== "/" && pathname.startsWith(href + "/")),
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

  // ── En-tête logo commun ───────────────────────────────────────────────────

  const logoHeader = collapsed ? (
    <Box
      display="flex" alignItems="center" justifyContent="center"
      sx={{ height: { xs: 58, sm: 66, md: 71 }, flexShrink: 0 }}
    >
      <Box component="img" sx={{ height: 28 }} alt="Logo Medatwork" src={Logo} />
    </Box>
  ) : (
    <Box
      display="flex" alignItems="center" gap={1.5}
      sx={{ height: { xs: 58, sm: 66, md: 71 }, px: "22px", flexShrink: 0 }}
    >
      <Box component="img" sx={{ height: 28 }} alt="Logo Medatwork" src={Logo} />
      <Typography fontWeight={800} fontSize={14} letterSpacing=".06em" color="primary.main">
        MED<span style={{ opacity: 0.55, margin: "0 1px" }}>@</span>WORK
      </Typography>
    </Box>
  );

  // ── Mini (collapsed) render ───────────────────────────────────────────────

  if (collapsed && authentication.isAuthenticated) {
    return (
      <Box display="flex" flexDirection="column" height="100%"
        sx={{ overflowX: "hidden" }}>
        {logoHeader}
        <Box flex={1} width="100%" py={1} sx={{ overflowY: "auto" }}>
          {menu.map((group, gi) => (
            <Box key={group.id}>
              {gi > 0 && <Divider sx={{ my: 0.75, mx: 1.5 }} />}
              <Box display="flex" flexDirection="column" alignItems="center" gap={0.25} py={0.25}>
                {group.pages.filter((p) => p.icon && p.href).map((p, pi) => (
                  <MiniNavItem
                    key={pi} p={p}
                    isActive={isActiveHref(p.href)}
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

  // ── Expanded render ───────────────────────────────────────────────────────

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

        {!isMd && authentication.isAuthenticated && (
          <Stack sx={{ display: "flex", flexDirection: "row", justifyContent: "center", mb: "4vh" }}>
            <Avatar sx={{ width: 50, height: 50, bgcolor: "primary.main" }}>
              {authentication.firstname?.charAt(0)}{authentication.lastname?.charAt(0)}
            </Avatar>
          </Stack>
        )}
      </Box>
    </Box>
  );
};

export default SidebarNav;
