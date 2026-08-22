"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useStore } from "@/store";

interface RuleItem { t: string; d: string; }

const DEFAULT_RULES: RuleItem[] = [
  { t: "Account Authenticity", d: "All accounts must be legitimate. Stolen or hacked accounts are prohibited. Violations result in permanent ban." },
  { t: "Listing Standards", d: "Titles must be accurate. Platform, category, and stock must match reality. Misleading listings will be removed." },
  { t: "Buyer Protection", d: "48-hour dispute window on all purchases. Report issues with evidence. Late disputes may not qualify." },
  { t: "Commission & Fees", d: "Platform commission on all sales. Withdrawal fees vary by method. No hidden charges." },
  { t: "Vendor Responsibilities", d: "Maintain 3.0+ star rating. Consistent quality and timely delivery required." },
  { t: "Prohibited Activities", d: "Stolen accounts, fake reviews, price manipulation are strictly prohibited. Permanent ban on violation." },
  { t: "Withdrawal Policy", d: "Min $5-$100 depending on method. Crypto 5-60 min. PayPal 24-48h. Bank 3-5 days." },
  { t: "Dispute Resolution", d: "Reviewed within 24h. Both parties contacted for evidence. Decision is final." },
];

export function RulesPage() {
  const { user } = useStore();
  const [rules, setRules] = useState<RuleItem[]>(DEFAULT_RULES);

  useEffect(() => {
    fetch("/api/page-content?page=terms").then(r => r.json()).then(d => {
      if (d.content?.items?.length) setRules(d.content.items);
    }).catch(() => {});
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      {/* Top Bar */}
      <div className="topbar">
        <div className="news-link"><span className="news-dot" /> News</div>
        {user ? (
          <>
            <Link href="/" style={{ color: "#fff", fontSize: 12, padding: "4px 12px", background: "#3ea136", borderRadius: 3, textDecoration: "none", fontWeight: 600 }}>Store</Link>
            <span style={{ color: "#5fa830", fontSize: 12, fontWeight: 700 }}>${user.balance.toFixed(2)}</span>
            <span style={{ color: "#888", fontSize: 11 }}>{user.name || user.username}</span>
            <Link href="/" style={{ color: "#aaa", fontSize: 11 }}>Logout</Link>
          </>
        ) : (
          <>
            <Link href="/?page=login" className="btn-signup">Sign Up</Link>
            <Link href="/?page=login" className="btn-login">Login</Link>
          </>
        )}
      </div>

      {/* Nav Bar */}
      <div className="navbar">
        <Link href="/?page=support" className="nav-newticket">New ticket / Ask a question</Link>
        <Link href="/" className="nav-home">Home</Link>
        <Link href="/?page=faq">FAQ</Link>
        <Link href="/?page=rules">Terms of use</Link>
      </div>

      {/* Logo + Search Bar */}
      <div style={{ background: "#f0f0f0", borderBottom: "1px solid #ddd", padding: "8px 0" }}>
        <div className="header-main">
          <Link href="/" className="logo-box">
            <span className="logo-accs">Accs</span><span className="logo-point">Point</span>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="wrap" style={{ maxWidth: 700, paddingTop: 20, paddingBottom: 40 }}>
        <div style={{ marginBottom: 16 }}>
          <Link href="/" style={{ fontSize: 14, color: "#5fa830", textDecoration: "none" }}>&larr; Back to Store</Link>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>Marketplace Rules</h1>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rules.map((r, i) => (
            <div key={i} className="panel">
              <div style={{ padding: "10px 14px", fontSize: 14, fontWeight: 600 }}>{i + 1}. {r.t}</div>
              <div style={{ padding: "0 14px 12px", fontSize: 13, color: "#666", lineHeight: 1.5 }}>{r.d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
