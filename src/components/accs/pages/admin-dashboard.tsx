"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { money } from "@/lib/money";
import { platformLabel } from "@/lib/totp";

interface User {
  id: string; username: string; email: string; name: string; role: string;
  balance: number; vendorStatus: string; registeredAt: string; lastLogin: string | null;
  vendorCountry: string; contactMethod: string; contactDetail: string;
  muted: boolean; mutedUntil: string | null; blocked: boolean; createdAt: string; twoFaEnabled?: boolean;
}

interface Product {
  id: string; title: string; description: string; platform: string; category: string;
  vendorPrice: number; storePrice: number; stock: number; status: string;
  deliveryFormat: string; countryRegister: string; originalMail: boolean;
  country: string; createdAt: string; accountsData?: string;
  vendor: { id: string; username: string; name: string; vendorStatus: string };
  isDuplicate?: boolean;
  purchases?: Array<{ id: string; quantity: number; total: number; status: string; createdAt: string; buyer: { username: string } }>;
  reviews?: Array<{ id: string; rating: number; comment: string; createdAt: string; buyer: { username: string } }>;
}

interface Order {
  id: string; total: number; quantity: number; status: string; createdAt: string;
  product: { title: string; platform: string; vendor: { username: string } };
  buyer: { username: string };
}

interface Withdrawal {
  id: string; amount: number; netAmount: number; fee: number; method: string;
  status: string; createdAt: string; user: { username: string };
}

interface VendorRequest {
  id: string; firstName: string; lastName: string; email: string;
  productDetails: string; userId: string; status: string;
  user: { username: string };
}

interface UserDetail extends User {
  purchases: Array<{ id: string; quantity: number; total: number; status: string; createdAt: string; product: { title: string; platform: string } }>;
  deposits: Array<{ id: string; amount: number; method: string; status: string; createdAt: string }>;
  withdrawals: Array<{ id: string; amount: number; netAmount: number; fee: number; method: string; status: string; createdAt: string }>;
  reviews: Array<{ id: string; rating: number; comment: string; createdAt: string; product: { title: string } }>;
  products: Array<{ id: string; title: string; platform: string; storePrice: number; stock: number; status: string; createdAt: string }>;
  activityLogs: Array<{ id: string; action: string; description: string; createdAt: string }>;
  sentMessages: Array<{ id: string; title: string; message: string; read: boolean; createdAt: string }>;
  disputes: Array<{ id: string; reason: string; status: string; resolution: string | null; createdAt: string }>;
}

const TABS = ["overview", "users", "vendors", "products", "orders", "withdrawals", "coupons", "deposits", "notices", "activity", "sales"];

