"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useStore } from "@/store";
import { money, calcStorePrice } from "@/lib/money";
import { platformLabel } from "@/lib/totp";


interface Data {
  user: { id: string; username: string; name: string; role: string; balance: number; vendorStatus: string; twoFaEnabled: boolean };
  stats: { balance: number; totalRevenue: number; totalUnits: number; totalProducts: number; activeProducts: number; avgRating: number; pendingProducts: number; pendingWithdrawals: number; lowStockCount: number };
  products: Array<{ id: string; title: string; platform: string; category: string; vendorPrice: number; storePrice: number; stock: number; status: string }>;
  sales: Array<{ id: string; quantity: number; total: number; createdAt: string; product: { title: string }; buyer: { username: string } }>;
  withdrawals: Array<{ id: string; amount: number; netAmount: number; fee: number; method: string; status: string; createdAt: string }>;
  deposits: Array<{ id: string; amount: number; method: string; status: string; createdAt: string }>;
  stockAlerts: { lowStock: Array<{ id: string; title: string; stock: number }>; outOfStock: Array<{ id: string; title: string }> };
}

const METHODS = [
  { key: "usdt_trc20", label: "USDT (TRC20)", min: 10, fee: 1, ph: "T..." },
  { key: "btc", label: "Bitcoin (BTC)", min: 20, fee: 2, ph: "bc1..." },
  { key: "eth", label: "Ethereum (ETH)", min: 20, fee: 5, ph: "0x..." },
  { key: "paypal", label: "PayPal", min: 20, fee: 0, ph: "you@email.com" },
  { key: "bank", label: "Bank Transfer", min: 100, fee: 0, ph: "IBAN..." },
];

const PLATFORMS = ["instagram","facebook","telegram","x","tiktok","linkedin","gmail","outlook","discord","reddit","youtube","pinterest","snapchat"];
const CATEGORIES = ["fresh","aged","verified","bulk","follower","storage"];

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "add-listing", label: "Add Listing" },
  { key: "my-products", label: "My Products" },
  { key: "sales-overview", label: "Sales Overview" },
  { key: "payouts", label: "Payouts" },
  { key: "deposits", label: "Deposits" },
];

