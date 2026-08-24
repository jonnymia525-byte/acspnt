"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useStore } from "@/store";
import { money } from "@/lib/money";
<<<<<<< ours
import { ProfileSettings } from "../widgets/profile-settings";
=======
import { NoticeBar } from "@/components/accs/widgets/notice-bar";
import { toast, Toaster } from "@/components/accs/widgets/toast";
>>>>>>> theirs


interface Data {
  user: { id: string; username: string; name: string; email: string; role: string; balance: number; twoFaEnabled: boolean };
  stats: { balance: number; orders: number; units: number; spent: number; openDisputes: number };
  purchases: Array<{ id: string; quantity: number; total: number; accounts: string; status: string; createdAt: string; product: { title: string; platform: string } }>;
  disputes: Array<{ id: string; reason: string; status: string; resolution?: string; refundAmount?: number; createdAt: string; purchase?: { total: number; product: { title: string; platform: string } } | null }>;
  notifications: Array<{ id: string; title: string; message: string; read: boolean; createdAt: string }>;
  deposits: Array<{ id: string; amount: number; method: string; status: string; createdAt: string }>;
<<<<<<< ours
  loginHistory: Array<{ id: string; action: string; description: string; ip?: string; country?: string; city?: string; createdAt: string }>;
=======
  pendingDepositAmount?: number;
>>>>>>> theirs
}

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "purchases", label: "Purchases" },
  { key: "deposits", label: "Deposits" },
  { key: "disputes", label: "Disputes" },
  { key: "notifications", label: "Notifications" },
  { key: "login-history", label: "Login History" },
  { key: "settings", label: "Settings" },
];

export function BuyerDashboard() {
<<<<<<< ours
  const { setUser } = useStore();
  const [tab, setTab] = useState('overview');
=======
  const { setUser, theme, toggleTheme } = useStore();
  const [tab, setTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('tab') || 'overview';
    }
    return 'overview';
  });
>>>>>>> theirs
  const [data, setData] = useState<Data | null>(null);

  const [reportId, setReportId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [purchaseSearch, setPurchaseSearch] = useState("");

  const refresh = () => fetch("/api/dashboard/buyer").then(r => r.json()).then(d => { if (d.user) { setData(d); setUser(d.user); } }).catch(() => {});

<<<<<<< ours
  useEffect(() => { refresh(); }, []);
=======
  const confirmReceived = async (purchaseId: string) => {
    const res = await fetch("/api/purchases/receive", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ purchaseId }) });
    const r = await res.json();
    if (r.success) { toast("Delivery confirmed", "success"); refresh(); }
    else toast(r.error || "Failed", "error");
  };

  useEffect(() => { refresh(); }, [setUser]);
