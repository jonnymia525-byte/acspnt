"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useStore } from "@/store";

interface TermItem { t: string; d: string; }

const DEFAULT_TERMS: TermItem[] = [
  { t: "Account Authenticity", d: "All accounts must be legitimately obtained. Stolen accounts result in permanent ban." },
  { t: "Commission", d: "Platform commission on all sales. Store price calculated accordingly." },
  { t: "Listing Standards", d: "Inaccurate listings removed after first warning. Repeated violations = suspension." },
  { t: "Delivery", d: "Accounts delivered in login:password:email:email_pass format automatically." },
  { t: "Dispute Response", d: "Sellers must respond to disputes within 48 hours." },
  { t: "Ratings", d: "Maintain minimum 3.0 star rating. Below threshold for 30 days = suspension." },
  { t: "Withdrawals", d: "24-hour holding period on withdrawals. Fees deducted per method." },
  { t: "Prohibited Content", d: "No adult content, illegal products, or prohibited region accounts." },
  { t: "Suspension", d: "Account suspension for policy violations. 7-day appeal window." },
  { t: "Agreement", d: "By applying you agree to these terms. Terms may be updated with notice." },
];

export function SellerTermsPage() {
  const { user } = useStore();
  const [terms, setTerms] = useState<TermItem[]>(DEFAULT_TERMS);

  useEffect(() => {
    fetch("/api/page-content?page=seller_terms").then(r => r.json()).then(d => {
      if (d.content?.items?.length) setTerms(d.content.items);
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
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>Seller Terms</h1>
        <div className="panel">
          <ol style={{ padding: "12px 14px 12px 30px", margin: 0 }}>
            {terms.map((t, i) => (
              <li key={i} style={{ fontSize: 13, color: "#555", lineHeight: 1.6, marginBottom: 6 }}>
                <strong>{t.t}:</strong> {t.d}
              </li>
            ))}
          </ol>
        </div>
        <Link href="/?page=login" className="btn btn-primary" style={{ marginTop: 12, display: "inline-block", textDecoration: "none" }}>Apply as Seller</Link>
      </div>
    </div>
  );
}
