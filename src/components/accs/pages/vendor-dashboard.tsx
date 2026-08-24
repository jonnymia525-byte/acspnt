"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useStore } from "@/store";
import { money, calcStorePrice } from "@/lib/money";
import { platformLabel } from "@/lib/totp";
import { ProfileSettings } from "../widgets/profile-settings";

interface Data {
  user: { id: string; username: string; name: string; email: string; role: string; balance: number; vendorStatus: string; twoFaEnabled: boolean };
  stats: { balance: number; totalRevenue: number; totalUnits: number; totalProducts: number; activeProducts: number; avgRating: number; pendingProducts: number; pendingWithdrawals: number; lowStockCount: number; totalAccountsInStock: number; accountsSold: number; pendingApprovalAccounts: number; liveAccounts: number };
  products: Array<{ id: string; title: string; platform: string; category: string; vendorPrice: number; storePrice: number; stock: number; status: string }>;
  sales: Array<{ id: string; quantity: number; total: number; createdAt: string; product: { title: string }; buyer: { username: string } }>;
  withdrawals: Array<{ id: string; amount: number; netAmount: number; fee: number; method: string; status: string; createdAt: string }>;
  deposits: Array<{ id: string; amount: number; method: string; status: string; createdAt: string }>;
  stockAlerts: { lowStock: Array<{ id: string; title: string; stock: number }>; outOfStock: Array<{ id: string; title: string }> };
  loginHistory: Array<{ id: string; action: string; description: string; ip?: string; country?: string; city?: string; createdAt: string }>;
}

const PLATFORMS = ["instagram","facebook","telegram","x","tiktok","linkedin","gmail","outlook","discord","reddit","youtube","pinterest","snapchat"];
const CATEGORIES = ["fresh","aged","verified","bulk","follower","storage"];
const TABS = [
  { key: "overview", label: "Overview" },
  { key: "add-listing", label: "Add Listing" },
  { key: "my-products", label: "My Products" },
  { key: "sales-overview", label: "Sales Overview" },
  { key: "inventory", label: "Inventory" },
  { key: "payouts", label: "Payouts" },
  { key: "deposits", label: "Deposits" },
  { key: "login-history", label: "Login History" },
  { key: "settings", label: "Settings" },
];