>>>>>>> theirs

  useEffect(() => {
    if (tab === "notifications") {
      fetch("/api/notifications?markRead=all").catch(() => {});
    }
  }, [tab]);

  if (!data) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f5" }}>Loading...</div>;

  const purchase = data.purchases.find(x => x.id === reportId);
  const visiblePurchases = data.purchases.filter(p => !purchaseSearch || p.product.title.toLowerCase().includes(purchaseSearch.toLowerCase()) || p.product.platform.toLowerCase().includes(purchaseSearch.toLowerCase()));

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      <Toaster />
      {/* Top Bar */}
      <div className="topbar">
        <div className="news-link"><span className="news-dot" /> News</div>
        <Link href="/" style={{ color: "#fff", fontSize: 12, padding: "4px 12px", background: "#3ea136", borderRadius: 3, textDecoration: "none", fontWeight: 600 }}>Store</Link>
        <Link href="/?page=deposit" style={{ color: "#fff", fontSize: 12, padding: "4px 12px", background: "#5fa830", border: "none", borderRadius: 3, cursor: "pointer", fontWeight: 600, textDecoration: "none" }}>Deposit</Link>
        <span style={{ color: "#5fa830", fontSize: 12, fontWeight: 700 }}>{money(data.user.balance)}</span>
        {(data.pendingDepositAmount || 0) > 0 && (
          <span style={{ color: "#ff9800", fontSize: 11 }}>(+{money(data.pendingDepositAmount)} pending)</span>
        )}
        <span style={{ color: "#888", fontSize: 11 }}>{data.user.name}</span>
        <button onClick={toggleTheme} style={{ background: "none", border: "1px solid #555", color: "#bbb", borderRadius: 3, padding: "2px 8px", fontSize: 11, cursor: "pointer" }}>{theme === "dark" ? "☀️ Light" : "🌙 Dark"}</button>
        <Link href="/" style={{ color: "#aaa", fontSize: 11 }}>Logout</Link>
      </div>

      <NoticeBar />

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

        {/* Horizontal Tabs Bar (desktop) */}
        <div className="side hide-mobile" style={{ marginBottom: 16 }}>
          <span className="side-label">{data.user.name}</span>
          {TABS.map(t => (
            <div key={t.key} className={`side-item ${tab === t.key ? "on" : ""}`} onClick={() => setTab(t.key)}>
              {t.label}
              {t.key === "disputes" && data.stats.openDisputes > 0 && <span className="dot">{data.stats.openDisputes}</span>}
            </div>
          ))}
        </div>

        {/* Content */}
        <div style={{ minWidth: 0 }}>
            {tab === "overview" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 16 }}>
                  {[{ l: "Balance", v: money(data.stats.balance), c: "#3ea136", tab: "deposits" }, { l: "Orders", v: data.stats.orders, c: "#333", tab: "purchases" }, { l: "Units", v: data.stats.units, c: "#333", tab: "purchases" }, { l: "Spent", v: money(data.stats.spent), c: "#333", tab: "purchases" }].map(s => (
                    <div key={s.l} className="stat" onClick={() => setTab(s.tab)} style={{ cursor: "pointer" }}>
                      <div className="num" style={{ color: s.c }}>{s.v}</div>
                      <div className="lbl" style={{ textDecoration: "underline", color: "#1a73e8" }}>{s.l} →</div>
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
              <>
                <div className="panel" style={{ marginBottom: 12 }}>
                  <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <span>My Purchases ({data.purchases.length})</span>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input type="text" placeholder="Search purchases..." value={purchaseSearch} onChange={e => setPurchaseSearch(e.target.value)} className="input" style={{ maxWidth: 260, marginBottom: 10 }} />
                      {data.purchases.length > 0 && (
                        <button className="btn btn-secondary btn-sm" onClick={() => {
                          const header = "ID,Product,Platform,Quantity,Total,Status,Accounts,Created\n";
                          const rows = data.purchases.map(p =>
                            `${p.id},"${p.product.title.replace(/"/g, '""')}",${p.product.platform},${p.quantity},${p.total},${p.status},"${(p.accounts || "").replace(/"/g, '""')}",${new Date(p.createdAt).toISOString()}`
                          ).join("\n");
                          const blob = new Blob([header + rows], { type: "text/csv" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url; a.download = `purchases_${new Date().toISOString().slice(0,10)}.csv`; a.click();
                          URL.revokeObjectURL(url);
                        }}>Download CSV</button>
                      )}
                    </div>
                  </div>
                  {visiblePurchases.length === 0 ? <div style={{ padding: 20, color: "#888", fontSize: 13, textAlign: "center" }}>No purchases yet</div> : visiblePurchases.map(p => (
                    <div key={p.id} style={{ padding: 16, borderBottom: "1px solid #f0f0f0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>{p.product.title}</div>
                          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{new Date(p.createdAt).toLocaleDateString()} · {p.product.platform} · Qty: {p.quantity}</div>
                        </div>
                        <span style={{ fontSize: 16, fontWeight: 700, color: "#3ea136" }}>{money(p.total)}</span>
                      </div>
                      {p.accounts && (
                        <pre style={{ fontSize: 11, background: "#f9f9f9", padding: 8, borderRadius: 4, fontFamily: "monospace", overflowX: "auto", whiteSpace: "pre-wrap", marginBottom: 8 }}>{p.accounts}</pre>
                      )}
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span className={`badge badge-${p.status}`}>{p.status}</span>
                        <button className="btn btn-secondary btn-sm" onClick={async () => { try { await navigator.clipboard.writeText(p.accounts || ""); toast("Credentials copied!", "success"); } catch { toast("Copy failed", "error"); } }}>Copy Credentials</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => {
                          const line = `ID,Product,Platform,Quantity,Total,Status,Accounts,Created\n` +
                            `${p.id},"${p.product.title.replace(/"/g, '""')}",${p.product.platform},${p.quantity},${p.total},${p.status},"${(p.accounts || "").replace(/"/g, '""')}",${new Date(p.createdAt).toISOString()}`;
                          const blob = new Blob([line], { type: "text/csv" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url; a.download = `${p.product.title.replace(/[^a-zA-Z0-9]/g, "_")}.csv`; a.click();
                          URL.revokeObjectURL(url);
                        }}>CSV</button>
                        {p.status === "completed" && (
                          <button className="btn btn-secondary btn-sm" onClick={() => confirmReceived(p.id)}>Received</button>
                        )}
                        {p.status === "delivered" && (
                          <span className="badge" style={{ background: "#e8f5e9", color: "#3ea136", fontWeight: 600 }}>Delivered ✓</span>
                        )}
                        {p.status === "completed" && (
                          new Date(p.createdAt).getTime() > Date.now() - 48 * 60 * 60 * 1000 ? (
                            <button className="btn btn-danger btn-sm" style={{ background: "#dc3545", color: "#fff", border: "none", padding: "5px 12px", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer" }} onClick={() => { setReportId(p.id); setReportReason(""); }}>Report</button>
                          ) : (
                            <button className="btn btn-secondary btn-sm" onClick={() => { setReportId(p.id); setReportReason(""); }}>Report</button>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {tab === "deposits" && (
              <>
                {(data.pendingDepositAmount || 0) > 0 && (
                  <div style={{ background: "#fff3cd", border: "1px solid #ffc107", color: "#856404", borderRadius: 4, padding: "8px 12px", fontSize: 12, marginBottom: 12 }}>
                    You have {money(data.pendingDepositAmount)} in pending deposits. They will be added to your balance once approved.
                  </div>
                )}
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
                        <button key={amt} onClick={() => { localStorage.setItem("accsm_deposit_amount", String(amt)); window.location.href = "/?page=deposit"; }} style={{ display: "block", fontSize: 13, padding: "10px 0", textAlign: "center", borderRadius: 4, background: "#3ea136", color: "#fff", textDecoration: "none", fontWeight: 600, border: "none", cursor: "pointer", width: "100%" }}>${amt}</button>
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
                  <div key={d.id} style={{ padding: 12, borderBottom: "1px solid #f0f0f0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        {d.purchase?.product?.title && <div style={{ fontSize: 13, fontWeight: 600 }}>{d.purchase.product.title}</div>}
                        <div style={{ fontSize: 13, marginTop: 2 }}>{d.reason}</div>
                        <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{new Date(d.createdAt).toLocaleDateString()}</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                        <span className={`badge badge-${d.status}`}>{d.status}</span>
                        {d.status === "resolved" && (d.refundAmount ?? 0) > 0 && (
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#3ea136" }}>Refunded {money(d.refundAmount)}</span>
                        )}
                      </div>
                    </div>
                    {d.resolution && (
                      <div style={{ marginTop: 6, fontSize: 12, color: "#666", background: "#f9f9f9", padding: 8, borderRadius: 4 }}>{d.resolution}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {tab === "notifications" && (
              <div className="panel">
                <div className="panel-head">Notifications</div>
                {data.notifications.length === 0 ? <div style={{ padding: 20, color: "#888", fontSize: 13, textAlign: "center" }}>No notifications</div> : data.notifications.map(n => (
                  <div key={n.id} className="row" style={{ background: n.read ? "transparent" : "#f0f8ff", opacity: n.read ? 0.7 : 1 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: n.read ? 500 : 700 }}>{n.title}{!n.read && <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#e53e3e", marginLeft: 8 }} />}</div>
                      <div style={{ fontSize: 11, color: "#888" }}>{n.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* LOGIN HISTORY */}
            {tab === "login-history" && (
              <div className="panel">
                <div className="panel-head">Login History</div>
                {!data.loginHistory || data.loginHistory.length === 0 ? (
                  <div style={{ padding: 20, color: "#888", fontSize: 13, textAlign: "center" }}>No login history</div>
                ) : (
                  data.loginHistory.map(l => (
                    <div key={l.id} className="row" style={{ padding: '10px 16px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                          {l.description}
                          {l.action === "security" && <span style={{ color: '#e53e3e', marginLeft: 6, fontSize: 11, fontWeight: 700 }}>⚠️ UNUSUAL</span>}
                        </div>
                        <div style={{ fontSize: 11, color: "#888" }}>
                          {l.ip && `IP: ${l.ip}`}
                          {l.country && ` · ${l.country}`}
                          {l.city && `, ${l.city}`}
                        </div>
                      </div>
                      <span style={{ fontSize: 10, color: "#aaa" }}>{new Date(l.createdAt).toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === "settings" && (
              <div className="panel">
                <div className="panel-head">Profile Settings</div>
                <ProfileSettings user={data.user} onUpdate={(u) => setData(d => d ? { ...d, user: { ...d.user, ...u } } : d)} />
              </div>
            )}
        </div>
      </div>

      {/* Report Modal */}
      {reportId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setReportId(null)}>
          <div style={{ background: "#fff", borderRadius: 6, width: 400, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #eee", fontWeight: 600, fontSize: 15 }}>Report Purchase</div>
            <div style={{ padding: 16 }}>
              {purchase && (
                <div style={{ background: "#f9f9f9", border: "1px solid #eee", borderRadius: 6, padding: 10, marginBottom: 12, fontSize: 12 }}>
                  <div style={{ fontWeight: 600 }}>{purchase.product.title}</div>
                  <div style={{ color: "#666", marginTop: 2 }}>{new Date(purchase.createdAt).toLocaleDateString()} · Qty: {purchase.quantity} · {money(purchase.total)}</div>
                </div>
              )}
              <div style={{ marginBottom: 12 }}>
                <label className="label">Reason</label>
                <textarea className="input" rows={4} value={reportReason} onChange={e => setReportReason(e.target.value)} placeholder="Describe the issue with this account..." />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setReportId(null)}>Cancel</button>
                <button className="btn btn-danger" style={{ flex: 1 }} disabled={!reportReason.trim()} onClick={() => {
                  fetch("/api/disputes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ purchaseId: reportId, reason: reportReason }) }).then(() => { setReportId(null); setReportReason(""); refresh(); });
                }}>Submit Report</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
