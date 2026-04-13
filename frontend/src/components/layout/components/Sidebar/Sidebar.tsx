import Drawer from "@mui/material/Drawer";
import { SidebarNav } from "./components";
import useAuth from "../../../../hooks/useAuth";

interface SidebarProps {
  open: boolean;
  variant: "permanent" | "temporary";
  onClose: () => void;
}

const Sidebar = ({ open, variant, onClose }: SidebarProps) => {
  const { selectedMenuItem, setSelectedMenuItem } = useAuth();

  return (
    <Drawer
      anchor="left"
      onClose={() => onClose()}
      open={open}
      variant={variant}
      sx={{
        "& .MuiPaper-root": {
          width: "100%",
          maxWidth: 256,
          top: { xs: 0, md: 71 },
          height: { xs: "100%", md: "calc(100% - 71px)" },
        },
      }}
    >
      <SidebarNav
        onClose={() => onClose()}
        selected={selectedMenuItem}
        handleSelected={(title) => setSelectedMenuItem(title)}
      />
    </Drawer>
  );
};

export default Sidebar;
