import { create } from "zustand";
import type { Notification } from "@/types/entities";

export interface NotificationsState {
  count: number;
  notifications: Notification[];
}

interface NotificationsStore {
  notifications: NotificationsState;
  setNotifications: (state: NotificationsState) => void;
  commUnreadCount: number;
  setCommUnreadCount: (count: number) => void;
}

const INITIAL: NotificationsState = { count: 0, notifications: [] };

export const useNotificationsStore = create<NotificationsStore>((set) => ({
  notifications: INITIAL,
  setNotifications: (state) => set({ notifications: state }),
  commUnreadCount: 0,
  setCommUnreadCount: (count) => set({ commUnreadCount: count }),
}));
