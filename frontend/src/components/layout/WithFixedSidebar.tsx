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

const WithFixedSidebar = ({ children }: { children: ReactNode }) => {
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up("md"), {
    defaultMatches: true,
  });

  const { authentication } = useAuth();

  // Fetch notifications and populate the store — Topbar/Sidebar read from store directly
  useNotifications(authentication.role);
  useCommNotifications(authentication.role);

  // side bar
  const [openSidebar, setOpenSidebar] = useState(false);
  const handleSidebarOpen = () => {
    setOpenSidebar(true);
  };
  const handleSidebarClose = () => {
    setOpenSidebar(false);
  };
  const open = isMd ? false : openSidebar;

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
        />
      )}

      {!authentication.isAuthenticated && !isMd && (
        <Sidebar
          onClose={handleSidebarClose}
          open={open}
          variant={isMd ? "permanent" : "temporary"}
        />
      )}

      <main>
        <Box height={{ xs: 58, sm: 66, md: 71 }} />
        <Box
          display="flex"
          overflow="hidden"
          paddingLeft={{ md: authentication.isAuthenticated ? "256px" : "0px" }}
        >
          <Box display="flex" overflow="hidden" width="100%">
            <Box height="100%" maxWidth="100%" width="100%">
              <Box minHeight={"100vh"}>
                <FeatureErrorBoundary>{children}</FeatureErrorBoundary>
              </Box>
            </Box>
          </Box>
        </Box>

        <Box paddingLeft={{ md: authentication.isAuthenticated ? "256px" : "0px" }}>
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
