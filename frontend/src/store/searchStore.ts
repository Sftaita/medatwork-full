import { create } from "zustand";

interface SearchStore {
  active:      boolean;
  placeholder: string;
  value:       string;
  setValue:    (v: string) => void;
  register:    (placeholder: string) => void;
  unregister:  () => void;
}

export const useSearchStore = create<SearchStore>((set) => ({
  active:      false,
  placeholder: "",
  value:       "",

  setValue: (v) => set({ value: v }),

  // Appelé par la page au mount — active le champ topbar
  register: (placeholder) => set({ active: true, placeholder, value: "" }),

  // Appelé par la page au unmount — désactive le champ topbar
  unregister: () => set({ active: false, placeholder: "", value: "" }),
}));
