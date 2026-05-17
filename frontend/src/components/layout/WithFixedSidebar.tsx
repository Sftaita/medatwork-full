import { useState, type ReactNode } from "react";
import useAuth from "../../hooks/useAuth";
import FeatureErrorBoundary from "../FeatureErrorBoundary";

// Material UI
import { alpha, useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import AppBar from "@mui/material/AppBar";
import Container from "../medium/Container";
import { Topbar, Sidebar, Footer } from "./components";
import useNotifications from "../../hooks/useNotifications";
import useCommNotifications from "../../hooks/useCommNotifications";
import { useSidebarStore } from "../../store/sidebarStore";

const SIDEBAR_WIDTH      = 240;   // fidèle au design
const SIDEBAR_MINI_WIDTH = 64;

const WithFixedSidebar = ({ children }: { children: ReactNode }) => {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });

  const { authentication } = useAuth();
  const { collapsed, toggle } = useSidebarStore();

  // Fetch notifications and populate the store — Topbar/Sidebar read from store directly
  useNotifications(authentication.role);
  useCommNotifications(authentication.role);

  // side bar (mobile)
  const [openSidebar, setOpenSidebar] = useState(false);
  const handleSidebarOpen  = () => setOpenSidebar(true);
  const handleSidebarClose = () => setOpenSidebar(false);
  // On desktop: always open (mini or expanded). On mobile: controlled by burger.
  const open = isMd ? true : openSidebar;

  // On desktop: sidebar always takes some space (256px expanded, 64px mini)
  const desktopPadding = isMd && authentication.isAuthenticated
    ? collapsed ? `${SIDEBAR_MINI_WIDTH}px` : `${SIDEBAR_WIDTH}px`
    : "0px";

  return (
    <Box>
      <AppBar
        position={"fixed"}
        sx={{
          backgroundColor: theme.palette.background.paper,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          zIndex: "999",
        }}
        elevation={0}
      >
        <Topbar onSidebarOpen={handleSidebarOpen} />
      </AppBar>

      {authentication.isAuthenticated && (
        <Sidebar
          onClose={handleSidebarClose}
          open={open}
          variant={isMd ? "permanent" : "temporary"}
          collapsed={isMd && collapsed}
        />
      )}

      {!authentication.isAuthenticated && !isMd && (
        <Sidebar
          onClose={handleSidebarClose}
          open={open}
          variant={"temporary"}
          collapsed={false}
        />
      )}

      <main>
        <Box height={{ xs: 58, sm: 66, md: 71 }} />
        <Box
          display="flex"
          overflow="hidden"
          sx={{
            paddingLeft: { md: desktopPadding },
            transition: theme.transitions.create("padding-left"),
          }}
        >
          <Box display="flex" overflow="hidden" width="100%">
            <Box height="100%" maxWidth="100%" width="100%">
              <Box minHeight={"100vh"}>
                <FeatureErrorBoundary>{children}</FeatureErrorBoundary>
              </Box>
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            paddingLeft: { md: desktopPadding },
            transition: theme.transitions.create("padding-left"),
          }}
        >
          <Divider />
          <Box paddingX={{ xs: 2, md: 4 }} paddingY={{ xs: 0, md: 2 }}>
            <Footer />
          </Box>
        </Box>
      </main>
    </Box>
  );
};

export default WithFixedSidebar;
