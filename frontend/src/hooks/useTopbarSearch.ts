import { useEffect } from "react";
import { useSearchStore } from "../store/searchStore";

/**
 * Branche la page sur le champ de recherche de la topbar.
 * Retourne la valeur de recherche courante.
 *
 * Usage :
 *   const search = useTopbarSearch("Titre, résident, manager…");
 */
export function useTopbarSearch(placeholder: string): string {
  const { register, unregister, value } = useSearchStore();

  useEffect(() => {
    register(placeholder);
    return () => unregister();
  }, [placeholder]);

  return value;
}
