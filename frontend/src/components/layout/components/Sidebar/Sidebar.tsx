import Drawer from "@mui/material/Drawer";
import { useTheme } from "@mui/material/styles";
import { SidebarNav } from "./components";
import useAuth from "../../../../hooks/useAuth";

export const MINI_WIDTH     = 64;
export const EXPANDED_WIDTH = 240;   // 240px — fidèle au design

interface SidebarProps {
  open:       boolean;
  variant:    "permanent" | "temporary";
  onClose:    () => void;
  collapsed?: boolean;
}

const Sidebar = ({ open, variant, onClose, collapsed = false }: SidebarProps) => {
  const theme = useTheme();
  const { selectedMenuItem, setSelectedMenuItem } = useAuth();

  const width = collapsed ? MINI_WIDTH : EXPANDED_WIDTH;

  return (
    <Drawer
      anchor="left"
      onClose={() => onClose()}
      open={open}
      variant={variant}
      sx={{
        "& .MuiPaper-root": {
          width,
          overflow:   "hidden",
          top:        0,
          height:     "100%",
          zIndex:     1000,   // au-dessus de l'AppBar (999) pour que le logo recouvre la zone topbar
          transition: theme.transitions.create("width"),
        },
      }}
    >
      <SidebarNav
        onClose={() => onClose()}
        selected={selectedMenuItem}
        handleSelected={(title) => setSelectedMenuItem(title)}
        collapsed={collapsed}
      />
    </Drawer>
  );
};

export default Sidebar;
