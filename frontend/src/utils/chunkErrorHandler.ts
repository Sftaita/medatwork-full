/**
 * Détecte les erreurs de chargement de chunk JS après un nouveau déploiement.
 *
 * Après un déploiement, les anciens chunks (hachés) sont remplacés. Un utilisateur
 * avec l'ancienne version en cache peut tenter de charger un module inexistant.
 * On recharge la page une seule fois (sessionStorage) pour forcer la nouvelle version.
 */

export const CHUNK_RELOAD_KEY = "chunk_reload_attempt";

export function isChunkLoadError(error: unknown): boolean {
  let msg: string;
  if (error instanceof Error) {
    // Include the error name so "ChunkLoadError" is matched even when the
    // message alone says "Loading chunk X failed."
    msg = `${error.name} ${error.message}`;
  } else if (typeof error === "string") {
    msg = error;
  } else {
    msg = String(error ?? "");
  }
  return (
    msg.includes("Importing a module script failed") ||
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("error loading dynamically imported module") ||
    msg.includes("Unable to preload CSS") ||
    msg.includes("Loading chunk") ||
    msg.includes("ChunkLoadError")
  );
}

export function handleChunkLoadError(
  event: ErrorEvent,
  storage: Pick<Storage, "getItem" | "setItem"> = sessionStorage
): void {
  const msg = event.message ?? "";
  if (!isChunkLoadError(msg)) return;

  try {
    if (storage.getItem(CHUNK_RELOAD_KEY) === "1") return;
    storage.setItem(CHUNK_RELOAD_KEY, "1");
  } catch {
    // Storage unavailable (SecurityError, QuotaExceededError) — skip reload
    // to avoid an unguarded infinite-reload loop.
    return;
  }
  window.location.reload();
}

export function registerChunkErrorHandler(
  storage: Pick<Storage, "getItem" | "setItem"> = sessionStorage
): void {
  window.addEventListener("error", (event) => handleChunkLoadError(event, storage));
}
