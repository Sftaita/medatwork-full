import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "react-toastify";

/**
 * Detects an available PWA update and shows a toast the user can click to apply it.
 * Works only in production (VitePWA does not register the SW in dev by default).
 */
export function usePwaUpdate() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    if (!needRefresh) return;
    toast.info("Nouvelle version disponible — cliquez pour mettre à jour.", {
      toastId: "pwa-update",
      autoClose: false,
      closeOnClick: true,
      onClick: () => updateServiceWorker(true),
    });
  }, [needRefresh, updateServiceWorker]);
}