export function VendorDashboard() {
  const { setUser } = useStore();
  const [tab, setTab] = useState("overview");
  const [data, setData] = useState<Data | null>(null);

  // Add listing form
  const [newPlat, setNewPlat] = useState("instagram");
  const [newCat, setNewCat] = useState("fresh");
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newAccounts, setNewAccounts] = useState("");
  const [newCountry, setNewCountry] = useState("");
  const [newFormat, setNewFormat] = useState("email:pass");
  const [newOriginalMail, setNewOriginalMail] = useState(false);

  // Upload more accounts
  const [uploadProductId, setUploadProductId] = useState<string | null>(null);
  const [uploadAccounts, setUploadAccounts] = useState("");
  const [uploading, setUploading] = useState(false);

  // Withdrawal
  const [wdMethod, setWdMethod] = useState("usdt_trc20");
  const [wdAmount, setWdAmount] = useState("");
  const [wdWallet, setWdWallet] = useState("");

  // Price editing
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");

  // Sales overview
  const [salesPeriod, setSalesPeriod] = useState("7d");
  const [salesData, setSalesData] = useState<any>(null);



  const refresh = () => fetch("/api/dashboard/vendor").then(r => r.json()).then(d => { if (d.user) { setData(d); setUser(d.user); } }).catch(() => {});

  useEffect(() => { refresh(); }, [setUser]);

  if (!data) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f5" }}>Loading...</div>;

  const createProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/vendor/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: newTitle, platform: newPlat, category: newCat, description: newDesc, vendorPrice: parseFloat(newPrice), countryRegister: newCountry, deliveryFormat: newFormat, originalMail: newOriginalMail }) });
    const r = await res.json();
    if (r.success) { setNewTitle(""); setNewDesc(""); setNewPrice(""); setNewAccounts(""); setNewCountry(""); alert("Listing created! Now upload your accounts."); setTab("my-products"); refresh(); } else alert(r.error);
  };

  const uploadMore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadProductId || !uploadAccounts.trim()) return;
    setUploading(true);
    const res = await fetch("/api/vendor/products/upload-more", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: uploadProductId, accountsData: uploadAccounts }) });
    const r = await res.json();
    setUploading(false);
    if (r.success) { alert(`Uploaded ${r.added} accounts. Pending admin approval.`); setUploadProductId(null); setUploadAccounts(""); refresh(); } else alert(r.error);
  };

  const updatePrice = async (productId: string) => {
    const vp = parseFloat(editPrice);
    if (!vp || vp <= 0) return alert("Invalid price");
    const res = await fetch("/api/vendor/products", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, vendorPrice: vp }) });
    const r = await res.json();
    if (r.success) { setEditProductId(null); refresh(); } else alert(r.error);
  };

  const fetchSalesOverview = async (period: string) => {
    setSalesPeriod(period);
    try {
      const res = await fetch(`/api/sales-overview?period=${period}&scope=self`);
      if (!res.ok) { setSalesData(null); return; }
      const r = await res.json();
      setSalesData(r.error ? null : r);
    } catch { setSalesData(null); }
  };

  const withdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const mi = METHODS.find(m => m.key === wdMethod)!;
    if (parseFloat(wdAmount) < mi.min) { alert(`Min $${mi.min}`); return; }
    const res = await fetch("/api/withdrawals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: parseFloat(wdAmount), method: wdMethod, wallet: wdWallet }) });
    const r = await res.json();
    if (r.success) { alert(`Submitted. Net: $${r.withdrawal.netAmount}`); setWdAmount(""); setWdWallet(""); refresh(); } else alert(r.error);
  };

  const vp = parseFloat(newPrice) || 0;
  const autoTitle = newPlat && newCat ? `${platformLabel(newPlat)} ${newCat.charAt(0).toUpperCase() + newCat.slice(1)} Account` : "";

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      {/* Top Bar */}
      <div className="topbar">
        <div className="news-link"><span className="news-dot" /> News</div>
        <Link href="/" style={{ color: "#fff", fontSize: 12, padding: "4px 12px", background: "#3ea136", borderRadius: 3, textDecoration: "none", fontWeight: 600 }}>Store</Link>
        <Link href="/?page=deposit" style={{ color: "#fff", fontSize: 12, padding: "4px 12px", background: "#5fa830", border: "none", borderRadius: 3, cursor: "pointer", fontWeight: 600, textDecoration: "none" }}>Deposit</Link>
        <button onClick={() => { setTab("payouts"); }} style={{ color: "#fff", fontSize: 12, padding: "4px 12px", background: "#d32f2f", border: "none", borderRadius: 3, cursor: "pointer", fontWeight: 600 }}>Withdraw</button>
        <span style={{ color: "#5fa830", fontSize: 12, fontWeight: 700 }}>{money(data.user.balance)}</span>
        <span className="badge badge-pending" style={{ fontSize: 10 }}>VENDOR</span>
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

        {/* Horizontal Tabs Bar (desktop) */}
        <div className="side hide-mobile" style={{ marginBottom: 16 }}>
          <span className="side-label">{data.user.name}</span>
          {TABS.map(t => (
            <div key={t.key} className={`side-item ${tab === t.key ? "on" : ""}`} onClick={() => setTab(t.key)}>
              {t.label}
            </div>
          ))}
        </div>

        {/* Content */}
        <div style={{ minWidth: 0 }}>
            {/* OVERVIEW */}
            {tab === "overview" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginBottom: 16 }}>
                  {[{ l: "Balance", v: money(data.stats.balance), c: "#3ea136" }, { l: "Revenue", v: money(data.stats.totalRevenue), c: "#333" }, { l: "Products", v: data.stats.totalProducts, c: "#333" }, { l: "Sales", v: data.stats.totalUnits, c: "#333" }, { l: "Rating", v: `${data.stats.avgRating} / 5`, c: "#333" }].map(s => (
                    <div key={s.l} className="stat">
                      <div className="num" style={{ color: s.c }}>{s.v}</div>
                      <div className="lbl">{s.l}</div>
                    </div>
                  ))}
                </div>
                {data.stockAlerts.lowStock.length + data.stockAlerts.outOfStock.length > 0 && (
                  <div className="panel" style={{ marginBottom: 16, borderLeft: "3px solid #eab308" }}>
                    <div className="panel-head" style={{ background: "#854d0e" }}>Stock Alerts ({data.stockAlerts.lowStock.length + data.stockAlerts.outOfStock.length})</div>
                    {data.stockAlerts.outOfStock.map(p => <div key={p.id} className="row"><span style={{ color: "#e53e3e", fontSize: 12 }}>OUT OF STOCK</span><span style={{ flex: 1, fontSize: 13 }}>{p.title}</span><button className="btn btn-danger btn-sm" onClick={() => setTab("add-listing")}>Restock</button></div>)}
                    {data.stockAlerts.lowStock.map(p => <div key={p.id} className="row"><span style={{ color: "#eab308", fontSize: 12 }}>LOW ({p.stock})</span><span style={{ flex: 1, fontSize: 13 }}>{p.title}</span></div>)}
                  </div>
                )}
                <div className="panel">
                  <div className="panel-head">Recent Sales</div>
                  {data.sales.length === 0 ? <div style={{ padding: 20, color: "#888", fontSize: 13, textAlign: "center" }}>No sales yet</div> : data.sales.slice(0, 5).map(s => (
                    <div key={s.id} className="row">
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{s.product.title}</div>
                        <div style={{ fontSize: 11, color: "#888" }}>{s.buyer.username} · {new Date(s.createdAt).toLocaleDateString()}</div>
                      </div>
                      <span style={{ fontWeight: 700, color: "#3ea136" }}>+{money(s.total)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ADD LISTING */}
            {tab === "add-listing" && data.user.vendorStatus === "approved" && (
              <div className="panel">
                <div className="panel-head">Create New Listing</div>
                <form onSubmit={createProduct} style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* Step 1: Platform + Category */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <label className="label">Platform *</label>
                      <select value={newPlat} onChange={e => setNewPlat(e.target.value)} className="input">
                        {PLATFORMS.map(p => <option key={p} value={p}>{platformLabel(p)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Category *</label>
                      <select value={newCat} onChange={e => setNewCat(e.target.value)} className="input">
                        {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Step 2: Title + Description */}
                  <div>
                    <label className="label">Listing Title *</label>
                    <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="input" required placeholder={autoTitle || "e.g. Instagram Fresh Account"} />
                    <div style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}>Suggested: {autoTitle}</div>
                  </div>
                  <div>
                    <label className="label">Description *</label>
                    <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} className="input" rows={3} required minLength={10} maxLength={500} placeholder="Describe the account quality, age, features, what's included..." style={{ resize: "vertical" }} />
                    <div style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}>{newDesc.length}/500</div>
                  </div>

                  {/* Step 3: Price + Details */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <label className="label">Your Price ($) *</label>
                      <input type="number" step="0.01" min="0.01" value={newPrice} onChange={e => setNewPrice(e.target.value)} className="input" required />
                      <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>Store price (+40%): <strong>{money(calcStorePrice(vp))}</strong></div>
                    </div>
                    <div>
                      <label className="label">Country</label>
                      <select value={newCountry} onChange={e => setNewCountry(e.target.value)} className="input">
                        <option value="">Global</option>
                        {["US","UK","AU","CA","DE","FR","JP","BR","IN","NG","PH","VN","ID","MX","ES","IT","NL","SE","NO","DK","PL","TR","UA","RU","KR"].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <label className="label">Delivery Format</label>
                      <select value={newFormat} onChange={e => setNewFormat(e.target.value)} className="input">
                        <option value="email:pass">email:password</option>
                        <option value="user:pass">user:password</option>
                        <option value="user:pass:email:pass">user:pass:email:pass</option>
                        <option value="cookies">cookies</option>
                        <option value="token">token</option>
                      </select>
                    </div>
                    <div style={{ display: "flex", alignItems: "end", paddingBottom: 2 }}>
                      <label style={{ fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                        <input type="checkbox" checked={newOriginalMail} onChange={e => setNewOriginalMail(e.target.checked)} /> Original email included
                      </label>
                    </div>
                  </div>

                  <div style={{ background: "#f0f7ff", border: "1px solid #b3d4fc", borderRadius: 6, padding: 12, fontSize: 12, color: "#1565c0" }}>
                    After submitting, you will be able to upload account data from My Products.
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>Create Listing</button>
                </form>
              </div>
            )}

            {tab === "add-listing" && data.user.vendorStatus !== "approved" && (
              <div className="panel"><div style={{ padding: 32, textAlign: "center", color: "#888" }}>Vendor approval required to add products.</div></div>
            )}

            {/* MY PRODUCTS */}
            {tab === "my-products" && (
              <div className="panel">
                <div className="panel-head">My Products ({data.products.length})</div>
                <div style={{ overflowX: "auto" }}>
                  <table className="tbl">
                    <thead><tr><th>Product</th><th>Platform</th><th>Category</th><th>Your Price</th><th>Store Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>{data.products.map(p => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600 }}>{p.title}</td>
                        <td>{platformLabel(p.platform)}</td>
                        <td>{p.category}</td>
                        <td>
                          {editProductId === p.id ? (
                            <div style={{ display: "flex", gap: 4 }}>
                              <input type="number" step="0.01" value={editPrice} onChange={e => setEditPrice(e.target.value)} className="input" style={{ width: 80, padding: "2px 6px", fontSize: 12 }} autoFocus />
                              <button onClick={() => updatePrice(p.id)} style={{ background: "#5fa830", color: "#fff", border: "none", borderRadius: 3, padding: "2px 8px", fontSize: 11, cursor: "pointer" }}>OK</button>
                              <button onClick={() => setEditProductId(null)} style={{ background: "#888", color: "#fff", border: "none", borderRadius: 3, padding: "2px 8px", fontSize: 11, cursor: "pointer" }}>X</button>
                            </div>
                          ) : (
                            <span style={{ cursor: "pointer", color: "#3ea136", fontWeight: 600, borderBottom: "1px dashed #3ea136" }} onClick={() => { setEditProductId(p.id); setEditPrice(String(p.vendorPrice)); }}>{money(p.vendorPrice)}</span>
                          )}
                        </td>
                        <td style={{ fontWeight: 600 }}>{money(p.storePrice)}</td>
                        <td>{p.stock}</td>
                        <td><span className={`badge badge-${p.status}`}>{p.status}</span></td>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button title="Upload accounts" onClick={() => { setUploadProductId(p.id); setUploadAccounts(""); setTab("upload-more"); }} style={{ background: p.stock === 0 ? "#e53e3e" : "#5fa830", color: "#fff", border: "none", borderRadius: 4, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                              {p.stock === 0 ? "Upload" : "+ Upload"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            )}

            {/* UPLOAD MORE ACCOUNTS */}
            {tab === "upload-more" && uploadProductId && (
              <div className="panel">
                <div className="panel-head">
                  Upload Additional Accounts
                  <button onClick={() => { setUploadProductId(null); setTab("my-products"); }} style={{ float: "right", background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 12 }}>Back to Products</button>
                </div>
                <div style={{ padding: 16 }}>
                  <div style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 6, padding: 12, marginBottom: 16, fontSize: 12 }}>
                    <strong>Notice:</strong> Each upload batch requires admin approval before accounts become available for sale. Approved accounts are added to your existing listing stock.
                  </div>
                  <div style={{ fontSize: 13, color: "#555", marginBottom: 12 }}>
                    Adding accounts to: <strong>{data.products.find(p => p.id === uploadProductId)?.title || "Product"}</strong>
                    (Current stock: {data.products.find(p => p.id === uploadProductId)?.stock || 0})
                  </div>
                  <form onSubmit={uploadMore}>
                    <div style={{ marginBottom: 12 }}>
                      <label className="label">New Accounts (one per line)</label>
                      <textarea value={uploadAccounts} onChange={e => setUploadAccounts(e.target.value)} className="input" style={{ fontFamily: "monospace", fontSize: 12 }} rows={8} required placeholder={"user123:pass123\nuser456:pass456"} />
                      <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
                        <strong>{uploadAccounts.split("\n").filter(l => l.trim()).length}</strong> new accounts
                      </div>
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={uploading || !uploadAccounts.trim()}>
                      {uploading ? "Uploading..." : "Upload Accounts (Pending Review)"}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* SALES */}
            {tab === "sales-overview" && (
              <>
                <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                  {[{ p: "24h", l: "Last 24h" }, { p: "7d", l: "7 Days" }, { p: "30d", l: "30 Days" }, { p: "90d", l: "90 Days" }, { p: "1y", l: "1 Year" }, { p: "all", l: "All Time" }].map(opt => (
                    <button key={opt.p} onClick={() => fetchSalesOverview(opt.p)} className={`btn btn-sm ${salesPeriod === opt.p ? "btn-primary" : "btn-secondary"}`}>{opt.l}</button>
                  ))}
                </div>
                {!salesData ? (
                  <div style={{ padding: 20, textAlign: "center" }}><button className="btn btn-primary" onClick={() => fetchSalesOverview("7d")}>Load Sales Overview</button></div>
                ) : (
                  <>
                    {/* Summary Cards */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 16 }}>
                      {[{ l: "Total Revenue", v: money(salesData.summary.totalRevenue), c: "#3ea136" }, { l: "Total Orders", v: salesData.summary.totalOrders, c: "#333" }, { l: "Units Sold", v: salesData.summary.totalSales, c: "#333" }, { l: "Unique Buyers", v: salesData.summary.uniqueBuyers, c: "#333" }].map(s => (
                        <div key={s.l} className="stat"><div className="num" style={{ color: s.c }}>{s.v}</div><div className="lbl">{s.l}</div></div>
                      ))}
                    </div>

                    {/* Daily Breakdown Chart (text-based) */}
                    {salesData.daily.length > 0 && (
                      <div className="panel" style={{ marginBottom: 16 }}>
                        <div className="panel-head">Daily Revenue</div>
                        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 4 }}>
                          {salesData.daily.slice(-14).map((d: any) => (
                            <div key={d.date} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 11, color: "#888", width: 80, flexShrink: 0 }}>{d.date}</span>
                              <div style={{ flex: 1, height: 16, background: "#f0f0f0", borderRadius: 3, overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${Math.min(100, (d.revenue / Math.max(...salesData.daily.map((x: any) => x.revenue || 1))) * 100)}%`, background: "#3ea136", borderRadius: 3 }} />
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 600, width: 70, textAlign: "right" }}>{money(d.revenue)}</span>
                              <span style={{ fontSize: 10, color: "#888", width: 30, textAlign: "right" }}>{d.orders}x</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Top Products */}
                    <div className="panel" style={{ marginBottom: 16 }}>
                      <div className="panel-head">Top Products by Revenue</div>
                      {salesData.productRanking.length === 0 ? <div style={{ padding: 16, color: "#888", fontSize: 12, textAlign: "center" }}>No sales in this period</div> :
                        salesData.productRanking.map((p: any, i: number) => (
                          <div key={i} className="row">
                            <span style={{ fontSize: 12, color: "#888", width: 24 }}>#{i + 1}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 600 }}>{p.title}</div>
                              <div style={{ fontSize: 11, color: "#888" }}>{platformLabel(p.platform)} · {p.category} · {p.orders} orders · {p.sales} units</div>
                            </div>
                            <span style={{ fontWeight: 700, color: "#3ea136" }}>{money(p.revenue)}</span>
                          </div>
                        ))}
                    </div>

                    {/* Recent Sales */}
                    <div className="panel">
                      <div className="panel-head">Recent Sales</div>
                      {salesData.recentOrders.length === 0 ? <div style={{ padding: 16, color: "#888", fontSize: 12, textAlign: "center" }}>No sales</div> :
                        salesData.recentOrders.map((s: any) => (
                          <div key={s.id} className="row">
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 600 }}>{s.product.title}</div>
                              <div style={{ fontSize: 11, color: "#888" }}>{s.buyer.username} · {s.quantity}x</div>
                            </div>
                            <span style={{ fontWeight: 700, color: "#3ea136" }}>+{money(s.total)}</span>
                            <span style={{ fontSize: 10, color: "#aaa", marginLeft: 8 }}>{new Date(s.createdAt).toLocaleDateString()}</span>
                          </div>
                        ))}
                    </div>
                  </>
                )}
              </>
            )}

            {/* PAYOUTS */}
            {tab === "payouts" && (
              <>
                <div className="panel" style={{ marginBottom: 16 }}>
                  <div className="panel-head">Withdraw</div>
                  <form onSubmit={withdraw} style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ fontSize: 12, color: "#888" }}>Available: <strong style={{ color: "#3ea136" }}>{money(data.user.balance)}</strong></div>
                    <div><label className="label">Method</label><select value={wdMethod} onChange={e => setWdMethod(e.target.value)} className="input">{METHODS.map(m => <option key={m.key} value={m.key}>{m.label} (min ${m.min}, fee ${m.fee})</option>)}</select></div>
                    <div><label className="label">Amount ($)</label><input type="number" step="0.01" min={METHODS.find(m => m.key === wdMethod)?.min} value={wdAmount} onChange={e => setWdAmount(e.target.value)} className="input" required />
                      {wdAmount && <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>Net: {money(Math.max(0, parseFloat(wdAmount) - (METHODS.find(m => m.key === wdMethod)?.fee || 0)))}</div>}
                    </div>
                    <div><label className="label">Wallet</label><input type="text" value={wdWallet} onChange={e => setWdWallet(e.target.value)} className="input" required placeholder={METHODS.find(m => m.key === wdMethod)?.ph} /></div>
                    <button type="submit" className="btn btn-primary">Submit Withdrawal</button>
                  </form>
                </div>
                <div className="panel">
                  <div className="panel-head">Withdrawal History ({data.withdrawals.length})</div>
                  {data.withdrawals.length === 0 ? <div style={{ padding: 20, color: "#888", fontSize: 13, textAlign: "center" }}>No withdrawals yet</div> : data.withdrawals.map(w => (
                    <div key={w.id} className="row">
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13 }}>{w.method}</div>
                        <div style={{ fontSize: 11, color: "#888" }}>{new Date(w.createdAt).toLocaleDateString()}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{money(w.amount)}</div>
                        <div style={{ fontSize: 10, color: "#888" }}>Net: {money(w.netAmount)}</div>
                      </div>
                      <span className={`badge badge-${w.status}`}>{w.status}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* DEPOSITS */}
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
                        <Link key={amt} href="/?page=deposit" style={{ display: "block", fontSize: 13, padding: "10px 0", textAlign: "center", borderRadius: 4, background: "#3ea136", color: "#fff", textDecoration: "none", fontWeight: 600 }}>
                          ${amt}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
        </div>
      </div>

    </div>
  );
}
