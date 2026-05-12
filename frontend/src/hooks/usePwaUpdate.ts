import { useRegisterSW } from "virtual:pwa-register/react";

/**
 * Detects an available PWA update and exposes the state to the caller.
 * The caller (App.tsx) renders the <UpdateBanner> — not this hook.
 *
 * Works only in production (VitePWA does not register the SW in dev by default).
 * skipWaiting + clientsClaim are enabled in vite.config.js so the new SW
 * is ready immediately after deployment.
 */
export function usePwaUpdate() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  return { needRefresh, updateServiceWorker };
}
