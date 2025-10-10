import { create } from "zustand";

type UIState = {
  userId: string | null;
  setUser: (id: string) => void;
};

export const useUI = create<UIState>((set) => ({
  userId: "demo-user",
  setUser: (id) => set({ userId: id })
}));
