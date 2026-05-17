/**
 * Détecte les erreurs de chargement de chunk JS après un nouveau déploiement.
 *
 * Après un déploiement, les anciens chunks (hachés) sont remplacés. Un utilisateur
 * avec l'ancienne version en cache peut tenter de charger un module inexistant.
 * On recharge la page une seule fois (sessionStorage) pour forcer la nouvelle version.
 */

export const CHUNK_RELOAD_KEY = "chunk_reload_attempt";

export function isChunkLoadError(message: string): boolean {
  return (
    message.includes("Importing a module script failed") ||
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Unable to preload CSS")
  );
}

export function handleChunkLoadError(
  event: ErrorEvent,
  storage: Pick<Storage, "getItem" | "setItem"> = sessionStorage
): void {
  const msg = event.message ?? "";
  if (!isChunkLoadError(msg)) return;

  const alreadyRetried = storage.getItem(CHUNK_RELOAD_KEY) === "1";
  if (!alreadyRetried) {
    storage.setItem(CHUNK_RELOAD_KEY, "1");
    window.location.reload();
  }
}

export function registerChunkErrorHandler(
  storage: Pick<Storage, "getItem" | "setItem"> = sessionStorage
): void {
  window.addEventListener("error", (event) => handleChunkLoadError(event, storage));
}
