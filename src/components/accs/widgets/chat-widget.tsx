"use client";

import Link from "next/link";

import { useState, useRef, useEffect } from "react";

const FAQS = [
  { q: "How to Buy", a: "Browse listings, click Buy, confirm. Accounts delivered instantly." },
  { q: "How to Deposit", a: "Dashboard > Deposit. Crypto, PayPal, Stripe, or Manual. Min $5." },
  { q: "Return Policy", a: "Open a dispute within 48 hours if the account is invalid." },
  { q: "Payment Methods", a: "BTC, USDT, ETH, LTC, TRX, PayPal, Stripe, Bank Transfer." },
  { q: "Account Security", a: "Encrypted transactions. Escrow-based. 2FA available." },
];

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    if (open) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <>
      <div className="widget-bubble" onClick={() => setOpen(!open)}>{open ? "x" : "?"}</div>
      {open && (
        <div ref={ref} className="widget-panel">
          <div style={{ padding: 14, borderBottom: "1px solid #eee" }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Support</div>
            <div style={{ fontSize: 11, color: "#888" }}>How can we help?</div>
          </div>
          <div style={{ maxHeight: 240, overflowY: "auto", padding: 8 }}>
            {FAQS.map((f, i) => (
              <div key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <button onClick={() => setExpanded(expanded === i ? null : i)}
                  style={{ display: "flex", width: "100%", justifyContent: "space-between", padding: "8px 8px", fontSize: 13, fontWeight: 500, background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                  {f.q}
                  <span style={{ fontSize: 11 }}>{expanded === i ? "-" : "+"}</span>
                </button>
                {expanded === i && <div style={{ padding: "0 8px 8px", fontSize: 12, color: "#666" }}>{f.a}</div>}
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid #eee", padding: 8, display: "flex", gap: 8 }}>
            <Link href="/?page=support" className="btn btn-primary btn-sm" style={{ flex: 1, textAlign: "center" }}>FAQ</Link>
            <Link href="/?page=support" className="btn btn-secondary btn-sm" style={{ flex: 1, textAlign: "center" }}>Contact</Link>
          </div>
        </div>
      )}
    </>
  );
}
