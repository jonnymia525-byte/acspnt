"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useStore } from "@/store";
import { money, calcStorePrice } from "@/lib/money";
import { platformLabel } from "@/lib/totp";
<<<<<<< ours
import { ProfileSettings } from "../widgets/profile-settings";
=======
import { NoticeBar } from "@/components/accs/widgets/notice-bar";
import { Toaster, toast } from "@/components/accs/widgets/toast";

>>>>>>> theirs

interface Data {
  user: { id: string; username: string; name: string; email: string; role: string; balance: number; vendorStatus: string; twoFaEnabled: boolean };
  stats: { balance: number; totalRevenue: number; totalUnits: number; totalProducts: number; activeProducts: number; avgRating: number; pendingProducts: number; pendingWithdrawals: number; lowStockCount: number; totalAccountsInStock: number; accountsSold: number; pendingApprovalAccounts: number; liveAccounts: number };
  products: Array<{ id: string; title: string; platform: string; category: string; vendorPrice: number; storePrice: number; stock: number; status: string; soldCount?: number; totalUploaded?: number; accountsData?: string; sku?: string }>;
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
<<<<<<< ours
  { key: "login-history", label: "Login History" },
  { key: "settings", label: "Settings" },
];

export function VendorDashboard() {
  const setUser = useStore(s => s.setUser);
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState<Data | null>(null);
=======
  { key: "notifications", label: "Notifications" },
];

export function VendorDashboard() {
  const { setUser, theme, toggleTheme } = useStore();
  const [tab, setTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('tab') || 'overview';
    }
    return 'overview';
  });
  const [data, setData] = useState<Data | null>(null);
  const [notifList, setNotifList] = useState<Array<{ id: string; title: string; message: string; section: string; createdAt: string }>>([]);

  // Add listing form
>>>>>>> theirs
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
  const [uploadProgress, setUploadProgress] = useState(0);
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
<<<<<<< ours
  const [salesPeriod, setSalesPeriod] = useState("7d");
  const [salesData, setSalesData] = useState<any>(null);
=======

  // My Products table: search + sort + filter
  const [productSearch, setProductSearch] = useState("");
  const [sortKey, setSortKey] = useState<string>("title");
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [productStatusFilter, setProductStatusFilter] = useState("all");

  // Individual account detail modal
  const [accountModalProduct, setAccountModalProduct] = useState<any | null>(null);
  const [accountEditIdx, setAccountEditIdx] = useState<number | null>(null);
  const [accountEditVal, setAccountEditVal] = useState("");
  const [accountSaving, setAccountSaving] = useState(false);

  // Sales overview
  const [salesPeriod, setSalesPeriod] = useState("7d");
  const [salesData, setSalesData] = useState<any>(null);



  const refresh = () => fetch("/api/dashboard/vendor").then(r => r.json()).then(d => { if (d.user) { setData(d); setUser(d.user); } }).catch(() => {});

  const saveAccountLine = async (action: "edit" | "delete", idx: number) => {
    if (!accountModalProduct) return;
    setAccountSaving(true);
    try {
      const res = await fetch("/api/vendor/products/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "edit" ? { action, productId: accountModalProduct.id, index: idx, newValue: accountEditVal } : { action, productId: accountModalProduct.id, index: idx }),
      });
      const r = await res.json();
      if (r.success) {
        setAccountEditIdx(null);
        setAccountEditVal("");
        // Update local modal product data
        setAccountModalProduct((prev: any) => {
          if (!prev) return prev;
          const lines = (prev.accountsData || "").split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
          if (action === "edit" && idx >= 0 && idx < lines.length) lines[idx] = accountEditVal.trim();
          if (action === "delete") lines.splice(idx, 1);
          return { ...prev, accountsData: lines.join("\n"), stock: lines.length };
        });
        refresh();
      } else {
        toast(r.error || "Failed", "error");
      }
    } catch { toast("Error saving", "error"); }
    setAccountSaving(false);
  };

  useEffect(() => { refresh(); }, [setUser]);

>>>>>>> theirs
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

