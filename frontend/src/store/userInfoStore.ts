import { create } from "zustand";
import type { Sexe } from "@/types/entities";

interface UserInfo {
  firstname: string;
  lastname: string;
  dateOfBirth: string;
  university: string;
  email: string;
  sexe: Sexe | "";
  dateOfMaster: string;
  speciality: string;
}

interface UserInfoStore {
  info: UserInfo;
  setInfo: (info: UserInfo | ((prev: UserInfo) => UserInfo)) => void;
}

const INITIAL_INFO: UserInfo = {
  firstname: "",
  lastname: "",
  dateOfBirth: "",
  university: "",
  email: "",
  sexe: "",
  dateOfMaster: "",
  speciality: "",
};

export const useUserInfoStore = create<UserInfoStore>((set) => ({
  info: INITIAL_INFO,
  setInfo: (updater) =>
    set((state) => ({
      info: typeof updater === "function" ? updater(state.info) : updater,
    })),
}));
