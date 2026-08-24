"use client";

import { create } from "zustand";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastState {
  toasts: Toast[];
  push: (message: string, type?: ToastType) => void;
  remove: (id: number) => void;
}

let toastId = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message, type = "info") => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3500);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function toast(message: string, type: ToastType = "info") {
  useToastStore.getState().push(message, type);
}

const COLORS: Record<ToastType, { bg: string; icon: string }> = {
  success: { bg: "#2e7d32", icon: "✓" },
  error: { bg: "#c62828", icon: "✕" },
  info: { bg: "#1565c0", icon: "ℹ" },
};

export function Toaster() {
  const { toasts, remove } = useToastStore();
  return (
    <div style={{ position: "fixed", top: 12, right: 12, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, maxWidth: 320 }}>
      {toasts.map((t) => (
        <div key={t.id} style={{ background: COLORS[t.type].bg, color: "#fff", borderRadius: 6, padding: "10px 14px", fontSize: 13, boxShadow: "0 2px 12px rgba(0,0,0,0.25)", display: "flex", alignItems: "center", gap: 8, animation: "toastIn 0.2s ease" }}>
          <span style={{ fontWeight: 700 }}>{COLORS[t.type].icon}</span>
          <span style={{ flex: 1 }}>{t.message}</span>
          <button onClick={() => remove(t.id)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 15, lineHeight: 1 }}>×</button>
        </div>
      ))}
    </div>
  );
}