export function VendorDashboard() {
  const setUser = useStore(s => s.setUser);
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState<Data | null>(null);
  const [newPlat, setNewPlat] = useState("instagram");
  const [newCat, setNewCat] = useState("fresh");
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newAccounts, setNewAccounts] = useState("");
  const [newCountry, setNewCountry] = useState("");
  const [newFormat, setNewFormat] = useState("email:pass");
  const [newOriginalMail, setNewOriginalMail] = useState(false);
  const [uploadProductId, setUploadProductId] = useState<string | null>(null);
  const [uploadAccounts, setUploadAccounts] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dupes, setDupes] = useState<Array<{ line: string; index: number; productId?: string; productTitle?: string }>>([]);
  const [checkingDupes, setCheckingDupes] = useState(false);
  const [similarProducts, setSimilarProducts] = useState<Array<any>>([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [showDuplicatePopup, setShowDuplicatePopup] = useState(false);
  const [claimingProduct, setClaimingProduct] = useState<string | null>(null);
  const [claimPrice, setClaimPrice] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [wdNetwork, setWdNetwork] = useState("bep20");
  const [wdAmount, setWdAmount] = useState("");
  const [wdWallet, setWdWallet] = useState("");
  const [wdSuccess, setWdSuccess] = useState<any>(null);
  const [wdError, setWdError] = useState("");
  const [wdLoading, setWdLoading] = useState(false);
  const [wdNetworks, setWdNetworks] = useState<Array<{id: string; label: string; min: number; fee: number}>>([]);
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [salesPeriod, setSalesPeriod] = useState("7d");
  const [salesData, setSalesData] = useState<any>(null);
  const [sellerSupportLink, setSellerSupportLink] = useState("");

  // Effect 1: fetch dashboard data
  useEffect(() => {
    fetch("/api/dashboard/vendor")
      .then(r => r.json())
      .then(d => { if (d.user) setData(d); })
      .catch(() => {});
  }, []);

  // Effect 2: fetch settings
  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(d => {
      if (d.settings?.seller_support_telegram) setSellerSupportLink(d.settings.seller_support_telegram);
    }).catch(() => {});
  }, []);

  // Effect 3: fetch similar products
  useEffect(() => {
    if (tab === "add-listing") {
      setSimilarLoading(true);
      fetch(`/api/vendor/products/similar?platform=${newPlat}&category=${newCat}`)
        .then(r => r.json())
        .then(r => setSimilarProducts(r.products || []))
        .catch(() => setSimilarProducts([]))
        .finally(() => setSimilarLoading(false));
    }
  }, [tab, newPlat, newCat]);

  // Effect 4: fetch withdrawal networks
  useEffect(() => {
    fetch("/api/withdrawals").then(r => r.json()).then(d => {
      if (d.networks) setWdNetworks(d.networks);
    }).catch(() => {});
  }, []);

  if (!data) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f5" }}>Loading...</div>;

  if (data.user.vendorStatus !== "approved") {
    return (
      <div style={{ minHeight: "100vh", background: "#f5f5f5" }}>
        <div className="topbar">
          <Link href="/" style={{ color: "#fff", fontSize: 12, padding: "4px 12px", background: "#3ea136", borderRadius: 3, textDecoration: "none", fontWeight: 600 }}>Store</Link>
          <span style={{ color: "#5fa830", fontSize: 12, fontWeight: 700 }}>${data.user.balance.toFixed(2)}</span>
        </div>
        <div style={{ minHeight: "calc(100vh - 40px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ maxWidth: 440, background: "#fff", borderRadius: 12, padding: "40px 32px", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>&#9203;</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Wait for Approval</h1>
            <p style={{ fontSize: 14, color: "#666", marginBottom: 24 }}>Your account is currently pending review by an administrator.</p>
            <Link href="/" style={{ fontSize: 13, color: "#5fa830", textDecoration: "none" }}>&larr; Back to Store</Link>
          </div>
        </div>
      </div>
    );
  }

  const autoTitle = newPlat && newCat ? `${platformLabel(newPlat)} ${newCat.charAt(0).toUpperCase() + newCat.slice(1)} Account` : "";

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      <div className="topbar">
        <div className="news-link"><span className="news-dot" /> News</div>
        <Link href="/" style={{ color: "#fff", fontSize: 12, padding: "4px 12px", background: "#3ea136", borderRadius: 3, textDecoration: "none", fontWeight: 600 }}>Store</Link>
        <span style={{ color: "#5fa830", fontSize: 12, fontWeight: 700 }}>{money(data.user.balance)}</span>
        <span className="badge badge-pending" style={{ fontSize: 10 }}>VENDOR</span>
        <span style={{ color: "#888", fontSize: 11 }}>{data.user.name}</span>
      </div>

      <div className="wrap" style={{ paddingTop: 16, paddingBottom: 16 }}>
        <div className="side" style={{ marginBottom: 16 }}>
          <span className="side-label">{data.user.name}</span>
          {TABS.map(t => (
            <div key={t.key} className={`side-item ${tab === t.key ? "on" : ""}`} onClick={() => setTab(t.key)}>
              {t.label}
            </div>
          ))}
        </div>

        <div style={{ minWidth: 0 }}>
          {tab === "overview" && (
            <div className="panel">
              <div className="panel-head">Overview</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, padding: 16 }}>
                {[{ l: "Balance", v: money(data.stats.balance), c: "#3ea136", tab: "payouts" }, { l: "Revenue", v: money(data.stats.totalRevenue), c: "#333", tab: "sales-overview" }, { l: "Products", v: data.stats.totalProducts, c: "#333", tab: "my-products" }, { l: "Sales", v: data.stats.totalUnits, c: "#333", tab: "sales-overview" }].map(s => (
                  <div key={s.l} className="stat" onClick={() => setTab(s.tab)} style={{ cursor: "pointer" }}>
                    <div className="num" style={{ color: s.c }}>{s.v}</div>
                    <div className="lbl" style={{ textDecoration: "underline", color: "#1a73e8" }}>{s.l} →</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {tab === "add-listing" && (
            <div className="panel">
              <div className="panel-head">Create New Listing</div>
              <div style={{ padding: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <label className="label">Platform</label>
                    <select value={newPlat} onChange={e => setNewPlat(e.target.value)} className="input">
                      {PLATFORMS.map(p => <option key={p} value={p}>{platformLabel(p)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Category</label>
                    <select value={newCat} onChange={e => setNewCat(e.target.value)} className="input">
                      {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <label className="label">Title</label>
                  <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="input" placeholder={autoTitle} />
                </div>
                <div style={{ marginTop: 12 }}>
                  <label className="label">Description</label>
                  <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} className="input" rows={3} />
                </div>
                <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <label className="label">Price ($)</label>
                    <input type="number" step="0.01" value={newPrice} onChange={e => setNewPrice(e.target.value)} className="input" />
                  </div>
                  <div>
                    <label className="label">Country</label>
                    <select value={newCountry} onChange={e => setNewCountry(e.target.value)} className="input">
                      <option value="">Global</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
          {tab === "my-products" && (
            <div className="panel">
              <div className="panel-head">My Products ({data.products.length})</div>
              {data.products.map(p => (
                <div key={p.id} className="row">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{p.title}</div>
                    <div style={{ fontSize: 11, color: "#888" }}>{platformLabel(p.platform)} · {p.category}</div>
                  </div>
                  <span style={{ fontWeight: 700 }}>{money(p.storePrice)}</span>
                  <span className={`badge badge-${p.status}`}>{p.status}</span>
                </div>
              ))}
            </div>
          )}
          {tab === "sales-overview" && (
            <div className="panel">
              <div className="panel-head">Recent Sales</div>
              {data.sales.length === 0 ? <div style={{ padding: 20, color: "#888", textAlign: "center" }}>No sales yet</div> : data.sales.slice(0, 10).map(s => (
                <div key={s.id} className="row">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{s.product.title}</div>
                    <div style={{ fontSize: 11, color: "#888" }}>{s.buyer.username}</div>
                  </div>
                  <span style={{ fontWeight: 700, color: "#3ea136" }}>+{money(s.total)}</span>
                </div>
              ))}
            </div>
          )}
          {tab === "inventory" && (
            <div className="panel">
              <div className="panel-head">Inventory</div>
              <div style={{ padding: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
                  <div className="stat"><div className="num">{data.stats.totalAccountsInStock || 0}</div><div className="lbl">Total</div></div>
                  <div className="stat"><div className="num">{data.stats.liveAccounts || 0}</div><div className="lbl">Live</div></div>
                  <div className="stat"><div className="num">{data.stats.accountsSold || 0}</div><div className="lbl">Sold</div></div>
                </div>
              </div>
            </div>
          )}
          {tab === "payouts" && (
            <div className="panel">
              <div className="panel-head">Payouts</div>
              {data.withdrawals.length === 0 ? <div style={{ padding: 20, color: "#888", textAlign: "center" }}>No withdrawals yet</div> : data.withdrawals.map(w => (
                <div key={w.id} className="row">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{money(w.amount)}</div>
                    <div style={{ fontSize: 11, color: "#888" }}>{new Date(w.createdAt).toLocaleDateString()}</div>
                  </div>
                  <span className={`badge badge-${w.status}`}>{w.status}</span>
                </div>
              ))}
            </div>
          )}
          {tab === "deposits" && (
            <div className="panel">
              <div className="panel-head">Deposit History</div>
              {data.deposits.length === 0 ? <div style={{ padding: 20, color: "#888", textAlign: "center" }}>No deposits yet</div> : data.deposits.map(d => (
                <div key={d.id} className="row">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>Deposit via {d.method}</div>
                    <div style={{ fontSize: 11, color: "#888" }}>{new Date(d.createdAt).toLocaleDateString()}</div>
                  </div>
                  <span style={{ fontWeight: 700, color: "#3ea136" }}>+{money(d.amount)}</span>
                  <span className={`badge badge-${d.status}`}>{d.status}</span>
                </div>
              ))}
            </div>
          )}

          {/* LOGIN HISTORY */}
          {tab === "login-history" && (
            <div className="panel">
              <div className="panel-head">Login History</div>
              {!data.loginHistory || data.loginHistory.length === 0 ? (
                <div style={{ padding: 20, color: "#888", textAlign: "center" }}>No login history</div>
              ) : (
                data.loginHistory.map(l => (
                  <div key={l.id} className="row" style={{ padding: '10px 16px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>
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
    </div>
  );
}
