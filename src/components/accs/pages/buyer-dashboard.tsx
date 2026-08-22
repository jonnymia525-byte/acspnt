"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useStore } from "@/store";
import { money } from "@/lib/money";

interface Data {
  user: { id: string; username: string; name: string; role: string; balance: number; twoFaEnabled: boolean };
  stats: { balance: number; orders: number; units: number; spent: number; openDisputes: number };
  purchases: Array<{ id: string; quantity: number; total: number; accounts: string; status: string; createdAt: string; product: { title: string; platform: string } }>;
  disputes: Array<{ id: string; reason: string; status: string; resolution?: string; createdAt: string }>;
  notifications: Array<{ id: string; title: string; message: string; read: boolean; createdAt: string }>;
  deposits: Array<{ id: string; amount: number; method: string; status: string; createdAt: string }>;
}

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "purchases", label: "Purchases" },
  { key: "deposits", label: "Deposits" },
  { key: "disputes", label: "Disputes" },
  { key: "notifications", label: "Notifications" },
];

export function BuyerDashboard() {
  const { setUser } = useStore();
  const [tab, setTab] = useState("overview");
  const [data, setData] = useState<Data | null>(null);
  const [showDeposit, setShowDeposit] = useState(false);
  const [depAmount, setDepAmount] = useState("");
  const [depMethod, setDepMethod] = useState("crypto");
  const [depositing, setDepositing] = useState(false);

  const refresh = () => fetch("/api/dashboard/buyer").then(r => r.json()).then(d => { if (d.user) { setData(d); setUser(d.user); } }).catch(() => {});

  useEffect(() => { refresh(); }, [setUser]);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(depAmount);
    if (amt < 5) { alert("Minimum deposit is $5"); return; }
    setDepositing(true);
    const res = await fetch("/api/deposits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: amt, method: depMethod }) });
    const r = await res.json();
    setDepositing(false);
    if (r.success) { alert(`Deposited $${amt}. New balance: $${r.balance}`); setShowDeposit(false); setDepAmount(""); refresh(); } else alert(r.error);
  };

  if (!data) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f5" }}>Loading...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      {/* Top Bar */}
      <div className="topbar">
        <div className="news-link"><span className="news-dot" /> News</div>
        <Link href="/" style={{ color: "#fff", fontSize: 12, padding: "4px 12px", background: "#3ea136", borderRadius: 3, textDecoration: "none", fontWeight: 600 }}>Store</Link>
        <button onClick={() => setShowDeposit(true)} style={{ color: "#fff", fontSize: 12, padding: "4px 12px", background: "#5fa830", border: "none", borderRadius: 3, cursor: "pointer", fontWeight: 600 }}>Deposit</button>
        <span style={{ color: "#5fa830", fontSize: 12, fontWeight: 700 }}>{money(data.user.balance)}</span>
        <span style={{ color: "#888", fontSize: 11 }}>{data.user.name}</span>
        <Link href="/" style={{ color: "#aaa", fontSize: 11 }}>Logout</Link>
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

      {/* Main Content */}
      <div className="wrap" style={{ paddingTop: 16, paddingBottom: 16 }}>
        {/* Mobile Tabs */}
        <div className="show-mobile" style={{ width: "100%", gap: 4, padding: "0 0 12px", overflowX: "auto" }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`btn btn-sm ${tab === t.key ? "btn-primary" : "btn-secondary"}`}>{t.label}</button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          {/* Sidebar */}
          <div className="side hide-mobile">
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #333" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{data.user.name}</div>
              <div style={{ fontSize: 11, color: "#666" }}>Buyer</div>
              <div style={{ marginTop: 8, fontSize: 18, fontWeight: 700, color: "#5fa830" }}>{money(data.user.balance)}</div>
            </div>
            {TABS.map(t => (
              <div key={t.key} className={`side-item ${tab === t.key ? "on" : ""}`} onClick={() => setTab(t.key)}>
                {t.label}
                {t.key === "disputes" && data.stats.openDisputes > 0 && <span className="dot">{data.stats.openDisputes}</span>}
              </div>
            ))}
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {tab === "overview" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 16 }}>
                  {[{ l: "Balance", v: money(data.stats.balance), c: "#3ea136" }, { l: "Orders", v: data.stats.orders, c: "#333" }, { l: "Units", v: data.stats.units, c: "#333" }, { l: "Spent", v: money(data.stats.spent), c: "#333" }].map(s => (
                    <div key={s.l} className="stat">
                      <div className="num" style={{ color: s.c }}>{s.v}</div>
                      <div className="lbl">{s.l}</div>
                    </div>
                  ))}
                </div>
                <div className="panel">
                  <div className="panel-head">Recent Purchases</div>
                  {data.purchases.length === 0 ? <div style={{ padding: 20, color: "#888", fontSize: 13, textAlign: "center" }}>No purchases yet</div> : data.purchases.slice(0, 5).map(p => (
                    <div key={p.id} className="row">
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{p.product.title}</div>
                        <div style={{ fontSize: 11, color: "#888" }}>{new Date(p.createdAt).toLocaleDateString()}</div>
                      </div>
                      <span style={{ fontWeight: 700, color: "#3ea136" }}>{money(p.total)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {tab === "purchases" && (
              <div className="panel">
                <div className="panel-head">My Purchases ({data.purchases.length})</div>
                {data.purchases.length === 0 ? <div style={{ padding: 20, color: "#888", fontSize: 13, textAlign: "center" }}>No purchases yet</div> : data.purchases.map(p => (
                  <div key={p.id} style={{ padding: 12, borderBottom: "1px solid #f0f0f0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{p.product.title}</div>
                        <div style={{ fontSize: 11, color: "#888" }}>{new Date(p.createdAt).toLocaleDateString()} · {p.product.platform}</div>
                      </div>
                      <span style={{ fontWeight: 700, color: "#3ea136" }}>{money(p.total)}</span>
                    </div>
                    {p.accounts && <pre style={{ fontSize: 11, background: "#f9f9f9", padding: 8, borderRadius: 4, fontFamily: "monospace", overflowX: "auto", whiteSpace: "pre-wrap" }}>{p.accounts}</pre>}
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      <span className={`badge badge-${p.status}`}>{p.status}</span>
                      {p.status === "completed" && (
                        <button className="btn btn-danger btn-sm" onClick={() => { const r = prompt("Dispute reason:"); if (r) fetch("/api/disputes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ purchaseId: p.id, reason: r }) }).then(() => refresh()); }}>Open Dispute</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === "deposits" && (
              <>
                <div className="panel" style={{ marginBottom: 16 }}>
                  <div className="panel-head">Deposit History ({data.deposits.length})</div>
                  {data.deposits.length === 0 ? <div style={{ padding: 20, color: "#888", fontSize: 13, textAlign: "center" }}>No deposits yet</div> : data.deposits.map(d => (
                    <div key={d.id} className="row">
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>Deposit via {d.method}</div>
                        <div style={{ fontSize: 11, color: "#888" }}>{new Date(d.createdAt).toLocaleDateString()}</div>
                      </div>
                      <span style={{ fontWeight: 700, color: "#3ea136" }}>+{money(d.amount)}</span>
                      <span className={`badge badge-${d.status}`}>{d.status}</span>
                    </div>
                  ))}
                </div>
                <div className="panel">
                  <div className="panel-head">Quick Deposit</div>
                  <div style={{ padding: 16 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
                      {[10, 25, 50, 100].map(amt => (
                        <button key={amt} onClick={() => { setDepAmount(String(amt)); setShowDeposit(true); }}
                          className="btn btn-primary" style={{ fontSize: 13, padding: "10px 0" }}>
                          ${amt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {tab === "disputes" && (
              <div className="panel">
                <div className="panel-head">Disputes</div>
                {data.disputes.length === 0 ? <div style={{ padding: 20, color: "#888", fontSize: 13, textAlign: "center" }}>No disputes</div> : data.disputes.map(d => (
                  <div key={d.id} className="row">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13 }}>{d.reason}</div>
                      <div style={{ fontSize: 11, color: "#888" }}>{new Date(d.createdAt).toLocaleDateString()}</div>
                    </div>
                    <span className={`badge badge-${d.status}`}>{d.status}</span>
                  </div>
                ))}
              </div>
            )}

            {tab === "notifications" && (
              <div className="panel">
                <div className="panel-head">Notifications</div>
                {data.notifications.length === 0 ? <div style={{ padding: 20, color: "#888", fontSize: 13, textAlign: "center" }}>No notifications</div> : data.notifications.map(n => (
                  <div key={n.id} className="row">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{n.title}</div>
                      <div style={{ fontSize: 11, color: "#888" }}>{n.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Deposit Modal */}
      {showDeposit && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setShowDeposit(false)}>
          <div style={{ background: "#fff", borderRadius: 6, width: 360, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #eee", fontWeight: 600, fontSize: 15 }}>Deposit Funds</div>
            <form onSubmit={handleDeposit} style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label className="label">Method</label>
                <select value={depMethod} onChange={e => setDepMethod(e.target.value)} className="input">
                  <option value="crypto">Crypto (USDT/BTC/ETH)</option>
                  <option value="paypal">PayPal</option>
                  <option value="stripe">Stripe (Card)</option>
                  <option value="manual">Manual Transfer</option>
                </select>
              </div>
              <div>
                <label className="label">Amount ($)</label>
                <input type="number" step="0.01" min="5" value={depAmount} onChange={e => setDepAmount(e.target.value)} className="input" required placeholder="5.00" />
                <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>Minimum deposit: $5.00</div>
              </div>
              <div style={{ fontSize: 12, color: "#888" }}>Current balance: <strong style={{ color: "#3ea136" }}>{money(data.user.balance)}</strong></div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => setShowDeposit(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={depositing}>{depositing ? "Processing..." : "Deposit"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
