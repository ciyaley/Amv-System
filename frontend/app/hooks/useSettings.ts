// frontend/app/hooks/useSettings.ts
import { create } from "zustand";

export type SettingsTab = "general" | "appearance" | "account";

interface SettingsState {
  activeTab: SettingsTab;
  setTab: (tab: SettingsTab) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  activeTab: "general",
  setTab: (tab) => set({ activeTab: tab }),
}));