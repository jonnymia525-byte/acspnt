"use client";

import { useState } from "react";

export const FAQS = [
  { q: "How to Buy", a: "Browse listings, click Buy, confirm. Accounts delivered instantly." },
  { q: "How to Deposit", a: "Dashboard > Deposit. Crypto, PayPal, Stripe, or Manual. Min $5." },
  { q: "Return Policy", a: "Open a dispute within 48 hours if the account is invalid." },
  { q: "Payment Methods", a: "BTC, USDT, ETH, LTC, TRX, PayPal, Stripe, Bank Transfer." },
  { q: "Account Security", a: "Encrypted transactions. Escrow-based. 2FA available." },
];

export function ChatFaqAccordion() {
  const [expanded, setExpanded] = useState<number | null>(null);
  return (
    <>
      {FAQS.map((f, i) => (
        <div key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
          <button
            onClick={() => setExpanded(expanded === i ? null : i)}
            style={{
              display: "flex", width: "100%", justifyContent: "space-between", padding: "8px 8px",
              fontSize: 13, fontWeight: 500, background: "none", border: "none", cursor: "pointer", textAlign: "left",
            }}
          >
            {f.q}
            <span style={{ fontSize: 11 }}>{expanded === i ? "-" : "+"}</span>
          </button>
          {expanded === i && <div style={{ padding: "0 8px 8px", fontSize: 12, color: "#666" }}>{f.a}</div>}
        </div>
      ))}
    </>
  );
}

// Kept as a no-op so existing imports keep working; the floating FAQ widget
// was merged into ChatSupport.
export function ChatWidget() {
  return null;
}
