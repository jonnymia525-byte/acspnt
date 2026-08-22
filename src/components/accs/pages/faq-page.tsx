"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useStore } from "@/store";

interface FaqItem { q: string; a: string; }

const DEFAULT_FAQS: FaqItem[] = [
  { q: "How do I buy?", a: "Browse listings, click Buy, confirm your order. Accounts are delivered instantly." },
  { q: "How do I deposit?", a: "Dashboard > Deposit. Select USDT network (TRC20/BEP20/ERC20), send exact amount. Verified automatically." },
  { q: "Return policy?", a: "Open a dispute within 48 hours if the account is invalid. Admin team reviews within 24h." },
  { q: "Payment methods?", a: "USDT (TRC20, BEP20, ERC20). More crypto options coming soon." },
  { q: "How to become a seller?", a: "Click Become a Seller, fill details, describe products. Reviewed within 24-48h." },
  { q: "Commission?", a: "Platform commission on all sales. Check Settings for current rate." },
  { q: "Withdrawal processing?", a: "Crypto 5-60 min. PayPal 24-48h. Bank 3-5 business days." },
  { q: "Account disabled after purchase?", a: "Open a dispute within 48h with evidence. Refund or replacement arranged." },
  { q: "Coupons?", a: "Enter code at checkout. Percentage or fixed amount. Min order may apply." },
  { q: "How does 2FA work?", a: "Enable in dashboard. TOTP authenticator app. 10 backup codes provided." },
  { q: "Supported platforms?", a: "14 platforms: Instagram, Facebook, Telegram, X, TikTok, LinkedIn, Gmail, Outlook, Discord, Reddit, YouTube, Pinterest, Snapchat." },
  { q: "Vendor ratings?", a: "After purchase, leave 1-5 star review. Vendors below 3.0 may be suspended." },
];

export function FAQPage() {
  const { user } = useStore();
  const [faqs, setFaqs] = useState<FaqItem[]>(DEFAULT_FAQS);
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/page-content?page=faq").then(r => r.json()).then(d => {
      if (d.content?.items?.length) setFaqs(d.content.items);
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
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>FAQ</h1>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {faqs.map((f, i) => (
            <details key={i} className="panel" open={openIdx === i} onClick={(e) => {
              const target = e.currentTarget;
              setOpenIdx(target.open ? i : null);
            }}>
              <summary style={{ padding: "10px 14px", fontSize: 14, fontWeight: 500, cursor: "pointer", listStyle: "none" }}>{f.q}</summary>
              <div style={{ padding: "0 14px 12px", fontSize: 13, color: "#666", lineHeight: 1.5 }}>{f.a}</div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
