"use client";

import { useState, useEffect } from "react";

const NOTICE_COLORS: Record<string, string> = {
  info: "#2196f3",
  urgent: "#e53e3e",
  coupon: "#3ea136",
  goodnews: "#ff9800",
  warning: "#9c27b0",
  maintenance: "#607d8b",
};

export function NoticeBar() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem("accsm_dismissed_notices");
      return new Set<string>(raw ? JSON.parse(raw) : []);
    } catch { return new Set<string>(); }
  });

  useEffect(() => {
    fetch("/api/announcements")
      .then(r => r.json())
      .then(d => setAnnouncements(d.announcements || []))
      .catch(() => {});
  }, []);

  if (announcements.length === 0) return null;

  const dismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    localStorage.setItem("accsm_dismissed_notices", JSON.stringify(Array.from(next)));
  };

  const visible = announcements.filter(a => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "4px 0", background: "#f0f0f0" }}>
      {visible.map(a => {
        const bg = NOTICE_COLORS[a.type] || "#2196f3";
        return (
          <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", background: bg, color: "#fff", fontSize: 12, lineHeight: 1.4 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong>{a.title}</strong>
              {a.message && <span style={{ marginLeft: 8, opacity: 0.9 }}>{a.message}</span>}
            </div>
            {a.closeable !== false && (
              <button onClick={() => dismiss(a.id)} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 4, color: "#fff", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "0 6px", fontWeight: 700, flexShrink: 0 }} aria-label="Dismiss">&times;</button>
            )}
          </div>
        );
      })}
    </div>
  );
}
