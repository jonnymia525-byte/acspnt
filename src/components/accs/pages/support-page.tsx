"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/store";

export function SupportPage() {
  const { user } = useStore();
  const [sent, setSent] = useState(false);
  const [cat, setCat] = useState("general");
  const [priority, setPriority] = useState("normal");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

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
            <Link href="/?page=login" style={{ color: "#fff", fontSize: 12, padding: "4px 12px", background: "#3ea136", borderRadius: 3, textDecoration: "none", fontWeight: 600 }}>Login</Link>
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
      <div className="wrap" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
          <Link href="/" style={{ fontSize: 14, color: "#5fa830", textDecoration: "none" }}>&larr; Back to Store</Link>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>Support</h1>

        {/* Contact Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginBottom: 24 }}>
          {[{ l: "Email", v: "support@accspoint.com" }, { l: "Telegram", v: "@accspoint_support" }, { l: "WhatsApp", v: "+1-555-0123" }, { l: "Hours", v: "24/7" }].map(c => (
            <div key={c.l} className="panel" style={{ padding: 12, textAlign: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{c.l}</div>
              <div style={{ fontSize: 11, color: "#888" }}>{c.v}</div>
            </div>
          ))}
        </div>

        {/* Submit Ticket */}
        <div className="panel">
          <div className="panel-head">Submit Ticket</div>
          {sent ? (
            <div style={{ padding: 32, textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Ticket Submitted</div>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>We will respond within 24 hours.</div>
              <button className="btn btn-primary" onClick={() => { setSent(false); setSubject(""); setMessage(""); }}>Submit Another</button>
            </div>
          ) : (
            <form onSubmit={e => { e.preventDefault(); setSent(true); }} style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Dropdowns stack on mobile, side by side on desktop */}
              <div className="support-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <label className="label">Category</label>
                  <select className="input" value={cat} onChange={e => setCat(e.target.value)}>
                    {["general", "purchase", "deposit", "dispute", "vendor", "withdrawal", "account", "bug"].map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Priority</label>
                  <select className="input" value={priority} onChange={e => setPriority(e.target.value)}>
                    {["low", "normal", "high", "urgent"].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Subject</label>
                <input type="text" className="input" placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} required />
              </div>
              <div>
                <label className="label">Message</label>
                <textarea className="input" rows={4} placeholder="Describe your issue..." value={message} onChange={e => setMessage(e.target.value)} required style={{ resize: "vertical" }} />
              </div>
              <button type="submit" className="btn btn-primary">Submit</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
