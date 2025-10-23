import { create } from "zustand";

export type User = { id: string; name: string; email?: string };

type AuthState = {
  token: string | null;
  user: User | null;
  setAuth: (t: string, u: User) => void;
  clearAuth: () => void;
};

export const useAuth = create<AuthState>((set) => ({
  token: typeof localStorage !== "undefined" ? localStorage.getItem("auth:token") : null,
  user: typeof localStorage !== "undefined" ? JSON.parse(localStorage.getItem("auth:user") || "null") : null,
  setAuth: (token, user) => {
    try {
      localStorage.setItem("auth:token", token);
      localStorage.setItem("auth:user", JSON.stringify(user));
    } catch {}
    set({ token, user });
  },
  clearAuth: () => {
    try {
      localStorage.removeItem("auth:token");
      localStorage.removeItem("auth:user");
    } catch {}
    set({ token: null, user: null });
  },
}));