<<<<<<< ours
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
=======
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

  // Fetch withdrawal networks on mount
>>>>>>> theirs
  useEffect(() => {
    fetch("/api/withdrawals").then(r => r.json()).then(d => {
      if (d.networks) setWdNetworks(d.networks);
    }).catch(() => {});
  }, []);

<<<<<<< ours
=======
  useEffect(() => {
    if (tab === "notifications") {
      fetch("/api/notifications?markRead=all").then(r => r.json()).then(d => {
        setNotifList(d.notifications || []);
      }).catch(() => {});
    }
  }, [tab]);

>>>>>>> theirs
  if (!data) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f5" }}>Loading...</div>;

  if (data.user.vendorStatus !== "approved") {
    return (
      <div style={{ minHeight: "100vh", background: "#f5f5f5" }}>
        <Toaster />
        <div className="topbar">
          <Link href="/" style={{ color: "#fff", fontSize: 12, padding: "4px 12px", background: "#3ea136", borderRadius: 3, textDecoration: "none", fontWeight: 600 }}>Store</Link>
          <span style={{ color: "#5fa830", fontSize: 12, fontWeight: 700 }}>${data.user.balance.toFixed(2)}</span>
<<<<<<< ours
=======
          <span style={{ color: "#888", fontSize: 11 }}>{data.user.name || data.user.username}</span>
          <button onClick={toggleTheme} style={{ background: "none", border: "1px solid #555", color: "#bbb", borderRadius: 3, padding: "2px 8px", fontSize: 11, cursor: "pointer" }}>{theme === "dark" ? "☀️ Light" : "🌙 Dark"}</button>
>>>>>>> theirs
        </div>
        
        <NoticeBar />
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

<<<<<<< ours
=======
  // My Products: search + status filter + sort
  let visibleProducts = data.products;
  const productQuery = productSearch.toLowerCase().trim();
  if (productQuery) {
    visibleProducts = visibleProducts.filter(p => `${p.title || ""} ${p.platform || ""} ${p.category || ""} ${p.status || ""}`.toLowerCase().includes(productQuery));
  }
  if (productStatusFilter === "out") visibleProducts = visibleProducts.filter(p => p.stock === 0);
  else if (productStatusFilter === "approved") visibleProducts = visibleProducts.filter(p => p.status === "approved");
  else if (productStatusFilter === "pending") visibleProducts = visibleProducts.filter(p => p.status === "pending");
  visibleProducts = [...visibleProducts].sort((a, b) => {
    const getVal = (p: Data["products"][number]) => {
      switch (sortKey) {
        case "stock": return p.stock;
        case "soldCount": return p.soldCount || 0;
        case "vendorPrice": return p.vendorPrice;
        case "totalUploaded": return p.totalUploaded ?? ((p.soldCount || 0) + p.stock);
        default: return (p.title || "").toLowerCase();
      }
    };
    const av = getVal(a), bv = getVal(b);
    if (av < bv) return -1 * sortDir;
    if (av > bv) return 1 * sortDir;
    return 0;
  });

  // Claim an existing product (use existing)
  const claimProduct = async (productId: string) => {
    const price = prompt("Enter your vendor price ($):" , "10");
    if (!price) return;
    const vp = parseFloat(price);
    if (!vp || vp <= 0) { toast("Invalid price", "error"); return; }
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
        toast("Product added to your store! Upload your accounts and wait for admin approval.", "success");
        refresh();
        setSimilarProducts(prev => prev.filter(p => p.id !== productId));
      } else {
        toast(r.error || "Failed to claim product", "error");
      }
    } catch { toast("Network error", "error"); }
    setClaiming(false);
    setClaimingProduct(null);
  };

  const createProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate delivery format: must be colon-separated alphanumeric names
    if (!newFormat.trim() || !/^([a-zA-Z0-9_]+)(:[a-zA-Z0-9_]+)*$/.test(newFormat.trim())) {
      toast("Delivery format must use colon-separated names (e.g. name:pass:email:emailpass:gender)", "error");
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
    if (r.success) { setNewTitle(""); setNewDesc(""); setNewPrice(""); setNewAccounts(""); setNewCountry(""); setNewFormat("email:pass"); setSimilarProducts([]); setShowDuplicatePopup(false); toast("Listing created! Now upload your accounts.", "success"); setTab("my-products"); refresh(); } else toast(r.error, "error");
  };

  const uploadMore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadProductId || !uploadAccounts.trim()) return;
    setUploading(true);
    setUploadProgress(0);
    const timer = window.setInterval(() => {
      setUploadProgress(prev => Math.min(95, prev + Math.floor(Math.random() * 12) + 5));
    }, 300);
    try {
      const res = await fetch("/api/vendor/products/upload-more", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: uploadProductId, accountsData: uploadAccounts }) });
      const r = await res.json();
      setUploadProgress(100);
      window.clearInterval(timer);
      setUploading(false);
      if (r.success) { toast(`Uploaded ${r.added} accounts. Pending admin approval.`, "success"); setUploadProductId(null); setUploadAccounts(""); setDupes([]); refresh(); } else toast(r.error, "error");
    } catch {
      window.clearInterval(timer);
      setUploading(false);
      toast("Upload failed", "error");
    }
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
        toast("No duplicates found!", "success");
      } else {
        toast(`Found ${r.duplicateCount} duplicate(s) out of ${r.total} accounts.`, "info");
      }
    } catch {
      toast("Failed to check duplicates", "error");
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
    if (!vp || vp <= 0) return toast("Invalid price", "error");
    const res = await fetch("/api/vendor/products", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, vendorPrice: vp }) });
    const r = await res.json();
    if (r.success) { setEditProductId(null); toast("Price updated", "success"); refresh(); } else toast(r.error, "error");
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

  const vp = parseFloat(newPrice) || 0;