export function AdminDashboard() {
  const [tab, setTab] = useState("overview");
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [vendorRequests, setVendorRequests] = useState<VendorRequest[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  // Detail panels
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Edit modal
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editBalance, setEditBalance] = useState("");
  const [editRole, setEditRole] = useState("");

  // Topup
  const [topupUser, setTopupUser] = useState<User | null>(null);
  const [topupAmount, setTopupAmount] = useState("");

  // Message
  const [msgUser, setMsgUser] = useState<User | null>(null);
  const [msgTitle, setMsgTitle] = useState("");
  const [msgBody, setMsgBody] = useState("");

  // Notice
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeBody, setNoticeBody] = useState("");
  const [noticeType, setNoticeType] = useState("info");
  const [noticeTarget, setNoticeTarget] = useState("all");
  const [noticeUserIds, setNoticeUserIds] = useState<string[]>([]);

  // Reject product
  const [rejectProduct, setRejectProduct] = useState<Product | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Edit product
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [epTitle, setEpTitle] = useState("");
  const [epDesc, setEpDesc] = useState("");
  const [epPrice, setEpPrice] = useState("");
  const [epStock, setEpStock] = useState("");

  // Coupon form
  const [couponCode, setCouponCode] = useState("");
  const [couponType, setCouponType] = useState("percentage");
  const [couponValue, setCouponValue] = useState("");
  const [couponMax, setCouponMax] = useState("100");
  const [coupons, setCoupons] = useState<any[]>([]);

  // Mute
  const [muteUser, setMuteUser] = useState<User | null>(null);
  const [muteDays, setMuteDays] = useState(0);

  // Vendor reject with mute
  const [vrMuteDays, setVrMuteDays] = useState(0);
  const [vrRejectId, setVrRejectId] = useState<string | null>(null);
  const [vrRejectReason, setVrRejectReason] = useState("");

  // Bulk notice selection
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  // Sales overview
  const [salesPeriod, setSalesPeriod] = useState("7d");
  const [salesData, setSalesData] = useState<any>(null);

  const fetchSalesOverview = async (period: string) => {
    setSalesPeriod(period);
    try {
      const res = await fetch(`/api/sales-overview?period=${period}&scope=all`);
      if (!res.ok) { setSalesData(null); return; }
      const d = await res.json();
      setSalesData(d.error ? null : d);
    } catch { setSalesData(null); }
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [dashRes, usersRes, productsRes] = await Promise.all([
        fetch("/api/dashboard/admin").then(r => r.json()),
        fetch("/api/admin/users?action=list").then(r => r.json()),
        fetch("/api/admin/products?action=list").then(r => r.json()),
      ]);
      setStats(dashRes.stats);
      setRecentActivity(dashRes.recentActivity || []);
      setOrders(dashRes.recentOrders || []);
      setWithdrawals(dashRes.allWithdrawals || []);
      setVendorRequests(dashRes.pendingVendorRequests || []);
      setCoupons(dashRes.coupons || []);
      setUsers(usersRes.users || []);
      setProducts(productsRes.products || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  // Filter helpers
  const filteredUsers = users.filter(u =>
    !search || u.username.toLowerCase().includes(search.toLowerCase()) || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  const filteredProducts = products.filter(p =>
    productFilter === "all" || p.status === productFilter
  );

  // Actions
  const doUserAction = async (action: string, userId: string, extra: any = {}) => {
    const res = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, userId, ...extra }) });
    const r = await res.json();
    if (r.success) { loadAll(); } else alert(r.error);
    return r;
  };

  const doProductAction = async (action: string, productId: string, extra: any = {}) => {
    const res = await fetch("/api/admin/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, productId, ...extra }) });
    const r = await res.json();
    if (r.success) { loadAll(); } else alert(r.error);
    return r;
  };

  const loadUserDetail = async (userId: string) => {
    const res = await fetch(`/api/admin/users?action=detail&userId=${userId}`);
    const r = await res.json();
    if (r.user) setSelectedUser(r);
  };

  const loadProductDetail = async (productId: string) => {
    const res = await fetch(`/api/admin/products?action=detail&productId=${productId}`);
    const r = await res.json();
    if (r.product) setSelectedProduct(r.product);
  };

  const sendNotice = async () => {
    if (!noticeTitle || !noticeBody) return alert("Title and message required");
    const res = await fetch("/api/admin/notices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: noticeTitle, message: noticeBody, noticeType, target: noticeTarget, userIds: noticeUserIds }) });
    const r = await res.json();
    if (r.success) { alert("Notice sent!"); setNoticeTitle(""); setNoticeBody(""); loadAll(); } else alert(r.error);
  };

  const createCoupon = async () => {
    if (!couponCode || !couponValue) return alert("Code and value required");
    const res = await fetch("/api/admin/actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create_coupon", code: couponCode, type: couponType, value: parseFloat(couponValue), maxUses: parseInt(couponMax) }) });
    const r = await res.json();
    if (r.success) { setCouponCode(""); setCouponValue(""); loadAll(); } else alert(r.error);
  };

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading admin panel...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      {/* Top Bar */}
      <div className="topbar">
        <div className="news-link"><span className="news-dot" /> News</div>
        <Link href="/" style={{ color: "#fff", fontSize: 12, padding: "4px 12px", background: "#3ea136", borderRadius: 3, textDecoration: "none", fontWeight: 600 }}>Store</Link>
        <span style={{ fontSize: 10, fontWeight: 700, background: "#e53e3e", color: "#fff", padding: "2px 6px", borderRadius: 4 }}>ADMIN</span>
        <Link href="/" style={{ color: "#aaa", fontSize: 11 }}>Logout</Link>
      </div>

      {/* Nav Bar */}
      <div className="navbar">
        <Link href="/?page=support" className="nav-newticket">New ticket / Ask a question</Link>
        <Link href="/" className="nav-home">Home</Link>
        <Link href="/?page=faq">FAQ</Link>
        <Link href="/?page=rules">Terms of use</Link>
      </div>

      {/* Logo Bar */}
      <div style={{ background: "#f0f0f0", borderBottom: "1px solid #ddd", padding: "8px 0" }}>
        <div className="header-main">
          <Link href="/" className="logo-box"><span className="logo-accs">Accs</span><span className="logo-point">Point</span></Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="wrap" style={{ paddingTop: 16, paddingBottom: 16 }}>
        {/* Mobile Tabs */}
        <div className="show-mobile" style={{ width: "100%", gap: 4, padding: "0 0 12px", overflowX: "auto" }}>
          {TABS.map(t => <button key={t} onClick={() => setTab(t)} className={`btn btn-sm ${tab === t ? "btn-primary" : "btn-secondary"}`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>)}
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          {/* Sidebar */}
          <div className="side hide-mobile">
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #333" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>Admin Panel</div>
            </div>
            {TABS.map(t => <div key={t} className={`side-item ${tab === t ? "on" : ""}`} onClick={() => setTab(t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</div>)}
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* ==================== OVERVIEW ==================== */}
            {tab === "overview" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 16 }}>
                  {stats && [
                    { l: "Users", v: stats.totalUsers, c: "#333" },
                    { l: "Vendors", v: stats.totalVendors, c: "#333" },
                    { l: "Products", v: stats.totalProducts, c: "#333" },
                    { l: "Live", v: stats.approvedProducts, c: "#3ea136" },
                    { l: "Pending", v: stats.pendingProducts, c: "#eab308" },
                    { l: "Orders", v: stats.totalPurchases, c: "#333" },
                    { l: "Revenue", v: money(stats.totalRevenue), c: "#3ea136" },
                    { l: "Open Disputes", v: stats.openDisputes, c: stats.openDisputes > 0 ? "#e53e3e" : "#333" },
                  ].map(s => <div key={s.l} className="stat"><div className="num" style={{ color: s.c }}>{s.v}</div><div className="lbl">{s.l}</div></div>)}
                </div>
                <div className="panel" style={{ marginBottom: 16 }}>
                  <div className="panel-head">Recent Activity</div>
                  {recentActivity.slice(0, 10).map((a: any) => (
                    <div key={a.id} className="row">
                      <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 600 }}>{a.action}</div><div style={{ fontSize: 11, color: "#888" }}>{a.description}</div></div>
                      <span style={{ fontSize: 11, color: "#aaa" }}>{new Date(a.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ==================== USERS ==================== */}
            {tab === "users" && !selectedUser && (
              <>
                <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
                  <input type="text" placeholder="Search users by name, username, email..." value={search} onChange={e => setSearch(e.target.value)} className="input" style={{ flex: 1 }} />
                  <span style={{ fontSize: 12, color: "#888" }}>{filteredUsers.length} users</span>
                </div>
                <div className="panel">
                  <div className="panel-head">All Users ({filteredUsers.length})</div>
                  <div style={{ overflowX: "auto" }}>
                    <table className="tbl">
                      <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Balance</th><th>Registered</th><th>Status</th><th>Actions</th></tr></thead>
                      <tbody>
                        {filteredUsers.map(u => (
                          <tr key={u.id} style={{ cursor: "pointer" }} onClick={() => loadUserDetail(u.id)}>
                            <td style={{ fontWeight: 600 }}>{u.name || u.username}</td>
                            <td style={{ fontSize: 12 }}>{u.email}</td>
                            <td><span className={`badge badge-${u.role === "admin" ? "approved" : u.role === "vendor" ? "pending" : ""}`}>{u.role}</span></td>
                            <td style={{ fontWeight: 600, color: "#3ea136" }}>{money(u.balance)}</td>
                            <td style={{ fontSize: 11 }}>{new Date(u.registeredAt).toLocaleDateString()}</td>
                            <td>
                              {u.blocked ? (
                                <span className="badge badge-rejected">Blocked</span>
                              ) : u.muted ? (
                                <span className="badge badge-pending" title={u.mutedUntil ? `Until ${new Date(u.mutedUntil).toLocaleDateString()}` : "Permanent"}>Muted{u.mutedUntil ? ` ${(Math.ceil((new Date(u.mutedUntil).getTime() - Date.now()) / 86400000))}d` : " perm"}</span>
                              ) : (
                                <span className="badge badge-approved">Active</span>
                              )}
                            </td>
                            <td onClick={e => e.stopPropagation()}>
                              <div style={{ display: "flex", gap: 4 }}>
                                <button className="btn btn-secondary btn-sm" onClick={() => { setEditUser(u); setEditName(u.name); setEditUsername(u.username); setEditEmail(u.email); setEditBalance(String(u.balance)); setEditRole(u.role); setEditPassword(""); }}>Edit</button>
                                <button className="btn btn-primary btn-sm" onClick={() => { setTopupUser(u); setTopupAmount(""); }}>Topup</button>
                                <button className="btn btn-secondary btn-sm" onClick={() => { setMsgUser(u); setMsgTitle(""); setMsgBody(""); }}>Msg</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* User Detail Panel */}
            {tab === "users" && selectedUser && (
              <div>
                <button onClick={() => setSelectedUser(null)} className="btn btn-secondary btn-sm" style={{ marginBottom: 12 }}>&larr; Back to Users</button>
                <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                  <div className="panel" style={{ flex: 1, minWidth: 200, padding: 16 }}>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{selectedUser.name}</div>
                    <div style={{ fontSize: 12, color: "#888" }}>@{selectedUser.username}</div>
                    <div style={{ fontSize: 12, color: "#888" }}>{selectedUser.email}</div>
                    <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div><div style={{ fontSize: 11, color: "#888" }}>Balance</div><div style={{ fontSize: 14, fontWeight: 700, color: "#3ea136" }}>{money(selectedUser.balance)}</div></div>
                      <div><div style={{ fontSize: 11, color: "#888" }}>Role</div><div style={{ fontSize: 14, fontWeight: 600 }}>{selectedUser.role}</div></div>
                      <div><div style={{ fontSize: 11, color: "#888" }}>Registered</div><div style={{ fontSize: 12 }}>{new Date(selectedUser.registeredAt).toLocaleDateString()}</div></div>
                      <div><div style={{ fontSize: 11, color: "#888" }}>Last Login</div><div style={{ fontSize: 12 }}>{selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleString() : "Never"}</div></div>
                      <div><div style={{ fontSize: 11, color: "#888" }}>Country</div><div style={{ fontSize: 12 }}>{selectedUser.vendorCountry || "Global"}</div></div>
                      <div><div style={{ fontSize: 11, color: "#888" }}>2FA</div><div style={{ fontSize: 12 }}>{selectedUser.twoFaEnabled ? "Enabled" : "Disabled"}</div></div>
                    </div>
                    <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button className="btn btn-primary btn-sm" onClick={() => { setEditUser(selectedUser); setEditName(selectedUser.name); setEditUsername(selectedUser.username); setEditEmail(selectedUser.email); setEditBalance(String(selectedUser.balance)); setEditRole(selectedUser.role); setEditPassword(""); }}>Edit User</button>
                      <button className="btn btn-primary btn-sm" onClick={() => { setTopupUser(selectedUser); setTopupAmount(""); }}>Top-up Balance</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => { setMsgUser(selectedUser); setMsgTitle(""); setMsgBody(""); }}>Send Message</button>
                      {selectedUser.muted ? (
                        <button className="btn btn-secondary btn-sm" onClick={() => doUserAction("unmute", selectedUser.id)}>Unmute</button>
                      ) : (
                        <button className="btn btn-secondary btn-sm" onClick={() => { setMuteUser(selectedUser); setMuteDays(0); }}>Mute</button>
                      )}
                      <button className="btn btn-danger btn-sm" onClick={() => doUserAction("toggle_block", selectedUser.id, { blocked: selectedUser.blocked })}>{selectedUser.blocked ? "Unblock" : "Block (Ban)"}</button>
                    </div>
                  </div>
                </div>
                {/* User activity tabs */}
                {(["Purchases", "Deposits", "Withdrawals", "Products", "Reviews", "Disputes", "Messages", "Activity Log"] as const).map(section => {
                  const key = section.toLowerCase().replace(" ", "");
                  const dataMap: Record<string, any[]> = {
                    purchases: selectedUser.purchases, deposits: selectedUser.deposits,
                    withdrawals: selectedUser.withdrawals, products: selectedUser.products,
                    reviews: selectedUser.reviews, disputes: selectedUser.disputes,
                    messages: selectedUser.sentMessages, activitylog: selectedUser.activityLogs,
                  };
                  const items = dataMap[key] || [];
                  return (
                    <div key={section} className="panel" style={{ marginBottom: 12 }}>
                      <div className="panel-head">{section} ({items.length})</div>
                      {items.length === 0 ? <div style={{ padding: 16, color: "#888", fontSize: 12, textAlign: "center" }}>No data</div> :
                        items.slice(0, 10).map((item: any) => (
                          <div key={item.id} className="row" style={{ fontSize: 12 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600 }}>{item.title || item.description || item.action || item.reason || item.method || item.comment || "—"}</div>
                              <div style={{ color: "#888", fontSize: 11 }}>
                                {item.product?.title && `${item.product.title} · `}
                                {item.buyer?.username && `buyer: ${item.buyer.username} · `}
                                {item.message && item.message.substring(0, 80)}
                                {item.status && ` · ${item.status}`}
                              </div>
                            </div>
                            <span style={{ fontWeight: 600, color: "#3ea136" }}>{item.total ? money(item.total) : item.amount ? money(item.amount) : item.rating ? `${item.rating}/5` : ""}</span>
                            <span style={{ fontSize: 10, color: "#aaa", marginLeft: 8 }}>{new Date(item.createdAt).toLocaleDateString()}</span>
                          </div>
                        ))
                      }
                    </div>
                  );
                })}
              </div>
            )}

            {/* ==================== VENDORS ==================== */}
            {tab === "vendors" && !selectedUser && (
              <>
                <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
                  <input type="text" placeholder="Search vendors..." value={search} onChange={e => setSearch(e.target.value)} className="input" style={{ flex: 1 }} />
                </div>
                <div className="panel">
                  <div className="panel-head">Vendor Requests</div>
                  {vendorRequests.length === 0 ? <div style={{ padding: 16, color: "#888", fontSize: 12, textAlign: "center" }}>No pending requests</div> :
                    vendorRequests.map(vr => (
                      <div key={vr.id} className="row">
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600 }}>{vr.firstName} {vr.lastName} ({vr.user.username})</div>
                          <div style={{ fontSize: 11, color: "#888" }}>{vr.email} · {vr.productDetails.substring(0, 100)}...</div>
                        </div>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button className="btn btn-primary btn-sm" onClick={async () => {
                            const muteDays = prompt("Approve vendor. Mute for how many days? (0 = no mute)");
                            const md = parseInt(muteDays || "0");
                            await fetch("/api/admin/actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "approve_vendor", requestId: vr.id, userId: vr.userId }) });
                            if (md > 0) { await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "set_mute", userId: vr.userId, muteDays: md }) }); }
                            loadAll();
                          }}>Approve</button>
                          <button className="btn btn-danger btn-sm" onClick={() => { setVrRejectId(vr.id); setVrRejectReason(""); setVrMuteDays(0); }}>Reject</button>
                        </div>
                      </div>
                    ))
                  }
                </div>
                <div className="panel" style={{ marginTop: 12 }}>
                  <div className="panel-head">All Vendors</div>
                  {users.filter(u => u.role === "vendor").map(u => (
                    <div key={u.id} className="row" style={{ cursor: "pointer" }} onClick={() => loadUserDetail(u.id)}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{u.name || u.username}</div>
                        <div style={{ fontSize: 11, color: "#888" }}>{u.email}</div>
                      </div>
                      <span className={`badge badge-${u.vendorStatus}`}>{u.vendorStatus}</span>
                      <span style={{ fontWeight: 600, color: "#3ea136", marginLeft: 8 }}>{money(u.balance)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ==================== PRODUCTS ==================== */}
            {tab === "products" && !selectedProduct && (
              <>
                <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
                  <select value={productFilter} onChange={e => setProductFilter(e.target.value)} className="input" style={{ width: 160 }}>
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <input type="text" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="input" style={{ flex: 1 }} />
                  <span style={{ fontSize: 12, color: "#888" }}>{filteredProducts.length} products</span>
                </div>
                <div className="panel">
                  <div className="panel-head">Products ({filteredProducts.length})</div>
                  <div style={{ overflowX: "auto" }}>
                    <table className="tbl">
                      <thead><tr><th>Product</th><th>Platform</th><th>Vendor</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
                      <tbody>
                        {filteredProducts.filter(p => !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.vendor.username.toLowerCase().includes(search.toLowerCase())).map(p => (
                          <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => loadProductDetail(p.id)}>
                            <td style={{ fontWeight: 600 }}>{p.title} {p.isDuplicate && <span style={{ color: "#e53e3e", fontSize: 10 }}>[DUPE]</span>}</td>
                            <td>{platformLabel(p.platform)}</td>
                            <td style={{ fontSize: 12 }}>{p.vendor.username}</td>
                            <td>{money(p.storePrice)}</td>
                            <td>{p.stock}</td>
                            <td><span className={`badge badge-${p.status}`}>{p.status}</span></td>
                            <td onClick={e => e.stopPropagation()}>
                              <div style={{ display: "flex", gap: 4 }}>
                                {p.status === "pending" && <button className="btn btn-primary btn-sm" onClick={() => doProductAction("approve", p.id)}>Approve</button>}
                                {p.status === "pending" && <button className="btn btn-danger btn-sm" onClick={() => { setRejectProduct(p); setRejectReason(""); }}>Reject</button>}
                                <button className="btn btn-secondary btn-sm" onClick={() => { setEditProduct(p); setEpTitle(p.title); setEpDesc(p.description); setEpPrice(String(p.vendorPrice)); setEpStock(String(p.stock)); }}>Edit</button>
                                <button className="btn btn-danger btn-sm" onClick={() => { if (confirm(`Delete "${p.title}"?`)) doProductAction("delete", p.id); }}>Del</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* Product Detail */}
            {tab === "products" && selectedProduct && (
              <div>
                <button onClick={() => setSelectedProduct(null)} className="btn btn-secondary btn-sm" style={{ marginBottom: 12 }}>&larr; Back to Products</button>
                <div className="panel" style={{ marginBottom: 12 }}>
                  <div className="panel-head">{selectedProduct.title}</div>
                  <div style={{ padding: 16 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                      <div><div style={{ fontSize: 11, color: "#888" }}>Platform</div><div style={{ fontWeight: 600 }}>{platformLabel(selectedProduct.platform)}</div></div>
                      <div><div style={{ fontSize: 11, color: "#888" }}>Category</div><div style={{ fontWeight: 600 }}>{selectedProduct.category}</div></div>
                      <div><div style={{ fontSize: 11, color: "#888" }}>Status</div><div><span className={`badge badge-${selectedProduct.status}`}>{selectedProduct.status}</span></div></div>
                      <div><div style={{ fontSize: 11, color: "#888" }}>Vendor</div><div style={{ fontWeight: 600 }}>{selectedProduct.vendor.username}</div></div>
                      <div><div style={{ fontSize: 11, color: "#888" }}>Price</div><div style={{ fontWeight: 600, color: "#3ea136" }}>{money(selectedProduct.storePrice)}</div></div>
                      <div><div style={{ fontSize: 11, color: "#888" }}>Stock</div><div style={{ fontWeight: 600 }}>{selectedProduct.stock}</div></div>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Description</div>
                      <div style={{ fontSize: 13, background: "#f9f9f9", padding: 10, borderRadius: 4 }}>{selectedProduct.description || "No description"}</div>
                    </div>
                    {selectedProduct.accountsData && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Accounts Data ({selectedProduct.stock} accounts)</div>
                        <pre style={{ fontSize: 11, background: "#111", color: "#3ea136", padding: 10, borderRadius: 4, maxHeight: 200, overflow: "auto", fontFamily: "monospace" }}>{selectedProduct.accountsData.substring(0, 500)}{selectedProduct.accountsData.length > 500 ? "\n... (truncated)" : ""}</pre>
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {selectedProduct.status === "pending" && <button className="btn btn-primary btn-sm" onClick={() => doProductAction("approve", selectedProduct.id)}>Approve</button>}
                      {selectedProduct.status === "pending" && <button className="btn btn-danger btn-sm" onClick={() => { setRejectProduct(selectedProduct); setRejectReason(""); }}>Reject</button>}
                      <button className="btn btn-secondary btn-sm" onClick={() => { setEditProduct(selectedProduct); setEpTitle(selectedProduct.title); setEpDesc(selectedProduct.description); setEpPrice(String(selectedProduct.vendorPrice)); setEpStock(String(selectedProduct.stock)); }}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => { if (confirm(`Delete "${selectedProduct.title}"?`)) doProductAction("delete", selectedProduct.id); }}>Delete</button>
                    </div>
                  </div>
                </div>
                {/* Purchases for this product */}
                {selectedProduct.purchases && selectedProduct.purchases.length > 0 && (
                  <div className="panel" style={{ marginBottom: 12 }}>
                    <div className="panel-head">Purchases ({selectedProduct.purchases.length})</div>
                    {selectedProduct.purchases.map(p => (
                      <div key={p.id} className="row" style={{ fontSize: 12 }}>
                        <div style={{ flex: 1 }}><span style={{ fontWeight: 600 }}>{p.buyer.username}</span> · {p.quantity}x</div>
                        <span style={{ fontWeight: 600, color: "#3ea136" }}>{money(p.total)}</span>
                        <span className={`badge badge-${p.status}`} style={{ marginLeft: 8 }}>{p.status}</span>
                        <span style={{ fontSize: 10, color: "#aaa", marginLeft: 8 }}>{new Date(p.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* Reviews */}
                {selectedProduct.reviews && selectedProduct.reviews.length > 0 && (
                  <div className="panel">
                    <div className="panel-head">Reviews ({selectedProduct.reviews.length})</div>
                    {selectedProduct.reviews.map(r => (
                      <div key={r.id} className="row" style={{ fontSize: 12 }}>
                        <div style={{ flex: 1 }}><span style={{ fontWeight: 600 }}>{r.buyer.username}</span> · {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)} · {r.comment}</div>
                        <span style={{ fontSize: 10, color: "#aaa" }}>{new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ==================== ORDERS ==================== */}
            {tab === "orders" && (
              <div className="panel">
                <div className="panel-head">All Orders ({orders.length})</div>
                {orders.length === 0 ? <div style={{ padding: 20, color: "#888", fontSize: 13, textAlign: "center" }}>No orders</div> :
                  orders.map(o => (
                    <div key={o.id} className="row">
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{o.product.title}</div>
                        <div style={{ fontSize: 11, color: "#888" }}>Buyer: {o.buyer.username} · Vendor: {o.product.vendor.username} · {o.quantity}x</div>
                      </div>
                      <span style={{ fontWeight: 700, color: "#3ea136" }}>{money(o.total)}</span>
                      <span className={`badge badge-${o.status}`} style={{ marginLeft: 8 }}>{o.status}</span>
                      <span style={{ fontSize: 10, color: "#aaa", marginLeft: 8 }}>{new Date(o.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))
                }
              </div>
            )}

            {/* ==================== WITHDRAWALS ==================== */}
            {tab === "withdrawals" && (
              <div className="panel">
                <div className="panel-head">Withdrawals ({withdrawals.length})</div>
                {withdrawals.length === 0 ? <div style={{ padding: 20, color: "#888", fontSize: 13, textAlign: "center" }}>No withdrawals</div> :
                  withdrawals.map(w => (
                    <div key={w.id} className="row">
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{w.user.username}</div>
                        <div style={{ fontSize: 11, color: "#888" }}>{w.method} · Fee: {money(w.fee)}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 600 }}>{money(w.amount)}</div>
                        <div style={{ fontSize: 10, color: "#888" }}>Net: {money(w.netAmount)}</div>
                      </div>
                      <span className={`badge badge-${w.status}`} style={{ marginLeft: 8 }}>{w.status}</span>
                      <span style={{ fontSize: 10, color: "#aaa", marginLeft: 8 }}>{new Date(w.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))
                }
              </div>
            )}

            {/* ==================== COUPONS ==================== */}
            {tab === "coupons" && (
              <>
                <div className="panel" style={{ marginBottom: 12 }}>
                  <div className="panel-head">Create Coupon</div>
                  <div style={{ padding: 16, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
                    <div><label className="label">Code</label><input type="text" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} className="input" placeholder="SAVE10" /></div>
                    <div><label className="label">Type</label><select value={couponType} onChange={e => setCouponType(e.target.value)} className="input"><option value="percentage">%</option><option value="fixed">$</option></select></div>
                    <div><label className="label">Value</label><input type="number" value={couponValue} onChange={e => setCouponValue(e.target.value)} className="input" style={{ width: 80 }} /></div>
                    <div><label className="label">Max Uses</label><input type="number" value={couponMax} onChange={e => setCouponMax(e.target.value)} className="input" style={{ width: 80 }} /></div>
                    <button className="btn btn-primary btn-sm" onClick={createCoupon}>Create</button>
                  </div>
                </div>
                <div className="panel">
                  <div className="panel-head">All Coupons ({coupons.length})</div>
                  {coupons.map(c => (
                    <div key={c.id} className="row">
                      <div style={{ flex: 1 }}><span style={{ fontWeight: 700 }}>{c.code}</span> · {c.type === "percentage" ? `${c.value}%` : money(c.value)}</div>
                      <span style={{ fontSize: 11, color: "#888" }}>Used: {c.usedCount}/{c.maxUses}</span>
                      <span className={`badge badge-${c.active ? "approved" : "rejected"}`} style={{ marginLeft: 8 }}>{c.active ? "Active" : "Inactive"}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ==================== DEPOSITS ==================== */}
            {tab === "deposits" && (
              <div className="panel">
                <div className="panel-head">All Deposits</div>
                <div style={{ padding: 20, color: "#888", fontSize: 13, textAlign: "center" }}>Deposit data loaded from dashboard API</div>
              </div>
            )}

            {/* ==================== NOTICES ==================== */}
            {tab === "notices" && (
              <>
                <div className="panel" style={{ marginBottom: 12 }}>
                  <div className="panel-head">Send Notice</div>
                  <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div><label className="label">Title</label><input type="text" value={noticeTitle} onChange={e => setNoticeTitle(e.target.value)} className="input" required /></div>
                      <div><label className="label">Type</label>
                        <select value={noticeType} onChange={e => setNoticeType(e.target.value)} className="input">
                          <option value="info">Information</option>
                          <option value="urgent">Urgent</option>
                          <option value="coupon">Coupon / Promo</option>
                          <option value="goodnews">Good News</option>
                          <option value="warning">Warning</option>
                          <option value="maintenance">Maintenance</option>
                        </select>
                      </div>
                    </div>
                    <div><label className="label">Message</label><textarea value={noticeBody} onChange={e => setNoticeBody(e.target.value)} className="input" rows={3} required /></div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <label className="label" style={{ marginBottom: 0 }}>Send to:</label>
                      <select value={noticeTarget} onChange={e => setNoticeTarget(e.target.value)} className="input" style={{ width: 160 }}>
                        <option value="all">All Users</option>
                        <option value="bulk">Selected Users</option>
                        <option value="single">Single User</option>
                      </select>
                      {noticeTarget === "bulk" && (
                        <input type="text" placeholder="Comma-separated user IDs" value={noticeUserIds.join(",")} onChange={e => setNoticeUserIds(e.target.value.split(",").filter(Boolean))} className="input" style={{ flex: 1 }} />
                      )}
                      {noticeTarget === "single" && (
                        <select onChange={e => setNoticeUserIds([e.target.value])} className="input" style={{ flex: 1 }}>
                          <option value="">Select user...</option>
                          {users.map(u => <option key={u.id} value={u.id}>{u.name || u.username}</option>)}
                        </select>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <div style={{ fontSize: 12, color: "#888", padding: "6px 0" }}>
                        Notice types: <span style={{ color: "#e53e3e" }}>urgent</span> · <span style={{ color: "#3ea136" }}>coupon</span> · <span style={{ color: "#2196f3" }}>info</span> · <span style={{ color: "#ff9800" }}>goodnews</span> · <span style={{ color: "#9c27b0" }}>warning</span>
                      </div>
                    </div>
                    <button className="btn btn-primary" onClick={sendNotice}>Send Notice</button>
                  </div>
                </div>
              </>
            )}

            {/* ==================== ACTIVITY ==================== */}
            {tab === "activity" && (
              <div className="panel">
                <div className="panel-head">Activity Log ({recentActivity.length})</div>
                {recentActivity.map((a: any) => (
                  <div key={a.id} className="row">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 12 }}>{a.action}</div>
                      <div style={{ fontSize: 11, color: "#888" }}>{a.description}</div>
                    </div>
                    <span style={{ fontSize: 11 }}>{a.user?.username}</span>
                    <span style={{ fontSize: 10, color: "#aaa", marginLeft: 8 }}>{new Date(a.createdAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            {/* SALES OVERVIEW */}
            {tab === "sales" && (
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

                    {/* Daily Breakdown */}
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

                    {/* Vendor Ranking */}
                    {salesData.vendorRanking.length > 0 && (
                      <div className="panel" style={{ marginBottom: 16 }}>
                        <div className="panel-head">Top Vendors by Revenue</div>
                        {salesData.vendorRanking.map((v: any, i: number) => (
                          <div key={i} className="row">
                            <span style={{ fontSize: 12, color: "#888", width: 24 }}>#{i + 1}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 600 }}>{v.username}</div>
                              <div style={{ fontSize: 11, color: "#888" }}>{v.orders} orders · {v.sales} units</div>
                            </div>
                            <span style={{ fontWeight: 700, color: "#3ea136" }}>{money(v.revenue)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Platform Ranking */}
                    {salesData.platformRanking.length > 0 && (
                      <div className="panel" style={{ marginBottom: 16 }}>
                        <div className="panel-head">Sales by Platform</div>
                        {salesData.platformRanking.map((p: any, i: number) => (
                          <div key={i} className="row">
                            <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{p.name}</span>
                            <span style={{ fontSize: 12, color: "#888", marginRight: 8 }}>{p.orders} orders · {p.sales} units</span>
                            <span style={{ fontWeight: 700, color: "#3ea136" }}>{money(p.revenue)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Category Ranking */}
                    {salesData.categoryRanking.length > 0 && (
                      <div className="panel" style={{ marginBottom: 16 }}>
                        <div className="panel-head">Sales by Category</div>
                        {salesData.categoryRanking.map((c: any, i: number) => (
                          <div key={i} className="row">
                            <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{c.name}</span>
                            <span style={{ fontSize: 12, color: "#888", marginRight: 8 }}>{c.orders} orders · {c.sales} units</span>
                            <span style={{ fontWeight: 700, color: "#3ea136" }}>{money(c.revenue)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Product Ranking */}
                    {salesData.productRanking.length > 0 && (
                      <div className="panel" style={{ marginBottom: 16 }}>
                        <div className="panel-head">Top Products by Revenue</div>
                        {salesData.productRanking.map((p: any, i: number) => (
                          <div key={i} className="row">
                            <span style={{ fontSize: 12, color: "#888", width: 24 }}>#{i + 1}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 600 }}>{p.title}</div>
                              <div style={{ fontSize: 11, color: "#888" }}>{p.platform} · {p.category} · {p.orders} orders · {p.sales} units</div>
                            </div>
                            <span style={{ fontWeight: 700, color: "#3ea136" }}>{money(p.revenue)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Recent Orders */}
                    <div className="panel">
                      <div className="panel-head">Recent Orders</div>
                      {salesData.recentOrders.length === 0 ? <div style={{ padding: 16, color: "#888", fontSize: 12, textAlign: "center" }}>No orders in this period</div> :
                        salesData.recentOrders.map((o: any) => (
                          <div key={o.id} className="row">
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 600 }}>{o.product.title}</div>
                              <div style={{ fontSize: 11, color: "#888" }}>{o.buyer.username} bought {o.quantity}x from {o.product.vendor.username}</div>
                            </div>
                            <span style={{ fontWeight: 700, color: "#3ea136" }}>+{money(o.total)}</span>
                            <span style={{ fontSize: 10, color: "#aaa", marginLeft: 8 }}>{new Date(o.createdAt).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ==================== MODALS ==================== */}

      {/* Edit User Modal */}
      {editUser && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setEditUser(null)}>
          <div style={{ background: "#fff", borderRadius: 6, width: 400, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #eee", fontWeight: 600 }}>Edit User: {editUser.username}</div>
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <div><label className="label">Name</label><input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="input" /></div>
              <div><label className="label">Username</label><input type="text" value={editUsername} onChange={e => setEditUsername(e.target.value)} className="input" /></div>
              <div><label className="label">Email</label><input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} className="input" /></div>
              <div><label className="label">New Password (leave blank to keep)</label><input type="text" value={editPassword} onChange={e => setEditPassword(e.target.value)} className="input" placeholder="••••••••" /></div>
              <div><label className="label">Balance ($)</label><input type="number" step="0.01" value={editBalance} onChange={e => setEditBalance(e.target.value)} className="input" /></div>
              <div><label className="label">Role</label><select value={editRole} onChange={e => setEditRole(e.target.value)} className="input"><option value="buyer">Buyer</option><option value="vendor">Vendor</option><option value="admin">Admin</option></select></div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditUser(null)}>Cancel</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={async () => { await doUserAction("edit_user", editUser.id, { name: editName, username: editUsername, email: editEmail, balance: editBalance, role: editRole, password: editPassword || undefined }); setEditUser(null); }}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Topup Modal */}
      {topupUser && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setTopupUser(null)}>
          <div style={{ background: "#fff", borderRadius: 6, width: 320, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #eee", fontWeight: 600 }}>Top-up: {topupUser.username}</div>
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 12, color: "#888" }}>Current balance: <strong>{money(topupUser.balance)}</strong></div>
              <div><label className="label">Amount ($)</label><input type="number" step="0.01" min="0.01" value={topupAmount} onChange={e => setTopupAmount(e.target.value)} className="input" required /></div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setTopupUser(null)}>Cancel</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={async () => { await doUserAction("topup", topupUser.id, { amount: topupAmount }); setTopupUser(null); }}>Add Balance</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {msgUser && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setMsgUser(null)}>
          <div style={{ background: "#fff", borderRadius: 6, width: 400, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #eee", fontWeight: 600 }}>Message: {msgUser.username}</div>
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <div><label className="label">Subject</label><input type="text" value={msgTitle} onChange={e => setMsgTitle(e.target.value)} className="input" required /></div>
              <div><label className="label">Message</label><textarea value={msgBody} onChange={e => setMsgBody(e.target.value)} className="input" rows={4} required /></div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setMsgUser(null)}>Cancel</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={async () => { await doUserAction("send_message", msgUser.id, { title: msgTitle, message: msgBody }); setMsgUser(null); }}>Send</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Product Modal */}
      {rejectProduct && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setRejectProduct(null)}>
          <div style={{ background: "#fff", borderRadius: 6, width: 400, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #eee", fontWeight: 600 }}>Reject: {rejectProduct.title}</div>
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 12, color: "#888" }}>The vendor will be notified with this reason.</div>
              <div><label className="label">Reason for rejection</label><textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="input" rows={3} required placeholder="Explain why this listing was rejected..." /></div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setRejectProduct(null)}>Cancel</button>
                <button className="btn btn-danger" style={{ flex: 1 }} disabled={!rejectReason.trim()} onClick={async () => { await doProductAction("reject", rejectProduct.id, { reason: rejectReason }); setRejectProduct(null); setSelectedProduct(null); }}>Reject</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editProduct && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setEditProduct(null)}>
          <div style={{ background: "#fff", borderRadius: 6, width: 440, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #eee", fontWeight: 600 }}>Edit: {editProduct.title}</div>
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <div><label className="label">Title</label><input type="text" value={epTitle} onChange={e => setEpTitle(e.target.value)} className="input" /></div>
              <div><label className="label">Description</label><textarea value={epDesc} onChange={e => setEpDesc(e.target.value)} className="input" rows={3} /></div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}><label className="label">Vendor Price ($)</label><input type="number" step="0.01" value={epPrice} onChange={e => setEpPrice(e.target.value)} className="input" /><div style={{ fontSize: 11, color: "#888" }}>Store: {money(parseFloat(epPrice || "0") * 1.4)}</div></div>
                <div style={{ flex: 1 }}><label className="label">Stock</label><input type="number" value={epStock} onChange={e => setEpStock(e.target.value)} className="input" /></div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditProduct(null)}>Cancel</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={async () => { await doProductAction("edit", editProduct.id, { title: epTitle, description: epDesc, vendorPrice: epPrice, stock: epStock }); setEditProduct(null); setSelectedProduct(null); }}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mute User Modal */}
      {muteUser && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setMuteUser(null)}>
          <div style={{ background: "#fff", borderRadius: 6, width: 380, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #eee", fontWeight: 600 }}>Mute: {muteUser.username}</div>
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 12, color: "#888" }}>Select mute duration for this user (buyer or seller):</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                {[{ d: 1, l: "1 Day" }, { d: 3, l: "3 Days" }, { d: 7, l: "1 Week" }, { d: 14, l: "2 Weeks" }, { d: 30, l: "1 Month" }, { d: 0, l: "Permanent" }].map(opt => (
                  <button key={opt.d} onClick={() => setMuteDays(opt.d)} style={{ padding: "8px 4px", border: muteDays === opt.d ? "2px solid #e53e3e" : "1px solid #ddd", borderRadius: 4, background: muteDays === opt.d ? "#fee2e2" : "#fff", fontSize: 11, fontWeight: muteDays === opt.d ? 700 : 400, cursor: "pointer", textAlign: "center" }}>
                    {opt.l}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: "#888" }}>
                {muteDays > 0 ? `User will be unmuted after ${muteDays} day(s). They will be notified.` : "User will remain muted until manually unmuted."}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setMuteUser(null)}>Cancel</button>
                <button className="btn btn-danger" style={{ flex: 1 }} onClick={async () => { await doUserAction("set_mute", muteUser.id, { muteDays }); setMuteUser(null); }}>Mute User</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Reject Modal */}
      {vrRejectId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setVrRejectId(null)}>
          <div style={{ background: "#fff", borderRadius: 6, width: 420, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #eee", fontWeight: 600, color: "#e53e3e" }}>Reject Vendor Application</div>
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <div><label className="label">Rejection Reason *</label><textarea value={vrRejectReason} onChange={e => setVrRejectReason(e.target.value)} className="input" rows={3} required placeholder="Explain why this vendor application was rejected..." /></div>
              <div>
                <label className="label">Ban/Mute User After Rejection</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                  {[{ d: 0, l: "No Ban" }, { d: 7, l: "Mute 7d" }, { d: 30, l: "Mute 30d" }, { d: -1, l: "Ban (Block)" }].map(opt => (
                    <button key={opt.d} onClick={() => setVrMuteDays(opt.d)} style={{ padding: "8px 4px", border: vrMuteDays === opt.d ? "2px solid #e53e3e" : "1px solid #ddd", borderRadius: 4, background: vrMuteDays === opt.d ? "#fee2e2" : "#fff", fontSize: 11, fontWeight: vrMuteDays === opt.d ? 700 : 400, cursor: "pointer", textAlign: "center" }}>
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setVrRejectId(null)}>Cancel</button>
                <button className="btn btn-danger" style={{ flex: 1 }} disabled={!vrRejectReason.trim()} onClick={async () => {
                  const vr = vendorRequests.find(v => v.id === vrRejectId);
                  if (!vr) return;
                  await fetch("/api/admin/actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reject_vendor", requestId: vrRejectId, userId: vr.userId, reason: vrRejectReason }) });
                  if (vrMuteDays === -1) {
                    await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "toggle_block", userId: vr.userId, blocked: false }) });
                  } else if (vrMuteDays > 0) {
                    await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "set_mute", userId: vr.userId, muteDays: vrMuteDays }) });
                  }
                  setVrRejectId(null); loadAll();
                }}>Reject & Apply Penalty</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );


}
