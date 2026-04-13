import { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import GetAppIcon from "@mui/icons-material/GetApp";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Shows an "Installer" button when the browser fires the beforeinstallprompt event.
 * Disappears automatically after installation or if the user dismisses the native prompt.
 */
const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferredPrompt(null);

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!deferredPrompt) return null;

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setDeferredPrompt(null);
  };

  return (
    <Button
      variant="outlined"
      color="primary"
      size="small"
      startIcon={<GetAppIcon />}
      onClick={handleInstall}
      sx={{ mr: 1 }}
    >
      Installer
    </Button>
  );
};

export default InstallPrompt;