>>>>>>> theirs
  const autoTitle = newPlat && newCat ? `${platformLabel(newPlat)} ${newCat.charAt(0).toUpperCase() + newCat.slice(1)} Account` : "";

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5" }}>
<<<<<<< ours
=======
      <Toaster />
      {/* Top Bar */}
>>>>>>> theirs
      <div className="topbar">
        <div className="news-link"><span className="news-dot" /> News</div>
        <Link href="/" style={{ color: "#fff", fontSize: 12, padding: "4px 12px", background: "#3ea136", borderRadius: 3, textDecoration: "none", fontWeight: 600 }}>Store</Link>
        <span style={{ color: "#5fa830", fontSize: 12, fontWeight: 700 }}>{money(data.user.balance)}</span>
        <span className="badge badge-pending" style={{ fontSize: 10 }}>VENDOR</span>
        <span style={{ color: "#888", fontSize: 11 }}>{data.user.name}</span>
<<<<<<< ours
=======
        <button onClick={toggleTheme} style={{ background: "none", border: "1px solid #555", color: "#bbb", borderRadius: 3, padding: "2px 8px", fontSize: 11, cursor: "pointer" }}>{theme === "dark" ? "☀️ Light" : "🌙 Dark"}</button>
        <Link href="/" style={{ color: "#aaa", fontSize: 11 }}>Logout</Link>
