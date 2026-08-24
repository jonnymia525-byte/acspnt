import { create } from "zustand";

function getInitialTheme(): string {
  if (typeof window === "undefined") return "light";
  try {
    const saved = localStorage.getItem("accsm-theme");
    const next = saved === "dark" ? "dark" : "light";
    if (next === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    return next;
  } catch {
    return "light";
  }
}

export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  role: string;
  balance: number;
  vendorStatus: string;
  twoFaEnabled: boolean;
  contactMethod: string;
  contactDetail: string;
}

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
  theme: string;
  toggleTheme: () => void;
  setTheme: (t: string) => void;
  lang: string;
  setLang: (l: string) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  theme: getInitialTheme(),
  toggleTheme: () =>
    set((s) => {
      const next = s.theme === "light" ? "dark" : "light";
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", next === "dark");
        localStorage.setItem("accsm-theme", next);
      }
      return { theme: next };
    }),
  setTheme: (t) => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", t === "dark");
      localStorage.setItem("accsm-theme", t);
    }
    set({ theme: t });
  },
  lang: "en",
  setLang: (l) => {
    if (typeof document !== "undefined") {
      document.cookie = `accsm_lang=${l};path=/;max-age=${365 * 24 * 60 * 60}`;
    }
    set({ lang: l });
  },
}));
