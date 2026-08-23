"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useStore } from "@/store";
import { money, calcStorePrice } from "@/lib/money";
import { platformLabel } from "@/lib/totp";


interface Data {
  user: { id: string; username: string; name: string; role: string; balance: number; vendorStatus: string; twoFaEnabled: boolean };
  stats: { balance: number; totalRevenue: number; totalUnits: number; totalProducts: number; activeProducts: number; avgRating: number; pendingProducts: number; pendingWithdrawals: number; lowStockCount: number; totalAccountsInStock: number; accountsSold: number; pendingApprovalAccounts: number; liveAccounts: number };
  products: Array<{ id: string; title: string; platform: string; category: string; vendorPrice: number; storePrice: number; stock: number; status: string }>;
  sales: Array<{ id: string; quantity: number; total: number; createdAt: string; product: { title: string }; buyer: { username: string } }>;
  withdrawals: Array<{ id: string; amount: number; netAmount: number; fee: number; method: string; status: string; createdAt: string }>;
  deposits: Array<{ id: string; amount: number; method: string; status: string; createdAt: string }>;
  stockAlerts: { lowStock: Array<{ id: string; title: string; stock: number }>; outOfStock: Array<{ id: string; title: string }> };
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
];

export function VendorDashboard() {
  const { setUser } = useStore();
  const [tab, setTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('tab') || 'overview';
    }
    return 'overview';
  });
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
  const [dupes, setDupes] = useState<Array<{ line: string; index: number; productId?: string; productTitle?: string }>>([]);
  const [checkingDupes, setCheckingDupes] = useState(false);

  // Similar products / duplicate detection
  const [similarProducts, setSimilarProducts] = useState<Array<{ id: string; title: string; platform: string; category: string; storePrice: number; vendorPrice: number; stock: number; totalSales: number; avgRating: number; reviewCount: number; vendor: { id: string; username: string; vendorRating: number } }>>([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [showDuplicatePopup, setShowDuplicatePopup] = useState(false);
  const [claimingProduct, setClaimingProduct] = useState<string | null>(null);
  const [claimPrice, setClaimPrice] = useState("");
  const [claiming, setClaiming] = useState(false);

  // Withdrawal
  const [wdNetwork, setWdNetwork] = useState("bep20");
  const [wdAmount, setWdAmount] = useState("");
  const [wdWallet, setWdWallet] = useState("");
  const [wdSuccess, setWdSuccess] = useState<any>(null);
  const [wdError, setWdError] = useState("");
  const [wdLoading, setWdLoading] = useState(false);
  const [wdNetworks, setWdNetworks] = useState<Array<{id: string; label: string; min: number; fee: number}>>([]);

  // Price editing
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");

  // Sales overview
  const [salesPeriod, setSalesPeriod] = useState("7d");
  const [salesData, setSalesData] = useState<any>(null);



  const refresh = () => fetch("/api/dashboard/vendor").then(r => r.json()).then(d => { if (d.user) { setData(d); setUser(d.user); } }).catch(() => {});

  useEffect(() => { refresh(); }, [setUser]);

  const [sellerSupportLink, setSellerSupportLink] = useState("");

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(d => {
      if (d.settings?.seller_support_telegram) setSellerSupportLink(d.settings.seller_support_telegram);
    }).catch(() => {});
  }, []);

  if (!data) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f5" }}>Loading...</div>;

  // Pending approval - restrict all access
  if (data.user.vendorStatus !== "approved") {
    return (
      <div style={{ minHeight: "100vh", background: "#f5f5f5" }}>
        <div className="topbar">
          <div className="news-link"><span className="news-dot" /> News</div>
          <Link href="/" style={{ color: "#fff", fontSize: 12, padding: "4px 12px", background: "#3ea136", borderRadius: 3, textDecoration: "none", fontWeight: 600 }}>Store</Link>
          <span style={{ color: "#5fa830", fontSize: 12, fontWeight: 700 }}>${data.user.balance.toFixed(2)}</span>
          <span style={{ color: "#888", fontSize: 11 }}>{data.user.name || data.user.username}</span>
        </div>
        <div style={{ minHeight: "calc(100vh - 40px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ maxWidth: 440, background: "#fff", borderRadius: 12, padding: "40px 32px", textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", border: "1px solid #e0e0e0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>&#9203;</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, color: "#333" }}>Wait for Approval</h1>
            <p style={{ fontSize: 14, color: "#666", lineHeight: 1.6, marginBottom: 8 }}>
              Your account is currently pending review by an administrator.
            </p>
            <p style={{ fontSize: 14, color: "#666", lineHeight: 1.6, marginBottom: 24 }}>
              You will be notified once your account is approved.
            </p>
            <div style={{ background: "#f0f7ff", border: "1px solid #b3d4fc", borderRadius: 8, padding: 16, marginBottom: 20 }}>
              <p style={{ fontSize: 13, color: "#1565c0", marginBottom: 12 }}>For any urgent inquiries, please contact our support team:</p>
              <a
                href={sellerSupportLink ? (sellerSupportLink.startsWith("http") ? sellerSupportLink : `https://t.me/${sellerSupportLink.replace("@", "")}`) : "https://t.me/accspoint_support"}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 24px", borderRadius: 6, background: "#0088cc", color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none", cursor: "pointer" }}
              >
                <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: "#fff" }}><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 11.944 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                Contact Seller Support
              </a>
            </div>
            <Link href="/" style={{ fontSize: 13, color: "#5fa830", textDecoration: "none" }}>&larr; Back to Store</Link>
          </div>
        </div>
      </div>
    );
  }

  // Fetch similar products when platform or category changes
  const fetchSimilar = async () => {
    setSimilarLoading(true);
    try {
      const res = await fetch(`/api/vendor/products/similar?platform=${newPlat}&category=${newCat}`);
      const r = await res.json();
      setSimilarProducts(r.products || []);
    } catch { setSimilarProducts([]); }
    setSimilarLoading(false);
  };

  useEffect(() => {
    if (tab === "add-listing") fetchSimilar();
  }, [tab, newPlat, newCat]);

  // Claim an existing product (use existing)
  const claimProduct = async (productId: string) => {
    const price = prompt("Enter your vendor price ($):" , "10");
    if (!price) return;
    const vp = parseFloat(price);
    if (!vp || vp <= 0) { alert("Invalid price"); return; }
    setClaimingProduct(productId);
    setClaiming(true);
    try {
      const res = await fetch("/api/vendor/products/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, vendorPrice: vp }),
      });
      const r = await res.json();
      if (r.success) {
        alert("Product added to your store! Upload your accounts and wait for admin approval.");
        refresh();
        setSimilarProducts(prev => prev.filter(p => p.id !== productId));
      } else {
        alert(r.error || "Failed to claim product");
      }
    } catch { alert("Network error"); }
    setClaiming(false);
    setClaimingProduct(null);
  };

  const createProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate delivery format: must be colon-separated alphanumeric names
    if (!newFormat.trim() || !/^([a-zA-Z0-9_]+)(:[a-zA-Z0-9_]+)*$/.test(newFormat.trim())) {
      alert("Delivery format must use colon-separated names (e.g. name:pass:email:emailpass:gender)");
      return;
    }
    // Auto-duplicate check: if similar products exist, show popup first
    if (similarProducts.length > 0 && !showDuplicatePopup) {
      setShowDuplicatePopup(true);
      return;
    }
    setShowDuplicatePopup(false);
    const res = await fetch("/api/vendor/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: newTitle || autoTitle, platform: newPlat, category: newCat, description: newDesc, vendorPrice: parseFloat(newPrice), countryRegister: newCountry, deliveryFormat: newFormat.trim(), originalMail: newOriginalMail }) });
    const r = await res.json();
    if (r.success) { setNewTitle(""); setNewDesc(""); setNewPrice(""); setNewAccounts(""); setNewCountry(""); setNewFormat("email:pass"); setSimilarProducts([]); setShowDuplicatePopup(false); alert("Listing created! Now upload your accounts."); setTab("my-products"); refresh(); } else alert(r.error);
  };

  const uploadMore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadProductId || !uploadAccounts.trim()) return;
    setUploading(true);
    const res = await fetch("/api/vendor/products/upload-more", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: uploadProductId, accountsData: uploadAccounts }) });
    const r = await res.json();
    setUploading(false);
    if (r.success) { alert(`Uploaded ${r.added} accounts. Pending admin approval.`); setUploadProductId(null); setUploadAccounts(""); setDupes([]); refresh(); } else alert(r.error);
  };

  const checkDuplicates = async () => {
    if (!uploadAccounts.trim()) return;
    setCheckingDupes(true);
    try {
      const res = await fetch(`/api/vendor/products/upload-more`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check_duplicates", productId: uploadProductId, accounts: uploadAccounts }),
      });
      const r = await res.json();
      setDupes(r.duplicates || []);
      if ((r.duplicateCount || 0) === 0) {
        alert("No duplicates found!");
      } else {
        alert(`Found ${r.duplicateCount} duplicate(s) out of ${r.total} accounts.`);
      }
    } catch {
      alert("Failed to check duplicates");
    }
    setCheckingDupes(false);
  };

  const removeDuplicateLines = () => {
    const dupeIndices = new Set(dupes.map(d => d.index));
    const lines = uploadAccounts.split("\n");
    const filtered = lines.filter((_, i) => !dupeIndices.has(i));
    setUploadAccounts(filtered.join("\n"));
    setDupes([]);
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
    setWdError("");
    const amt = parseFloat(wdAmount);
    if (!wdAmount || isNaN(amt)) { setWdError("Please enter a valid withdrawal amount."); return; }
    const net = wdNetworks.find(n => n.id === wdNetwork);
    if (!net) { setWdError("Please select a payment network."); return; }
    if (amt < net.min) { setWdError(`Minimum withdrawal amount is $${net.min}.`); return; }
    if (amt > (data?.user.balance || 0)) { setWdError(`Amount exceeds your available balance of $${(data?.user.balance || 0).toFixed(2)}.`); return; }
    if (!wdWallet.trim()) { setWdError("Please enter your wallet address."); return; }
    // Validate wallet format
    const walletPatterns: Record<string, RegExp> = { bep20: /^0x[0-9a-fA-F]{40}$/, trc20: /^T[0-9a-zA-Z]{33}$/, erc20: /^0x[0-9a-fA-F]{40}$/ };
    if (walletPatterns[wdNetwork] && !walletPatterns[wdNetwork].test(wdWallet.trim())) {
      setWdError(`Please enter a valid ${net.label} wallet address.`);
      return;
    }
    setWdLoading(true);
    try {
      const res = await fetch("/api/withdrawals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ network: wdNetwork, amount: amt, wallet: wdWallet.trim() }) });
      const r = await res.json();
      if (r.success) {
        setWdSuccess({ ...r.withdrawal, requestId: `WD-${Date.now()}` });
        setWdAmount(""); setWdWallet(""); setWdError("");
        refresh();
      } else { setWdError(r.error || "Withdrawal failed"); }
    } catch { setWdError("Network error. Please try again."); }
    setWdLoading(false);
  };

  // Fetch withdrawal networks on mount
  useEffect(() => {
    fetch("/api/withdrawals").then(r => r.json()).then(d => {
      if (d.networks) setWdNetworks(d.networks);
    }).catch(() => {});
  }, []);

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
                {/* Account Inventory Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 16 }}>
                  {[
                    { l: "Total Accounts", v: data.stats.totalAccountsInStock || 0, c: "#1976d2", icon: "📦" },
                    { l: "Live Accounts", v: data.stats.liveAccounts || 0, c: "#3ea136", icon: "✅" },
                    { l: "Accounts Sold", v: data.stats.accountsSold || 0, c: "#333", icon: "💰" },
                    { l: "Pending Approval", v: data.stats.pendingApprovalAccounts || 0, c: data.stats.pendingApprovalAccounts > 0 ? "#eab308" : "#333", icon: "⏳" },
                  ].map(s => (
                    <div key={s.l} className="stat" style={{ background: s.v > 0 || s.l === "Total Accounts" ? "#f8f9fa" : "#fff3e0", borderLeft: `3px solid ${s.c}` }}>
                      <div style={{ fontSize: 14, marginBottom: 2 }}>{s.icon}</div>
                      <div className="num" style={{ color: s.c, fontSize: 20 }}>{s.v.toLocaleString()}</div>
                      <div className="lbl">{s.l}</div>
                    </div>
                  ))}
                </div>
                {data.stockAlerts.lowStock.length + data.stockAlerts.outOfStock.length > 0 && (
                  <div className="panel" style={{ marginBottom: 16, borderLeft: "3px solid #eab308" }}>
                    <div className="panel-head" style={{ background: "#854d0e", display: "flex", alignItems: "center", gap: 8 }}>
                      <span>⚠️</span>
                      <span>Stock Alerts ({data.stockAlerts.lowStock.length + data.stockAlerts.outOfStock.length})</span>
                    </div>
                    {data.stockAlerts.outOfStock.length > 0 && (
                      <div style={{ padding: "12px 16px", background: "#fef2f2", borderBottom: "1px solid #fecaca" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#991b1b", marginBottom: 8 }}>🚫 OUT OF STOCK ({data.stockAlerts.outOfStock.length})</div>
                        {data.stockAlerts.outOfStock.map(p => (
                          <div key={p.id} className="row" style={{ padding: "8px 0", borderBottom: "1px solid #fee2e2" }}>
                            <span style={{ flex: 1, fontSize: 13 }}>{p.title}</span>
                            <button className="btn btn-danger btn-sm" onClick={() => setTab("add-listing")}>Restock Now</button>
                          </div>
                        ))}
                      </div>
                    )}
                    {data.stockAlerts.lowStock.length > 0 && (
                      <div style={{ padding: "12px 16px", background: "#fffbeb" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 8 }}>📉 LOW STOCK ({data.stockAlerts.lowStock.length})</div>
                        {data.stockAlerts.lowStock.map(p => (
                          <div key={p.id} className="row" style={{ padding: "8px 0", borderBottom: "1px solid #fef3c7" }}>
                            <span style={{ flex: 1, fontSize: 13 }}>{p.title}</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#d97706" }}>{p.stock} left</span>
                          </div>
                        ))}
                      </div>
                    )}
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
              <div style={{ display: 'grid', gridTemplateColumns: similarProducts.length > 0 ? '1fr 340px' : '1fr', gap: 16, alignItems: 'start' }}>
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
                        <label className="label">Delivery Format <span style={{ fontSize: 10, color: '#888' }}>(colon-separated)</span></label>
                        <input
                          type="text"
                          value={newFormat}
                          onChange={e => setNewFormat(e.target.value)}
                          placeholder="e.g. name:pass:email:emailpass:gender"
                          className="input"
                          style={{ fontFamily: 'monospace', fontSize: 13 }}
                        />
                        {newFormat && !/^([a-zA-Z0-9_]+)(:[a-zA-Z0-9_]+)*$/.test(newFormat) && (
                          <p style={{ fontSize: 10, color: '#e53e3e', marginTop: 2 }}>
                            Use colon-separated names only (e.g. name:pass:email:emailpass:gender)
                          </p>
                        )}
                        {newFormat && /^([a-zA-Z0-9_]+)(:[a-zA-Z0-9_]+)*$/.test(newFormat) && (
                          <p style={{ fontSize: 10, color: '#3ea136', marginTop: 2 }}>
                            {newFormat.split(':').length} fields: {newFormat.split(':').join(' → ')}
                          </p>
                        )}
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

                    <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
                      {similarProducts.length > 0 ? "Review Similar Products & Create" : "Create Listing"}
                    </button>
                  </form>
                </div>

                {/* Similar Products Panel */}
                {similarProducts.length > 0 && (
                  <div className="panel" style={{ position: 'sticky', top: 80 }}>
                    <div className="panel-head" style={{ background: '#fff3cd', color: '#856404' }}>
                      ⚠️ Similar Products Found ({similarProducts.length})
                    </div>
                    <div style={{ fontSize: 12, color: '#856404', padding: '8px 16px', background: '#fff3cd', borderBottom: '1px solid #ffc107' }}>
                      These products match your {platformLabel(newPlat)} {newCat} selection. Consider using an existing product instead of creating a duplicate.
                    </div>
                    <div style={{ maxHeight: 500, overflowY: 'auto' }}>
                      {similarProducts.map((sp) => (
                        <div key={sp.id} style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 4 }}>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{sp.title}</div>
                            <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 3, background: '#e8f5e9', color: '#2e7d32' }}>
                              ⭐ {sp.avgRating || 'N/A'}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>
                            by <strong>{sp.vendor.username}</strong> · {sp.totalSales} sold · {sp.stock} in stock
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#3ea136' }}>{money(sp.storePrice)}</div>
                            <button
                              onClick={() => claimProduct(sp.id)}
                              disabled={claiming && claimingProduct === sp.id}
                              style={{
                                background: claiming && claimingProduct === sp.id ? '#ccc' : '#007bff',
                                color: '#fff', border: 'none', borderRadius: 4, padding: '6px 14px',
                                fontSize: 12, fontWeight: 600, cursor: claiming ? 'wait' : 'pointer'
                              }}
                            >
                              {claiming && claimingProduct === sp.id ? 'Adding...' : 'Use Existing'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* DUPLICATE POPUP */}
            {showDuplicatePopup && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                <div style={{ background: '#fff', borderRadius: 8, padding: 24, maxWidth: 500, width: '90%', maxHeight: '80vh', overflowY: 'auto' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#e53e3e' }}>⚠️ Duplicate Product Found!</div>
                  <div style={{ fontSize: 13, color: '#555', marginBottom: 16 }}>
                    We found {similarProducts.length} product(s) similar to yours already in the system:
                  </div>
                  {similarProducts.slice(0, 3).map((sp) => (
                    <div key={sp.id} style={{ padding: 10, background: '#f8f9fa', borderRadius: 6, marginBottom: 8 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{sp.title}</div>
                      <div style={{ fontSize: 11, color: '#666' }}>Vendor: {sp.vendor.username} · Price: {money(sp.storePrice)} · Sold: {sp.totalSales}</div>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    <button
                      onClick={() => { setShowDuplicatePopup(false); }}
                      style={{ flex: 1, background: '#28a745', color: '#fff', border: 'none', borderRadius: 4, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                    >
                      ← Back (Use Existing)
                    </button>
                    <button
                      onClick={async () => {
                        setShowDuplicatePopup(false);
                        // Proceed with creating new listing
                        const res = await fetch("/api/vendor/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: newTitle || autoTitle, platform: newPlat, category: newCat, description: newDesc, vendorPrice: parseFloat(newPrice), countryRegister: newCountry, deliveryFormat: newFormat.trim(), originalMail: newOriginalMail }) });
                        const r = await res.json();
                        if (r.success) { setNewTitle(""); setNewDesc(""); setNewPrice(""); setNewAccounts(""); setNewCountry(""); setNewFormat("email:pass"); setSimilarProducts([]); alert("Listing created! Now upload your accounts."); setTab("my-products"); refresh(); } else alert(r.error);
                      }}
                      style={{ flex: 1, background: '#dc3545', color: '#fff', border: 'none', borderRadius: 4, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                    >
                      Create New Listing →
                    </button>
                  </div>
                  <div style={{ fontSize: 10, color: '#888', marginTop: 8, textAlign: 'center' }}>
                    Note: Creating a duplicate may result in admin review.
                  </div>
                </div>
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
                      <textarea value={uploadAccounts} onChange={e => { setUploadAccounts(e.target.value); setDupes([]); }} className="input" style={{ fontFamily: "monospace", fontSize: 12 }} rows={8} required placeholder={"user123:pass123\nuser456:pass456"} />
                      <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
                        <strong>{uploadAccounts.split("\n").filter(l => l.trim()).length}</strong> new accounts
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                      <button type="button" onClick={checkDuplicates} disabled={checkingDupes || !uploadAccounts.trim()} className="btn btn-secondary" style={{ flex: 1 }}>
                        {checkingDupes ? "Checking..." : `🔍 Check Duplicates${dupes.length > 0 ? ` (${dupes.length} found)` : ''}`}
                      </button>
                      {dupes.length > 0 && (
                        <button type="button" onClick={removeDuplicateLines} className="btn btn-sm" style={{ background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                          Remove Duplicates
                        </button>
                      )}
                    </div>
                    {dupes.length > 0 && (
                      <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 6, padding: 10, marginBottom: 12, fontSize: 11, maxHeight: 150, overflowY: 'auto' }}>
                        <strong style={{ color: '#856404' }}>⚠️ {dupes.length} duplicate(s) found:</strong>
                        {dupes.slice(0, 20).map((d, i) => (
                          <div key={i} style={{ fontFamily: 'monospace', color: '#664d03', padding: '2px 0', borderBottom: '1px solid #ffeeba' }}>
                            #{d.index + 1}: {d.line.substring(0, 60)}{d.line.length > 60 ? '...' : ''}
                            {d.productTitle && <span style={{ color: '#856404', fontSize: 10 }}> (in: {d.productTitle})</span>}
                          </div>
                        ))}
                        {dupes.length > 20 && <div style={{ color: '#856404', padding: '2px 0' }}>...and {dupes.length - 20} more</div>}
                      </div>
                    )}
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
                {/* Success Screen */}
                {wdSuccess ? (
                  <div className="panel" style={{ textAlign: 'center', padding: 32 }}>
                    <div style={{ width: 60, height: 60, borderRadius: 30, background: '#e8f5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                      <span style={{ fontSize: 28, color: '#3ea136' }}>&#10003;</span>
                    </div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#3ea136' }}>Withdrawal Request Submitted!</h2>
                    <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>Your withdrawal request has been submitted successfully.</p>
                    <div style={{ background: '#f9f9f9', borderRadius: 8, padding: 16, textAlign: 'left', maxWidth: 400, margin: '0 auto 16px' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: '#333' }}>Request Details:</div>
                      {[{ l: 'Network', v: wdNetworks.find(n => n.id === wdSuccess.method)?.label || wdSuccess.method },
                        { l: 'Amount', v: `$${wdSuccess.amount.toFixed(2)}` },
                        { l: 'Fee', v: `$${wdSuccess.fee.toFixed(2)}` },
                        { l: 'Net Amount', v: `$${wdSuccess.netAmount.toFixed(2)}` },
                        { l: 'Wallet', v: wdSuccess.wallet },
                        { l: 'Status', v: 'Pending Approval' },
                      ].map(d => (
                        <div key={d.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #eee', fontSize: 12 }}>
                          <span style={{ color: '#888' }}>{d.l}</span>
                          <span style={{ fontWeight: 600, color: '#333', fontFamily: d.l === 'Wallet' ? 'monospace' : 'inherit', fontSize: d.l === 'Wallet' ? 11 : 12 }}>{d.v}</span>
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>Please allow 24-48 hours for processing.</p>
                    <a
                      href={sellerSupportLink ? (sellerSupportLink.startsWith('http') ? sellerSupportLink : `https://t.me/${sellerSupportLink.replace('@', '')}`) : 'https://t.me/accspoint_support'}
                      target='_blank' rel='noopener noreferrer'
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 6, background: '#0088cc', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none', marginBottom: 16 }}
                    >
                      Contact Support (Seller Only)
                    </a>
                    <div><button onClick={() => setWdSuccess(null)} className='btn btn-primary'>New Withdrawal</button></div>
                  </div>
                ) : (
                  <>
                    <div className="panel" style={{ marginBottom: 16 }}>
                      <div className="panel-head">Payout / Withdraw Funds</div>
                      <form onSubmit={withdraw} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ fontSize: 13, color: '#555' }}>Available Balance: <strong style={{ color: '#3ea136', fontSize: 16 }}>{money(data.user.balance)}</strong></div>
                        <div>
                          <label className="label">Select Network</label>
                          <select value={wdNetwork} onChange={e => setWdNetwork(e.target.value)} className="input">
                            {wdNetworks.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                          </select>
                          {wdNetworks.find(n => n.id === wdNetwork) && (
                            <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Min: ${wdNetworks.find(n => n.id === wdNetwork)!.min} · Fee: ${wdNetworks.find(n => n.id === wdNetwork)!.fee}</div>
                          )}
                        </div>
                        <div>
                          <label className="label">Amount (USD)</label>
                          <input type="number" step="0.01" min={wdNetworks.find(n => n.id === wdNetwork)?.min || 10} value={wdAmount} onChange={e => setWdAmount(e.target.value)} className="input" placeholder='0.00' />
                          {wdAmount && parseFloat(wdAmount) > 0 && wdNetworks.find(n => n.id === wdNetwork) && (
                            <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Net after fee: {money(Math.max(0, parseFloat(wdAmount) - (wdNetworks.find(n => n.id === wdNetwork)?.fee || 0)))}</div>
                          )}
                        </div>
                        <div>
                          <label className="label">Wallet Address</label>
                          <input type="text" value={wdWallet} onChange={e => setWdWallet(e.target.value)} className="input" placeholder={wdNetwork === 'trc20' ? 'T...' : '0x...'} style={{ fontFamily: 'monospace', fontSize: 13 }} />
                        </div>
                        {wdError && <div style={{ padding: 10, borderRadius: 6, background: '#fce4ec', color: '#c62828', fontSize: 12 }}>{wdError}</div>}
                        <button type="submit" disabled={wdLoading} className="btn btn-primary" style={{ padding: '12px 0' }}>{wdLoading ? 'Submitting...' : 'Request Withdrawal'}</button>
                      </form>
                    </div>
                    <div className="panel">
                      <div className="panel-head">Withdrawal History ({data.withdrawals.length})</div>
                      {data.withdrawals.length === 0 ? <div style={{ padding: 20, color: '#888', fontSize: 13, textAlign: 'center' }}>No withdrawals yet</div> : data.withdrawals.map(w => (
                        <div key={w.id} className="row" style={{ padding: '10px 16px', borderBottom: '1px solid #f0f0f0' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{wdNetworks.find(n => n.id === w.method)?.label || w.method}</div>
                            <div style={{ fontSize: 11, color: '#888' }}>{new Date(w.createdAt).toLocaleDateString()}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{money(w.amount)}</div>
                            <div style={{ fontSize: 10, color: '#888' }}>Net: {money(w.netAmount)}</div>
                          </div>
                          <span className={`badge badge-${w.status}`} style={{ marginLeft: 8 }}>{w.status}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {/* INVENTORY */}
            {tab === "inventory" && (
              <>
                {/* Inventory Stats Summary */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 16 }}>
                  {[
                    { l: "Total Accounts", v: data.stats.totalAccountsInStock || 0, c: "#1976d2", bg: "#e3f2fd" },
                    { l: "Live (Approved)", v: data.stats.liveAccounts || 0, c: "#3ea136", bg: "#e8f5e9" },
                    { l: "Pending Approval", v: data.stats.pendingApprovalAccounts || 0, c: data.stats.pendingApprovalAccounts > 0 ? "#d97706" : "#666", bg: data.stats.pendingApprovalAccounts > 0 ? "#fffbeb" : "#f5f5f5" },
                    { l: "Accounts Sold", v: data.stats.accountsSold || 0, c: "#333", bg: "#f5f5f5" },
                    { l: "Low Stock", v: data.stockAlerts.lowStock.length, c: data.stockAlerts.lowStock.length > 0 ? "#d97706" : "#666", bg: data.stockAlerts.lowStock.length > 0 ? "#fffbeb" : "#f5f5f5" },
                    { l: "Out of Stock", v: data.stockAlerts.outOfStock.length, c: data.stockAlerts.outOfStock.length > 0 ? "#dc2626" : "#666", bg: data.stockAlerts.outOfStock.length > 0 ? "#fef2f2" : "#f5f5f5" },
                  ].map(s => (
                    <div key={s.l} style={{ background: s.bg, borderRadius: 8, padding: 12, textAlign: "center", border: `1px solid ${s.c}22` }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: s.c }}>{s.v.toLocaleString()}</div>
                      <div style={{ fontSize: 11, color: "#666", fontWeight: 600 }}>{s.l}</div>
                    </div>
                  ))}
                </div>

                {/* Out of Stock Alert */}
                {data.stockAlerts.outOfStock.length > 0 && (
                  <div className="panel" style={{ marginBottom: 16, borderLeft: "3px solid #dc2626" }}>
                    <div className="panel-head" style={{ background: "#991b1b" }}>🚫 Out of Stock ({data.stockAlerts.outOfStock.length})</div>
                    {data.stockAlerts.outOfStock.map(p => (
                      <div key={p.id} className="row">
                        <span style={{ flex: 1, fontSize: 13 }}>{p.title}</span>
                        <button className="btn btn-danger btn-sm" onClick={() => setTab("add-listing")}>Restock</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Low Stock Alert */}
                {data.stockAlerts.lowStock.length > 0 && (
                  <div className="panel" style={{ marginBottom: 16, borderLeft: "3px solid #d97706" }}>
                    <div className="panel-head" style={{ background: "#92400e" }}>📉 Low Stock ({data.stockAlerts.lowStock.length})</div>
                    {data.stockAlerts.lowStock.map(p => (
                      <div key={p.id} className="row">
                        <span style={{ flex: 1, fontSize: 13 }}>{p.title}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#d97706" }}>{p.stock} accounts left</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* All Products Inventory */}
                <div className="panel">
                  <div className="panel-head">All Products Inventory ({data.products.length})</div>
                  {data.products.length === 0 ? (
                    <div style={{ padding: 20, color: "#888", fontSize: 13, textAlign: "center" }}>No products yet</div>
                  ) : (
                    <>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 80px", gap: 8, padding: "8px 16px", fontSize: 11, fontWeight: 700, color: "#666", borderBottom: "1px solid #eee" }}>
                        <span>Product</span>
                        <span style={{ textAlign: "center" }}>Stock</span>
                        <span style={{ textAlign: "center" }}>Status</span>
                        <span style={{ textAlign: "center" }}>Revenue</span>
                      </div>
                      {data.products.map(p => (
                        <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 80px", gap: 8, padding: "10px 16px", borderBottom: "1px solid #f5f5f5", alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{p.title}</div>
                            <div style={{ fontSize: 11, color: "#888" }}>{p.platform} · {money(p.vendorPrice)}</div>
                          </div>
                          <div style={{ textAlign: "center" }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: p.stock === 0 ? "#dc2626" : p.stock <= 5 ? "#d97706" : "#3ea136" }}>
                              {p.stock}
                            </span>
                          </div>
                          <div style={{ textAlign: "center" }}>
                            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: p.status === "approved" ? "#e8f5e9" : p.status === "pending" ? "#fffbeb" : "#fef2f2", color: p.status === "approved" ? "#3ea136" : p.status === "pending" ? "#d97706" : "#dc2626" }}>
                              {p.status}
                            </span>
                          </div>
                          <div style={{ textAlign: "center", fontSize: 12, fontWeight: 600 }}>
                            {money(p.vendorPrice * (data.stats.totalUnits || 0))}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
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