>>>>>>> theirs
      </div>
      <NoticeBar />

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
<<<<<<< ours
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
=======
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
                        if (r.success) { setNewTitle(""); setNewDesc(""); setNewPrice(""); setNewAccounts(""); setNewCountry(""); setNewFormat("email:pass"); setSimilarProducts([]); toast("Listing created! Now upload your accounts.", "success"); setTab("my-products"); refresh(); } else toast(r.error, "error");
                      }}
                      style={{ flex: 1, background: '#dc3545', color: '#fff', border: 'none', borderRadius: 4, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                    >
                      Create New Listing →
                    </button>
>>>>>>> theirs
                  </div>
                  <div>
                    <label className="label">Category</label>
                    <select value={newCat} onChange={e => setNewCat(e.target.value)} className="input">
                      {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                    </select>
                  </div>
                </div>
<<<<<<< ours
                <div style={{ marginTop: 12 }}>
                  <label className="label">Title</label>
                  <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="input" placeholder={autoTitle} />
=======
              </div>
            )}

            {tab === "add-listing" && data.user.vendorStatus !== "approved" && (
              <div className="panel"><div style={{ padding: 32, textAlign: "center", color: "#888" }}>Vendor approval required to add products.</div></div>
            )}

            {/* MY PRODUCTS */}
            {tab === "my-products" && (
              <div className="panel">
                <div className="panel-head">My Products ({data.products.length})</div>
                <div style={{ padding: "12px 16px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", borderBottom: "1px solid #eee" }}>
                  <input type="text" placeholder="Search products..." value={productSearch} onChange={e => setProductSearch(e.target.value)} className="input" style={{ flex: 1, minWidth: 180 }} />
                  <select value={sortKey} onChange={e => setSortKey(e.target.value)} className="input" style={{ width: 110 }}>
                    <option value="title">Title</option>
                    <option value="stock">Stock</option>
                    <option value="soldCount">Sold</option>
                    <option value="vendorPrice">Price</option>
                  </select>
                  <button onClick={() => setSortDir(d => (d === 1 ? -1 : 1))} className="btn btn-sm btn-secondary" title="Toggle sort direction" style={{ padding: "4px 10px" }}>{sortDir === 1 ? "↑" : "↓"}</button>
                  <select value={productStatusFilter} onChange={e => setProductStatusFilter(e.target.value)} className="input" style={{ width: 160 }}>
                    <option value="all">All Status</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="out">Out of Stock</option>
                  </select>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table className="tbl">
                    <thead><tr>
                      <th>Product</th>
                      <th>Platform</th>
                      <th>Category</th>
                      <th style={{ cursor: "pointer" }} onClick={() => { setSortKey("vendorPrice"); setSortDir(d => (d === 1 ? -1 : 1)); }}>Your Price{sortKey === "vendorPrice" ? (sortDir === 1 ? " ↑" : " ↓") : ""}</th>
                      <th>Store Price</th>
                      <th style={{ cursor: "pointer" }} onClick={() => { setSortKey("stock"); setSortDir(d => (d === 1 ? -1 : 1)); }}>Stock{sortKey === "stock" ? (sortDir === 1 ? " ↑" : " ↓") : ""}</th>
                      <th style={{ cursor: "pointer" }} onClick={() => { setSortKey("soldCount"); setSortDir(d => (d === 1 ? -1 : 1)); }}>Sold{sortKey === "soldCount" ? (sortDir === 1 ? " ↑" : " ↓") : ""}</th>
                      <th style={{ cursor: "pointer" }} onClick={() => { setSortKey("totalUploaded"); setSortDir(d => (d === 1 ? -1 : 1)); }}>Uploaded{sortKey === "totalUploaded" ? (sortDir === 1 ? " ↑" : " ↓") : ""}</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr></thead>
                    <tbody>{visibleProducts.length === 0 ? (
                      <tr><td colSpan={10} style={{ padding: 20, textAlign: "center", color: "#888", fontSize: 13 }}>No products match your search</td></tr>
                    ) : visibleProducts.map(p => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600 }}>
                          {p.title}
                          <div style={{ fontSize: 10, color: "#aaa" }}>#{p.sku || "N/A"}</div>
                        </td>
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
                            <span style={{ cursor: "pointer", color: "#3ea136", fontWeight: 600, borderBottom: "1px dashed #3ea136" }} onClick={() => { setEditProductId(p.id); setEditPrice(String(p.vendorPrice)); }}>✏️ {money(p.vendorPrice)}</span>
                          )}
                        </td>
                        <td style={{ fontWeight: 600 }}>{money(p.storePrice)}</td>
                        <td>
                          <span style={{ cursor: "pointer", color: "#1976d2", fontWeight: 600, textDecoration: "underline" }} onClick={() => { setAccountModalProduct(p); setAccountEditIdx(null); setAccountEditVal(""); }}>{p.stock} pcs</span>
                        </td>
                        <td style={{ color: "#666" }}>{p.soldCount || 0}</td>
                        <td style={{ color: "#666" }}>{p.totalUploaded ?? ((p.soldCount || 0) + p.stock)}</td>
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
>>>>>>> theirs
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
<<<<<<< ours
=======
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
                    {uploading && (
                      <div style={{ width: "100%", background: "#e0e0e0", borderRadius: 4, height: 8, overflow: "hidden", marginTop: 8 }}>
                        <div style={{ width: `${uploadProgress}%`, background: "#5fa830", height: "100%", transition: "width 0.2s" }} />
                      </div>
                    )}
                    <button type="submit" className="btn btn-primary" disabled={uploading || !uploadAccounts.trim()}>
                      {uploading ? "Uploading..." : "Upload Accounts (Pending Review)"}
                    </button>
                  </form>
>>>>>>> theirs
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
<<<<<<< ours
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
=======
                </div>
              </>
            )}

            {/* NOTIFICATIONS */}
            {tab === "notifications" && (
              <div className="panel">
                <div className="panel-head">Notifications</div>
                {notifList.length === 0 ? <div style={{ padding: 20, color: "#888", fontSize: 13, textAlign: "center" }}>No notifications</div> : notifList.map(n => (
                  <div key={n.id} className="row">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{n.title}</div>
                      <div style={{ fontSize: 11, color: "#888" }}>{n.message}</div>
                    </div>
                    <span style={{ fontSize: 10, color: "#aaa" }}>{new Date(n.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>

      {/* Individual Account Detail Modal */}
      {accountModalProduct && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setAccountModalProduct(null)}>
          <div style={{ background: "#fff", borderRadius: 6, width: 640, maxWidth: "92vw", maxHeight: "85vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #eee", fontWeight: 600, fontSize: 15, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Accounts — {accountModalProduct.title}</span>
              <button onClick={() => setAccountModalProduct(null)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#888" }}>×</button>
            </div>
            <div style={{ padding: "8px 16px", borderBottom: "1px solid #eee", fontSize: 12, color: "#666" }}>
              Stock: <strong>{accountModalProduct.stock}</strong> · Editing/deleting an account sets the product back to <strong>pending</strong> for admin re-approval.
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {(accountModalProduct.accountsData || "").split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean).length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: "#888", fontSize: 13 }}>No accounts uploaded yet</div>
              ) : (accountModalProduct.accountsData || "").split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean).map((line: string, idx: number) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", borderBottom: "1px solid #f5f5f5" }}>
                  <span style={{ width: 30, color: "#aaa", fontSize: 11, flexShrink: 0 }}>#{idx + 1}</span>
                  {accountEditIdx === idx ? (
                    <>
                      <input type="text" value={accountEditVal} onChange={e => setAccountEditVal(e.target.value)} className="input" style={{ flex: 1, fontSize: 12, fontFamily: "monospace", padding: "4px 8px" }} autoFocus />
                      <button onClick={() => saveAccountLine("edit", idx)} disabled={accountSaving} style={{ background: "#3ea136", color: "#fff", border: "none", borderRadius: 4, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Save</button>
                      <button onClick={() => setAccountEditIdx(null)} style={{ background: "#888", color: "#fff", border: "none", borderRadius: 4, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <span style={{ flex: 1, fontSize: 12, fontFamily: "monospace", wordBreak: "break-all", color: "#333" }}>{line}</span>
                      <button onClick={() => { setAccountEditIdx(idx); setAccountEditVal(line); }} style={{ background: "#f0f0f0", border: "1px solid #ddd", borderRadius: 4, padding: "4px 10px", fontSize: 11, cursor: "pointer", color: "#333" }}>Edit</button>
                      <button onClick={() => { if (confirm(`Delete account #${idx + 1}? This will set the product to pending for re-approval.`)) saveAccountLine("delete", idx); }} disabled={accountSaving} style={{ background: "#dc3545", color: "#fff", border: "none", borderRadius: 4, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>Delete</button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

>>>>>>> theirs
    </div>
  );
}
