import { useEffect, useState, useCallback } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import useAuth from "../../../../../../hooks/useAuth";
import useLogout from "../../../../../../hooks/useLogout";
import useNotificationContext from "../../../../../../hooks/useNotificationContext";

// Material UI
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Avatar from "@mui/material/Avatar";
import Stack from "@mui/material/Stack";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import Badge from "@mui/material/Badge";

// Nav data — kept in a separate file to avoid bloating this component
import { linkTextSx, noAuth, manager, resident, superAdmin, hospitalAdmin } from "./sidebarNavData";
import { useNotificationsStore, type NotificationsState } from "@/store/notificationsStore";

interface NavPage {
  title: string;
  href: string;
  disabled?: boolean;
  count?: boolean;
  icon?: React.ReactNode;
}

interface NavGroup {
  groupTitle: string;
  id: string;
  pages: NavPage[];
}

interface NavItemProps {
  p: NavPage;
  selected: unknown;
  notifications: NotificationsState | undefined;
  onSelect: (title: string) => void;
}

const NavItem = ({ p, selected, notifications, onSelect }: NavItemProps) => {
  const btn = (
    <Button
      fullWidth
      disabled={p.disabled}
      sx={{ justifyContent: "flex-start", textAlign: "left", color: selected === p.title ? "" : "text.primary" }}
      startIcon={p.icon || null}
      onClick={() => onSelect(p.title)}
    >
      {p.title}
    </Button>
  );

  const { commUnreadCount } = useNotificationsStore();
  const totalCount = (notifications?.count ?? 0) + commUnreadCount;

  return (
    <Box marginBottom={1 / 2}>
      {p.count ? (
        <Badge badgeContent={totalCount} max={9} color="primary">
          {btn}
        </Badge>
      ) : (
        btn
      )}
    </Box>
  );
};

interface NavGroupProps {
  item: NavGroup;
  selected: unknown;
  notifications: NotificationsState | undefined;
  onSelect: (title: string) => void;
}

const NavGroupComponent = ({ item, selected, notifications, onSelect }: NavGroupProps) => (
  <Box marginBottom={3}>
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ fontWeight: 700, textTransform: "uppercase", marginBottom: 1, display: "block" }}
    >
      {item.groupTitle}
    </Typography>
    <Box>
      {item.pages.map((p, i) => (
        <NavLink to={p.href} style={linkTextSx} key={i} disabled={p.disabled}>
          <NavItem p={p} selected={selected} notifications={notifications} onSelect={onSelect} />
        </NavLink>
      ))}
    </Box>
  </Box>
);

interface SidebarNavProps {
  onClose: () => void;
  selected: unknown;
  handleSelected: (title: string) => void;
}

const SidebarNav = ({ onClose, selected, handleSelected }: SidebarNavProps) => {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), { defaultMatches: true });
  const navigate = useNavigate();
  const [menu, setMenu] = useState<NavGroup[]>([]);
  const { notifications } = useNotificationContext();
  const { authentication } = useAuth();
  const logout = useLogout();

  const handleLogout = useCallback(async () => {
    await logout();
    navigate("/login");
  }, [logout, navigate]);

  const handleSelect = useCallback(
    (title: string) => {
      onClose();
      handleSelected(title);
    },
    [onClose, handleSelected]
  );

  useEffect(() => {
    if (authentication?.role === "manager") {
      if (authentication.hospitalName) {
        setMenu([...manager, ...hospitalAdmin]);
      } else {
        setMenu(manager);
      }
    } else if (authentication?.role === "hospital_admin") setMenu(hospitalAdmin);
    else if (authentication?.role === "resident") setMenu(resident);
    else if (authentication?.role === "super_admin") setMenu(superAdmin);
  }, [authentication?.role, authentication?.hospitalName]);

  return (
    <Box display="flex" flexDirection="column" justifyContent="space-between" height="100%">
      <Box padding={2}>
        {authentication.isAuthenticated &&
          menu.map((item, i) => (
            <NavGroupComponent
              key={i}
              item={item}
              selected={selected}
              notifications={notifications}
              onSelect={handleSelect}
            />
          ))}

        {!authentication.isAuthenticated &&
          noAuth.map((item, i) => (
            <NavGroupComponent
              key={i}
              item={item}
              selected={selected}
              notifications={notifications}
              onSelect={handleSelect}
            />
          ))}

        {authentication.isAuthenticated && (
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={handleLogout}
            startIcon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={20}
                height={20}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
            }
          >
            Se déconnecter
          </Button>
        )}
      </Box>

      {!isMd && authentication.isAuthenticated && (
        <Box>
          <Stack
            sx={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              marginBottom: "4vh",
            }}
          >
            <Avatar sx={{ width: 50, height: 50, bgcolor: theme.palette.primary.main }}>
              {authentication.firstname &&
                authentication.firstname.charAt(0) + authentication.lastname.charAt(0)}
            </Avatar>
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default SidebarNav;
