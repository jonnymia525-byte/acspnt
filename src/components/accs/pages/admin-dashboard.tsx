"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { money } from "@/lib/money";
import { platformLabel } from "@/lib/totp";
import { AdminSettings as AdminSettingsWidget } from "@/components/accs/widgets/admin-settings";
import { NoticeBar } from "@/components/accs/widgets/notice-bar";
import { toast, Toaster } from "@/components/accs/widgets/toast";
import { useStore } from "@/store";

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
  listingId?: string;
  vendor: { id: string; username: string; name: string; vendorStatus: string };
  isDuplicate?: boolean;
  purchases?: Array<{ id: string; quantity: number; total: number; status: string; createdAt: string; buyer: { id: string; username: string } }>;
  reviews?: Array<{ id: string; rating: number; comment: string; createdAt: string; buyer: { id: string; username: string } }>;
}

interface Order {
  id: string; total: number; quantity: number; status: string; createdAt: string;
  product: { title: string; platform: string; vendor?: { username: string } };
  buyer?: { username: string };
}

interface Withdrawal {
  id: string; amount: number; netAmount: number; fee: number; method: string;
  wallet?: string; status: string; rejectReason?: string; createdAt: string; user: { id: string; username: string; email?: string };
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
  activityLogs: Array<{ id: string; action: string; description: string; ip?: string; country?: string; city?: string; userAgent?: string; createdAt: string }>;
  sentMessages: Array<{ id: string; title: string; message: string; read: boolean; createdAt: string }>;
  disputes: Array<{ id: string; reason: string; status: string; resolution: string | null; createdAt: string }>;
}

const TABS = ["overview", "users", "vendors", "products", "best-sellers", "orders", "withdrawals", "coupons", "deposits", "disputes", "notifications", "notices", "activity", "sales", "manage", "support-chat", "moderators", "recycle-bin", "settings"];
const TAB_LABELS: Record<string, string> = { "overview": "Overview", "users": "Users", "vendors": "Vendors", "products": "Products", "best-sellers": "Best Sellers", "orders": "Orders", "withdrawals": "Withdrawals", "coupons": "Coupons", "deposits": "Deposits", "disputes": "Disputes", "notifications": "Notifications", "notices": "Notices", "activity": "Activity", "sales": "Sales", "manage": "Search", "support-chat": "Support Chat", "moderators": "Moderators", "recycle-bin": "Recycle Bin", "settings": "Settings" };

const PRIORITY_WEIGHT: Record<string, number> = { urgent: 4, high: 3, normal: 2, low: 1 };

interface ListingItem {
  id: string; title: string; platform: string; category: string;
  bestSeller: boolean; visible: boolean; createdAt: string;
  totalSales: number; totalStock: number;
  products: Array<{ id: string; stock: number; storePrice: number; status: string }>;
}

function BestSellerManager({ loadAll }: { loadAll: () => void }) {
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformFilter, setPlatformFilter] = useState<string>("");

  const fetchListings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/listings");
      const d = await res.json();
      setListings(d.listings || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchListings(); }, []);

  const toggleBestSeller = async (listingId: string) => {
    try {
      const res = await fetch("/api/admin/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_best_seller", listingId }),
      });
      const r = await res.json();
      if (r.success) {
        setListings(prev => prev.map(l => {
          if (l.id === listingId) return { ...l, bestSeller: r.bestSeller };
          if (r.bestSeller && l.platform === listings.find(x => x.id === listingId)?.platform) {
            return { ...l, bestSeller: false };
          }
          return l;
        }));
        loadAll();
      } else alert(r.error);
    } catch {}
  };

  const platforms = [...new Set(listings.map(l => l.platform))].sort();
  const filtered = platformFilter ? listings.filter(l => l.platform === platformFilter) : listings;
  const bestSellerCount = listings.filter(l => l.bestSeller).length;

  if (loading) return <div style={{ padding: 12, fontSize: 12, color: "#888" }}>Loading listings...</div>;

  return (
    <div className="panel" style={{ marginBottom: 12 }}>
      <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Best Seller Management ({bestSellerCount} active)</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <select value={platformFilter} onChange={e => setPlatformFilter(e.target.value)} style={{ padding: "3px 6px", fontSize: 11, borderRadius: 3, border: "1px solid #555", background: "#333", color: "#fff" }}>
            <option value="">All Platforms</option>
            {platforms.map(p => <option key={p} value={p}>{platformLabel(p)}</option>)}
          </select>
          <button onClick={fetchListings} style={{ padding: "3px 8px", fontSize: 11, borderRadius: 3, border: "1px solid #555", background: "#444", color: "#fff", cursor: "pointer" }}>Refresh</button>
        </div>
      </div>
      {filtered.length === 0 ? (
        <div style={{ padding: 16, color: "#888", fontSize: 12, textAlign: "center" }}>No listings found</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Listing</th>
                <th>Platform</th>
                <th>Sales</th>
                <th>Stock</th>
                <th>Best Seller</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 600, fontSize: 12 }}>{l.title}</td>
                  <td style={{ fontSize: 12 }}>{platformLabel(l.platform)}</td>
                  <td style={{ fontSize: 12 }}>{l.totalSales} units</td>
                  <td style={{ fontSize: 12 }}>{l.totalStock}</td>
                  <td>
                    <button
                      onClick={() => toggleBestSeller(l.id)}
                      style={{
                        padding: "3px 10px", fontSize: 11, fontWeight: 600, borderRadius: 3,
                        border: l.bestSeller ? "none" : "1px solid #555",
                        background: l.bestSeller ? "#ff9800" : "transparent",
                        color: l.bestSeller ? "#fff" : "#aaa",
                        cursor: "pointer",
                      }}
                    >
                      {l.bestSeller ? "🔥 Best Seller" : "Set Best Seller"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function AdminDashboard() {
  const { theme, toggleTheme } = useStore();
  const [tab, setTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('tab') || 'overview';
    }
    return 'overview';
  });
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
  const [detailTab, setDetailTab] = useState("overview");

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
  const [topupReason, setTopupReason] = useState("");

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
  const [noticeCloseable, setNoticeCloseable] = useState(true);
  const [noticeActive, setNoticeActive] = useState(true);
  const [allNotices, setAllNotices] = useState<any[]>([]);
  const [editingNotice, setEditingNotice] = useState<any | null>(null);
  const [hideNotice, setHideNotice] = useState<any | null>(null);
  const [hideNoticeUserIds, setHideNoticeUserIds] = useState<Set<string>>(new Set());
  const [noticeFormOpen, setNoticeFormOpen] = useState(true);

  // Reject product
  const [rejectProduct, setRejectProduct] = useState<Product | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // View product accounts
  const [viewAccountsProduct, setViewAccountsProduct] = useState<any | null>(null);

  // Edit product
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [epTitle, setEpTitle] = useState("");
  const [epDesc, setEpDesc] = useState("");
  const [epPrice, setEpPrice] = useState("");
  const [epStock, setEpStock] = useState("");

  // Products grouped view
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [groupView, setGroupView] = useState<Record<string, 'details' | 'vendors' | 'list'>>({});
  // Merge tool
  const [showMergeTool, setShowMergeTool] = useState(false);
  const [mergeCandidates, setMergeCandidates] = useState<Array<{ title: string; platform: string; category: string; products: Array<{ id: string; title: string; storePrice: number; vendorPrice: number; stock: number; totalSales: number; vendor: { id: string; username: string } }>; totalStock: number; totalSales: number }>>([]);
  const [mergeSelected, setMergeSelected] = useState<Record<string, string[]>>({});
  const [mergeLoading, setMergeLoading] = useState(false);
  const [groupDetail, setGroupDetail] = useState<Record<string, any>>({});
  const [holdProduct, setHoldProduct] = useState<Product | null>(null);
  const [editingLine, setEditingLine] = useState<{ productId: string; lineIndex: number } | null>(null);
  const [editingLineText, setEditingLineEdit] = useState("");
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());

  // Pending queue batch select + preview + reject all
  const [pendingQueueSelected, setPendingQueueSelected] = useState<Set<string>>(new Set());
  const [listSelected, setListSelected] = useState<Set<string>>(new Set());
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [rejectAllOpen, setRejectAllOpen] = useState(false);
  const [rejectAllReason, setRejectAllReason] = useState("");

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

  // Settings
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Recycle Bin
  const [recycleBin, setRecycleBin] = useState<Record<string, any[]>>({});
  const [recycleType, setRecycleType] = useState("all");
  const [loadingRecycle, setLoadingRecycle] = useState(false);

  // Listing visibility tracking
  const [listingVisibility, setListingVisibility] = useState<Record<string, boolean>>({});

  const fetchSettings = async () => {
    setLoadingSettings(true);
    try {
      const res = await fetch("/api/admin/settings");
      const d = await res.json();
      setSiteSettings(d.settings || {});
    } catch {}
    setLoadingSettings(false);
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: siteSettings }),
      });
      const r = await res.json();
      if (r.success) { alert("Settings saved!"); loadAll(); } else alert(r.error || "Failed");
    } catch { alert("Failed to save settings"); }
    setSavingSettings(false);
  };

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
      setAllDisputes(dashRes.allDisputes || []);
      setUsers(usersRes.users || []);
      setProducts(productsRes.products || []);
    } catch {}
    setLoading(false);
  };

  // Management search
  const [mgmtQuery, setMgmtQuery] = useState("");
  const [mgmtType, setMgmtType] = useState("all");
  const [mgmtResults, setMgmtResults] = useState<{users: User[], vendors: User[], products: Product[]}>({users: [], vendors: [], products: []});
  const [mgmtLoading, setMgmtLoading] = useState(false);
  const [mgmtExpanded, setMgmtExpanded] = useState<string | null>(null);

  // Deposits data
  const [allDeposits, setAllDeposits] = useState<any[]>([]);
  const [depositVerify, setDepositVerify] = useState<Record<string, { ok: boolean; text: string }>>({});
  // Disputes data
  const [allDisputes, setAllDisputes] = useState<any[]>([]);
  const [disputeResolution, setDisputeResolution] = useState<Record<string, string>>({});
  const [disputeRefund, setDisputeRefund] = useState<Record<string, boolean>>({});
  const [notifList, setNotifList] = useState<Array<{ id: string; title: string; message: string; section: string; createdAt: string }>>([]);

  // Support chat
  const [chatSessions, setChatSessions] = useState<any[]>([]);
  const [chatSessionFilter, setChatSessionFilter] = useState("");
  const [activeChatSession, setActiveChatSession] = useState<any>(null);
  const [activeChatMessages, setActiveChatMessages] = useState<any[]>([]);
  const [chatReplyMsg, setChatReplyMsg] = useState("");
  const [chatSearch, setChatSearch] = useState("");
  const [chatSort, setChatSort] = useState<"recent" | "priority">("recent");
  const [adminUserId, setAdminUserId] = useState("");
  const [moderators, setModerators] = useState<any[]>([]);
  const [modUsername, setModUsername] = useState("");
  const [modEmail, setModEmail] = useState("");
  const [modPassword, setModPassword] = useState("");
  const [modName, setModName] = useState("");

  useEffect(() => { loadAll(); loadNotices(); }, []);
  useEffect(() => {
    if (tab === "notifications") {
      fetch("/api/notifications?markRead=all").then(r => r.json()).then(d => {
        setNotifList(d.notifications || []);
      }).catch(() => {});
    }
  }, [tab]);
  useEffect(() => { if (tab === "settings") fetchSettings(); }, [tab]);
  useEffect(() => { setSelectedUser(null); setSelectedProduct(null); setMgmtExpanded(null); }, [tab]);

  // Live search with debounce
  useEffect(() => {
    if (!mgmtQuery.trim()) { setMgmtResults({users: [], vendors: [], products: []}); setMgmtExpanded(null); return; }
    setMgmtLoading(true);
    const timer = setTimeout(() => {
      const q = mgmtQuery.toLowerCase();
      const matchedUsers = users.filter(u => (u.role !== 'admin') && (u.role !== 'vendor') && (u.username.toLowerCase().includes(q) || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)));
      const matchedVendors = users.filter(u => (u.role === 'vendor' || u.vendorStatus === 'approved' || u.vendorStatus === 'pending') && (u.username.toLowerCase().includes(q) || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)));
      const matchedProducts = products.filter(p => p.title.toLowerCase().includes(q) || p.vendor.username.toLowerCase().includes(q) || p.platform.toLowerCase().includes(q));
      setMgmtResults({
        users: mgmtType === 'vendors' || mgmtType === 'products' ? [] : matchedUsers,
        vendors: mgmtType === 'users' || mgmtType === 'products' ? [] : matchedVendors,
        products: mgmtType === 'users' || mgmtType === 'vendors' ? [] : matchedProducts,
      });
      setMgmtLoading(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [mgmtQuery, mgmtType, users, products]);

  // Recycle bin
  const fetchRecycleBin = async (type?: string) => {
    setLoadingRecycle(true);
    try {
      const url = type && type !== "all" ? `/api/admin/recycle-bin?type=${type}` : "/api/admin/recycle-bin";
      const res = await fetch(url);
      const d = await res.json();
      setRecycleBin(d.items || {});
    } catch {}
    setLoadingRecycle(false);
  };
  useEffect(() => { if (tab === "recycle-bin") fetchRecycleBin(recycleType); }, [tab, recycleType]);

  // Support chat admin
  const fetchChatSessions = async (status?: string) => {
    try {
      const url = status ? `/api/chat/admin?status=${status}` : "/api/chat/admin";
      const res = await fetch(url);
      const d = await res.json();
      setChatSessions(d.sessions || []);
    } catch {}
  };
  useEffect(() => { if (tab === "support-chat") fetchChatSessions(chatSessionFilter); }, [tab, chatSessionFilter]);
  useEffect(() => { if (tab === "support-chat") setAdminUserId(useStore.getState().user?.id || ""); }, [tab]);

  const openChatSessionAdmin = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/chat/admin?sessionId=${sessionId}`);
      const d = await res.json();
      setActiveChatSession(d.session);
      setActiveChatMessages(d.messages || []);
    } catch {}
  };

  const sendChatReply = async () => {
    if (!chatReplyMsg.trim() || !activeChatSession) return;
    try {
      const res = await fetch("/api/chat/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reply", sessionId: activeChatSession.id, message: chatReplyMsg }) });
      const d = await res.json();
      if (d.success) {
        setChatReplyMsg("");
        openChatSessionAdmin(activeChatSession.id);
      }
    } catch {};
  };

  const resolveChatSession = async (sessionId: string) => {
    try {
      await fetch("/api/chat/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "resolve", sessionId }) });
      fetchChatSessions(chatSessionFilter);
      setActiveChatSession(null);
    } catch {};
  };

  const assignChatSession = async (sessionId: string, assignTo: string) => {
    try {
      await fetch("/api/chat/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "assign", sessionId, assignTo }) });
      fetchChatSessions(chatSessionFilter);
    } catch {};
  };

  // Moderators
  const fetchModerators = async () => {
    try {
      const res = await fetch("/api/admin/moderators");
      const d = await res.json();
      setModerators(d.moderators || []);
    } catch {};
  };
  useEffect(() => { if (tab === "moderators") fetchModerators(); }, [tab]);

  const createModerator = async () => {
    if (!modUsername || !modEmail || !modPassword) return alert("Username, email, and password required");
    try {
      const res = await fetch("/api/admin/moderators", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", username: modUsername, email: modEmail, password: modPassword, name: modName }) });
      const d = await res.json();
      if (d.success) { setModUsername(""); setModEmail(""); setModPassword(""); setModName(""); fetchModerators(); } else alert(d.error);
    } catch {}
  };

  const removeModerator = async (userId: string) => {
    if (!confirm("Remove this moderator? Their sessions will be unassigned.")) return;
    try {
      await fetch("/api/admin/moderators", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "remove", userId }) });
      fetchModerators();
    } catch {};
  };

  // Fetch deposits
  const fetchDeposits = async () => {
    try {
      const res = await fetch('/api/deposits?action=admin_list');
      if (res.ok) { const d = await res.json(); setAllDeposits(d.deposits || []); }
    } catch {}
  };
  useEffect(() => { if (tab === 'deposits') fetchDeposits(); }, [tab]);

  const handleRecycleAction = async (action: string, type: string, id: string) => {
    try {
      const res = await fetch("/api/admin/recycle-bin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, type, id }),
      });
      const d = await res.json();
      if (d.success) fetchRecycleBin(recycleType);
    } catch {}
  };

  const toggleListingVisibility = async (listingId: string) => {
    try {
      const res = await fetch("/api/admin/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_visible", listingId }),
      });
      const r = await res.json();
      if (r.success) {
        setListingVisibility(prev => ({ ...prev, [listingId]: !prev[listingId] }));
        loadAll();
      }
    } catch {}
  };

  // Filter helpers — users tab shows only buyers, vendors tab shows only sellers
  const filteredUsers = users.filter(u =>
    u.role !== "admin" && u.role !== "vendor" &&
    (!search || u.username.toLowerCase().includes(search.toLowerCase()) || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
  );
  const filteredVendors = users.filter(u =>
    (u.role === "vendor" || u.vendorStatus === "approved" || u.vendorStatus === "pending") &&
    (!search || u.username.toLowerCase().includes(search.toLowerCase()) || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
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
    if (r.success) { loadAll(); } else toast(r.error || "Action failed", "error");
    return r;
  };

  // Merge tool functions
  const fetchMergeCandidates = async () => {
    setMergeLoading(true);
    try {
      const res = await fetch("/api/admin/products/merge?action=find-similar");
      const r = await res.json();
      setMergeCandidates(r.mergeCandidates || []);
    } catch { setMergeCandidates([]); }
    setMergeLoading(false);
  };

  const mergeProducts = async (title: string) => {
    const ids = mergeSelected[title] || [];
    if (ids.length < 2) return toast("Select at least 2 products to merge", "error");
    if (!confirm(`Merge ${ids.length} products under "${title}"? This groups them on the storefront.`)) return;
    try {
      const res = await fetch("/api/admin/products/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "merge", productIds: ids, masterTitle: title }),
      });
      const r = await res.json();
      if (r.success) { toast(r.message, "success"); fetchMergeCandidates(); loadAll(); } else toast(r.error || "Merge failed", "error");
    } catch { toast("Merge failed", "error"); }
  };

  const toggleMergeSelect = (title: string, productId: string) => {
    setMergeSelected(prev => {
      const current = prev[title] || [];
      const next = current.includes(productId) ? current.filter(id => id !== productId) : [...current, productId];
      return { ...prev, [title]: next };
    });
  };

  const loadUserDetail = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users?action=detail&userId=${userId}`);
      const r = await res.json();
      if (r.user) {
        setSelectedUser({
          ...r.user,
          purchases: r.purchases || [],
          deposits: r.deposits || [],
          withdrawals: r.withdrawals || [],
          reviews: r.reviews || [],
          products: r.products || [],
          activityLogs: r.activityLogs || [],
          sentMessages: r.sentMessages || [],
          disputes: r.disputes || [],
        });
      }
    } catch {}
  };

  const loadProductDetail = async (productId: string) => {
    const res = await fetch(`/api/admin/products?action=detail&productId=${productId}`);
    const r = await res.json();
    if (r.product) setSelectedProduct(r.product);
  };

  const sendNotice = async () => {
    if (!noticeTitle || !noticeBody) return toast("Title and message required", "error");
    const res = await fetch("/api/admin/notices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: noticeTitle, message: noticeBody, noticeType, target: noticeTarget, userIds: noticeUserIds, closeable: noticeCloseable }) });
    const r = await res.json();
    if (r.success) { toast("Notice sent!", "success"); setNoticeTitle(""); setNoticeBody(""); setNoticeFormOpen(false); loadAll(); loadNotices(); } else toast(r.error || "Failed to send notice", "error");
  };

  const loadNotices = async () => {
    try {
      const res = await fetch("/api/admin/notices");
      const r = await res.json();
      setAllNotices(r.notices || []);
    } catch {}
  };

  const saveNoticeEdit = async () => {
    if (!editingNotice) return;
    if (!noticeTitle || !noticeBody) return toast("Title and message required", "error");
    const res = await fetch("/api/admin/notices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", noticeId: editingNotice.id, title: noticeTitle, message: noticeBody, noticeType, closeable: noticeCloseable, active: noticeActive }),
    });
    const r = await res.json();
    if (r.success) { toast("Notice updated!", "success"); setEditingNotice(null); setNoticeTitle(""); setNoticeBody(""); loadNotices(); } else toast(r.error || "Failed to update notice", "error");
  };

  const deleteNotice = async (id: string) => {
    if (!confirm("Delete this notice?")) return;
    const res = await fetch("/api/admin/notices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", noticeId: id }),
    });
    if (res.ok) { loadNotices(); loadAll(); toast("Notice deleted", "success"); } else toast("Failed to delete notice", "error");
  };

  const saveHideUsers = async () => {
    if (!hideNotice) return;
    const res = await fetch("/api/admin/notices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_hidden_users", noticeId: hideNotice.id, userIds: Array.from(hideNoticeUserIds) }),
    });
    if (res.ok) { setHideNotice(null); loadNotices(); toast("Hide settings saved", "success"); } else toast("Failed to hide users", "error");
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
      <Toaster />
      {/* Top Bar */}
      <div className="topbar">
        <div className="news-link"><span className="news-dot" /> News</div>
        <Link href="/" style={{ color: "#fff", fontSize: 12, padding: "4px 12px", background: "#3ea136", borderRadius: 3, textDecoration: "none", fontWeight: 600 }}>Store</Link>
        <span style={{ fontSize: 10, fontWeight: 700, background: "#e53e3e", color: "#fff", padding: "2px 6px", borderRadius: 4 }}>ADMIN</span>
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
          {TABS.map(t => <button key={t} onClick={() => setTab(t)} className={`btn btn-sm ${tab === t ? "btn-primary" : "btn-secondary"}`}>{TAB_LABELS[t] || t}</button>)}
        </div>

        {/* Horizontal Tabs Bar (desktop) */}
        <div className="side hide-mobile" style={{ marginBottom: 16 }}>
          <span className="side-label">Admin</span>
          {TABS.map(t => <div key={t} className={`side-item ${tab === t ? "on" : ""}`} onClick={() => setTab(t)}>{TAB_LABELS[t] || t}</div>)}
        </div>

        {/* Content */}
        <div style={{ minWidth: 0 }}>

            {/* ==================== OVERVIEW ==================== */}
            {tab === "overview" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 16 }}>
                  {stats && [
                    { l: "Users", v: stats.totalUsers, c: "#333", tab: "users" },
                    { l: "Vendors", v: stats.totalVendors, c: "#333", tab: "vendors" },
                    { l: "Products", v: stats.totalProducts, c: "#333", tab: "products" },
                    { l: "Live", v: stats.approvedProducts, c: "#3ea136", tab: "products", fn: () => { setProductFilter("approved"); setTab("products"); } },
                    { l: "Pending", v: stats.pendingProducts, c: "#eab308", tab: "products", fn: () => { setProductFilter("pending"); setTab("products"); } },
                    { l: "Orders", v: stats.totalPurchases, c: "#333", tab: "orders" },
                    { l: "Revenue", v: money(stats.totalRevenue), c: "#3ea136", tab: "sales" },
                    { l: "Open Disputes", v: stats.openDisputes, c: stats.openDisputes > 0 ? "#e53e3e" : "#333", tab: "disputes" },
                  ].map(s => <div key={s.l} className="stat" style={{ cursor: s.tab ? "pointer" : "default" }} onClick={() => s.fn ? s.fn() : (s.tab && setTab(s.tab))}><div className="num" style={{ color: s.c }}>{s.v}</div><div className="lbl">{s.l}</div></div>)}
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
                  <input type="text" placeholder="Search by name, email, or username..." value={search} onChange={e => setSearch(e.target.value)} className="input" style={{ flex: 1 }} />
                  <span style={{ fontSize: 12, color: "#888" }}>{filteredUsers.length} users</span>
                </div>
                <div className="panel">
                  <div className="panel-head" style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 1fr 80px 90px", gap: 12, padding: "8px 16px", fontSize: 11, color: "#999", fontWeight: 600, textTransform: "uppercase" }}>
                    <span>User</span>
                    <span>Email</span>
                    <span>Role</span>
                    <span style={{ textAlign: "right" }}>Balance</span>
                    <span style={{ textAlign: "right" }}>Joined</span>
                  </div>
                  {filteredUsers.length === 0 && <div style={{ padding: 20, color: "#888", fontSize: 12, textAlign: "center" }}>No users found</div>}
                  {filteredUsers.map(u => (
                    <div key={u.id} style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 1fr 80px 90px", gap: 12, padding: "10px 16px", borderBottom: "1px solid #f0f0f0", alignItems: "center", cursor: "pointer", transition: "background 0.15s" }} className="row" onMouseEnter={e => (e.currentTarget.style.background = "#f9f9f9")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")} onClick={() => loadUserDetail(u.id)}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#1a73e8", textDecoration: "underline" }}>{u.name || u.username}</div>
                      <div style={{ fontSize: 12, color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
                      <div>
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, fontWeight: 600, background: u.blocked ? "#fde8e8" : u.muted ? "#fff3cd" : "#e8f5e9", color: u.blocked ? "#c62828" : u.muted ? "#856404" : "#2e7d32" }}>
                          {u.blocked ? "Blocked" : u.muted ? "Muted" : "Active"}
                        </span>
                      </div>
                      <div style={{ textAlign: "right", fontWeight: 600, color: "#3ea136", fontSize: 12 }}>{money(u.balance)}</div>
                      <div style={{ textAlign: "right", fontSize: 11, color: "#aaa" }}>{new Date(u.registeredAt).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* User/Vendor Detail Panel */}
            {((tab === "users" || tab === "vendors") && selectedUser) && (
              <div>
                <button onClick={() => { setSelectedUser(null); setDetailTab("overview"); }} className="btn btn-secondary btn-sm" style={{ marginBottom: 12 }}>&larr; Back to {tab === "vendors" ? "Vendors" : "Users"}</button>
                <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                  <div className="panel" style={{ flex: 1, minWidth: 200, padding: 16 }}>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{selectedUser.name || selectedUser.username}</div>
                    <div style={{ fontSize: 12, color: "#888" }}>@{selectedUser.username} <span style={{ fontSize: 10, color: '#666', marginLeft: 6 }}>({selectedUser.id})</span></div>
                    <div style={{ fontSize: 12, color: "#888" }}>{selectedUser.email}</div>
                    <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div><div style={{ fontSize: 11, color: "#888" }}>Balance</div><div style={{ fontSize: 14, fontWeight: 700, color: "#3ea136" }}>{money(selectedUser.balance)}</div></div>
                      <div><div style={{ fontSize: 11, color: "#888" }}>Last Login</div><div style={{ fontSize: 12, fontWeight: 600 }}>{selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleString() : 'Never'}</div></div>
                      <div><div style={{ fontSize: 11, color: "#888" }}>Reg. IP</div><div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace' }}>{(selectedUser as any).registrationIp || 'N/A'}</div></div>
                      <div><div style={{ fontSize: 11, color: "#888" }}>Role</div><div style={{ fontSize: 14, fontWeight: 600 }}>{selectedUser.role}</div></div>
                      <div><div style={{ fontSize: 11, color: "#888" }}>Registered</div><div style={{ fontSize: 12 }}>{new Date(selectedUser.registeredAt).toLocaleDateString()}</div></div>
                      <div><div style={{ fontSize: 11, color: "#888" }}>Last Login</div><div style={{ fontSize: 12 }}>{selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleString() : "Never"}</div></div>
                      <div><div style={{ fontSize: 11, color: "#888" }}>Country</div><div style={{ fontSize: 12 }}>{selectedUser.vendorCountry || "Global"}</div></div>
                      <div><div style={{ fontSize: 11, color: "#888" }}>2FA</div><div style={{ fontSize: 12 }}>{selectedUser.twoFaEnabled ? "Enabled" : "Disabled"}</div></div>
                    </div>
                    <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button className="btn btn-primary btn-sm" onClick={() => { setEditUser(selectedUser); setEditName(selectedUser.name); setEditUsername(selectedUser.username); setEditEmail(selectedUser.email); setEditBalance(String(selectedUser.balance)); setEditRole(selectedUser.role); setEditPassword(""); }}>Edit User</button>
                      <button className="btn btn-primary btn-sm" onClick={() => { setTopupUser(selectedUser); setTopupAmount(""); setTopupReason(""); }}>Top-up Balance</button>
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
                {/* User/Vendor activity tabs */}
                {(() => {
                  const isVendor = selectedUser.role === 'vendor' || selectedUser.vendorStatus === 'approved' || selectedUser.vendorStatus === 'pending';
                  const buyerTabs = ["overview", "purchases", "deposits", "withdrawals", "products", "reviews", "disputes", "messages", "activity"] as const;
                  const vendorTabs = ["overview", "products", "deposits", "withdrawals", "reviews", "messages", "activity"] as const;
                  const tabs = isVendor ? vendorTabs : buyerTabs;
                  const dataMap: Record<string, any[]> = {
                    purchases: selectedUser.purchases, deposits: selectedUser.deposits,
                    withdrawals: selectedUser.withdrawals, products: selectedUser.products,
                    reviews: selectedUser.reviews, disputes: selectedUser.disputes,
                    messages: selectedUser.sentMessages, activity: selectedUser.activityLogs,
                  };
                  return (
                    <div style={{ display: "flex", gap: 4, overflowX: "auto", marginBottom: 12, paddingBottom: 4 }}>
                      {tabs.map(tab => {
                        const count = dataMap[tab]?.length || 0;
                        return (
                          <button key={tab} onClick={() => setDetailTab(tab)} style={{
                            padding: "5px 12px", borderRadius: 16, border: "none", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", cursor: "pointer",
                            background: detailTab === tab ? "#3ea136" : "#f0f0f0",
                            color: detailTab === tab ? "#fff" : "#666",
                          }}>{tab.charAt(0).toUpperCase() + tab.slice(1)}{count > 0 ? ` (${count})` : ""}</button>
                        );
                      })}
                    </div>
                  );
                })()}
                {(() => {
                  const dataMap: Record<string, any[]> = {
                    purchases: selectedUser.purchases, deposits: selectedUser.deposits,
                    withdrawals: selectedUser.withdrawals, products: selectedUser.products,
                    reviews: selectedUser.reviews, disputes: selectedUser.disputes,
                    messages: selectedUser.sentMessages, activity: selectedUser.activityLogs,
                  };
                  const items = dataMap[detailTab] || [];
                  if (detailTab === "overview") {
                    const isVendor = selectedUser.role === 'vendor' || selectedUser.vendorStatus === 'approved' || selectedUser.vendorStatus === 'pending';
                    const totalEarnings = (selectedUser.purchases || []).reduce((s: number, p: any) => s + (p.total || 0), 0);
                    const totalDeposits = (selectedUser.deposits || []).reduce((s: number, d: any) => s + (d.amount || 0), 0);
                    const totalWithdrawals = (selectedUser.withdrawals || []).reduce((s: number, w: any) => s + (w.amount || 0), 0);
                    const stats = isVendor ? [
                      { l: "Products", v: selectedUser.products?.length || 0, c: "#333" },
                      { l: "Sales", v: selectedUser.purchases?.length || 0, c: "#3ea136" },
                      { l: "Earnings", v: money(totalEarnings), c: "#3ea136" },
                      { l: "Deposits", v: selectedUser.deposits?.length || 0, c: "#333" },
                      { l: "Reviews", v: selectedUser.reviews?.length || 0, c: "#333" },
                      { l: "Balance", v: money(selectedUser.balance), c: "#1976d2" },
                    ] : [
                      { l: "Purchases", v: selectedUser.purchases?.length || 0, c: "#333" },
                      { l: "Spent", v: money(totalDeposits - selectedUser.balance), c: "#333" },
                      { l: "Deposits", v: money(totalDeposits), c: "#3ea136" },
                      { l: "Withdrawals", v: selectedUser.withdrawals?.length || 0, c: "#333" },
                      { l: "Reviews", v: selectedUser.reviews?.length || 0, c: "#333" },
                      { l: "Balance", v: money(selectedUser.balance), c: "#3ea136" },
                    ];
                    return (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
                        {stats.map(s => (
                          <div key={s.l} className="panel" style={{ padding: 12, textAlign: "center" }}>
                            <div style={{ fontSize: 20, fontWeight: 700, color: s.c }}>{s.v}</div>
                            <div style={{ fontSize: 11, color: "#888" }}>{s.l}</div>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return (
                    <div className="panel">
                      <div className="panel-head">{detailTab.charAt(0).toUpperCase() + detailTab.slice(1)} ({items.length})</div>
                      {items.length === 0 ? <div style={{ padding: 16, color: "#888", fontSize: 12, textAlign: "center" }}>No data</div> :
                        items.slice(0, 20).map((item: any) => (
                          <div key={item.id} className="row" style={{ fontSize: 12 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600 }}>{item.title || item.description || item.action || item.reason || item.method || item.comment || "—"}</div>
                              <div style={{ color: "#888", fontSize: 11 }}>
                                {item.product?.title && `${item.product.title} · `}
                                {item.buyer?.username && `buyer: ${item.buyer.username} · `}
                                {item.message && item.message.substring(0, 80)}
                                {item.status && ` · ${item.status}`}
                                {item.ip && detailTab === "activity" && ` · IP: ${item.ip}`}
                                {item.country && detailTab === "activity" && ` · ${item.country}`}
                                {item.city && detailTab === "activity" && `, ${item.city}`}
                                {item.action === "security" && detailTab === "activity" && <span style={{ color: '#e53e3e', fontWeight: 600 }}> ⚠️</span>}
                              </div>
                            </div>
                            <span style={{ fontWeight: 600, color: "#3ea136" }}>{item.total ? money(item.total) : item.amount ? money(item.amount) : item.rating ? `${item.rating}/5` : ""}</span>
                            <span style={{ fontSize: 10, color: "#aaa", marginLeft: 8 }}>{new Date(item.createdAt).toLocaleDateString()}</span>
                          </div>
                        ))
                      }
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ==================== VENDORS ==================== */}
            {tab === "vendors" && !selectedUser && (
              <>
                <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
                  <input type="text" placeholder="Search vendors by name, email, or username..." value={search} onChange={e => setSearch(e.target.value)} className="input" style={{ flex: 1 }} />
                  <span style={{ fontSize: 12, color: "#888" }}>{filteredVendors.length} vendors</span>
                </div>

                {/* Pending Requests */}
                {vendorRequests.length > 0 && (
                  <div className="panel" style={{ marginBottom: 12 }}>
                    <div className="panel-head" style={{ background: "#fff3cd" }}>⏳ Pending Vendor Requests ({vendorRequests.length})</div>
                    {vendorRequests.map(vr => (
                      <div key={vr.id} className="row" style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 12, alignItems: "center" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: "#1a73e8", textDecoration: "underline", cursor: "pointer" }} onClick={() => loadUserDetail(vr.userId)}>{vr.firstName} {vr.lastName}</div>
                          <div style={{ fontSize: 11, color: "#888" }}>@{vr.user.username} · {vr.email}</div>
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={async () => {
                          const muteDays = prompt("Approve vendor. Mute for how many days? (0 = no mute)");
                          const md = parseInt(muteDays || "0");
                          await fetch("/api/admin/actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "approve_vendor", requestId: vr.id, userId: vr.userId }) });
                          if (md > 0) { await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "set_mute", userId: vr.userId, muteDays: md }) }); }
                          loadAll();
                        }}>✓ Approve</button>
                        <button className="btn btn-danger btn-sm" onClick={() => { setVrRejectId(vr.id); setVrRejectReason(""); setVrMuteDays(0); }}>✗ Reject</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* All Vendors */}
                <div className="panel">
                  <div className="panel-head" style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 1fr 80px 90px", gap: 12, padding: "8px 16px", fontSize: 11, color: "#999", fontWeight: 600, textTransform: "uppercase" }}>
                    <span>Vendor</span>
                    <span>Email</span>
                    <span>Status</span>
                    <span style={{ textAlign: "right" }}>Balance</span>
                    <span style={{ textAlign: "right" }}>Joined</span>
                  </div>
                  {filteredVendors.length === 0 && <div style={{ padding: 20, color: "#888", fontSize: 12, textAlign: "center" }}>No vendors found</div>}
                  {filteredVendors.map(u => (
                    <div key={u.id} style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 1fr 80px 90px", gap: 12, padding: "10px 16px", borderBottom: "1px solid #f0f0f0", alignItems: "center", cursor: "pointer", transition: "background 0.15s" }} className="row" onMouseEnter={e => (e.currentTarget.style.background = "#f9f9f9")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")} onClick={() => loadUserDetail(u.id)}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#1a73e8", textDecoration: "underline" }}>{u.name || u.username}</div>
                      <div style={{ fontSize: 12, color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
                      <div>
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, fontWeight: 600, background: u.vendorStatus === "approved" ? "#e8f5e9" : u.vendorStatus === "pending" ? "#fff3cd" : "#fde8e8", color: u.vendorStatus === "approved" ? "#2e7d32" : u.vendorStatus === "pending" ? "#856404" : "#c62828" }}>
                          {u.vendorStatus}
                        </span>
                      </div>
                      <div style={{ textAlign: "right", fontWeight: 600, color: "#3ea136", fontSize: 12 }}>{money(u.balance)}</div>
                      <div style={{ textAlign: "right", fontSize: 11, color: "#aaa" }}>{new Date(u.registeredAt).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ==================== PRODUCTS ==================== */}
            {tab === "products" && !selectedProduct && (
              <>
                <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center", flexWrap: 'wrap' }}>
                  <select value={productFilter} onChange={e => setProductFilter(e.target.value)} className="input" style={{ width: 160 }}>
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="hold">Hold</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <input type="text" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="input" style={{ flex: 1 }} />
                  <span style={{ fontSize: 12, color: "#888" }}>{filteredProducts.length} products</span>
                  <button
                    onClick={() => { setShowMergeTool(!showMergeTool); if (!showMergeTool) fetchMergeCandidates(); }}
                    style={{ background: showMergeTool ? '#5a32a3' : '#6f42c1', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    🔗 Merge Tool
                  </button>
                </div>

                {/* Merge Tool Panel */}
                {showMergeTool && (
                  <div className="panel" style={{ marginBottom: 16, border: '2px solid #6f42c1' }}>
                    <div className="panel-head" style={{ background: '#6f42c1', color: '#fff' }}>
                      🔗 Product Merge Tool
                    </div>
                    <div style={{ padding: 16 }}>
                      {mergeLoading ? (
                        <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>Loading merge candidates...</div>
                      ) : mergeCandidates.length === 0 ? (
                        <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>No duplicate products found to merge.</div>
                      ) : (
                        mergeCandidates.map((group) => (
                          <div key={group.title} style={{ border: '1px solid #e0e0e0', borderRadius: 6, marginBottom: 12, overflow: 'hidden' }}>
                            <div style={{ padding: '10px 16px', background: '#f8f9fa', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 14 }}>{group.title}</div>
                                <div style={{ fontSize: 11, color: '#888' }}>{platformLabel(group.platform)} · {group.category} · {group.products.length} vendors · {group.totalStock} total stock</div>
                              </div>
                              <button
                                onClick={() => mergeProducts(group.title)}
                                disabled={!mergeSelected[group.title] || mergeSelected[group.title].length < 2}
                                style={{
                                  background: (!mergeSelected[group.title] || mergeSelected[group.title].length < 2) ? '#ccc' : '#28a745',
                                  color: '#fff', border: 'none', borderRadius: 4, padding: '6px 14px',
                                  fontSize: 12, fontWeight: 600, cursor: (!mergeSelected[group.title] || mergeSelected[group.title].length < 2) ? 'not-allowed' : 'pointer'
                                }}
                              >
                                Merge Selected ({(mergeSelected[group.title] || []).length})
                              </button>
                            </div>
                            <div style={{ padding: 8 }}>
                              {group.products.map((p) => (
                                <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 4, cursor: 'pointer', background: (mergeSelected[group.title] || []).includes(p.id) ? '#e8f5e9' : 'transparent' }}>
                                  <input
                                    type="checkbox"
                                    checked={(mergeSelected[group.title] || []).includes(p.id)}
                                    onChange={() => toggleMergeSelect(group.title, p.id)}
                                  />
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600 }}>{p.vendor.username}</div>
                                    <div style={{ fontSize: 11, color: '#666' }}>{money(p.storePrice)} · {p.stock} stock · {p.totalSales} sold</div>
                                  </div>
                                  <span style={{ fontSize: 11, color: '#888' }}>SKU: {p.id.slice(0, 8)}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Pending Approval Queue */}
                {(() => {
                  const pending = products.filter(p => p.status === 'pending');
                  if (pending.length === 0) return null;
                  const allChecked = pending.every(p => pendingQueueSelected.has(p.id));
                  return (
                    <div className="panel" style={{ marginBottom: 12, border: pendingQueueSelected.size > 0 ? '2px solid #eab308' : undefined }}>
                      <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, background: '#fff3cd' }}>
                        <span>⏳ Pending Queue ({pending.length})</span>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <button className="btn btn-sm btn-secondary" onClick={loadAll}>Refresh</button>
                          <button className="btn btn-sm" style={{ background: '#dc3545', color: '#fff', border: 'none', padding: '4px 10px', fontSize: 11, borderRadius: 4 }} onClick={() => { setRejectAllReason(''); setRejectAllOpen(true); }}>Reject All</button>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '24px minmax(0, 1fr) 90px 70px 60px 70px 14px auto', gap: 10, padding: '8px 16px', fontSize: 11, color: '#999', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid #f0f0f0', alignItems: 'center' }}>
                        <input type="checkbox" checked={allChecked} onChange={e => setPendingQueueSelected(e.target.checked ? new Set(pending.map(p => p.id)) : new Set())} />
                        <span>Product</span>
                        <span>Platform</span>
                        <span>Price</span>
                        <span>Stock</span>
                        <span>Accounts</span>
                        <span />
                        <span style={{ textAlign: 'right' }}>Actions</span>
                      </div>
                      {pending.map(p => {
                        const accountLines = (p.accountsData || '').split(/\r?\n/).filter(Boolean);
                        return (
                          <div key={p.id} className="row" style={{ display: 'grid', gridTemplateColumns: '24px minmax(0, 1fr) 90px 70px 60px 70px 14px auto', gap: 10, padding: '10px 16px', borderBottom: '1px solid #f0f0f0', alignItems: 'center' }}>
                            <input type="checkbox" checked={pendingQueueSelected.has(p.id)} onChange={() => { setPendingQueueSelected(prev => { const next = new Set(prev); if (next.has(p.id)) next.delete(p.id); else next.add(p.id); return next; }); }} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{p.title}</div>
                              <div style={{ fontSize: 11, color: '#888' }}>
                                <span style={{ color: '#1976d2', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => loadUserDetail(p.vendor.id)}>@{p.vendor.username}</span>
                              </div>
                            </div>
                            <span style={{ fontSize: 12, color: '#666' }}>{platformLabel(p.platform)}</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#3ea136' }}>{money(p.storePrice)}</span>
                            <span style={{ fontSize: 12 }}>{p.stock}</span>
                            <span style={{ fontSize: 12, color: '#888' }}>{accountLines.length}</span>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.stock === 0 ? '#dc3545' : p.stock <= 5 ? '#ff9800' : '#28a745', display: 'inline-block' }} />
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                              <button className="btn btn-sm" style={{ background: '#17a2b8', color: '#fff', border: 'none', padding: '4px 8px', fontSize: 11, borderRadius: 4 }} onClick={() => setPreviewProduct(p)}>Preview</button>
                              <button className="btn btn-sm" style={{ background: '#28a745', color: '#fff', border: 'none', padding: '4px 8px', fontSize: 11, borderRadius: 4 }} onClick={() => doProductAction('approve', p.id)}>Approve</button>
                              <button className="btn btn-sm" style={{ background: '#dc3545', color: '#fff', border: 'none', padding: '4px 8px', fontSize: 11, borderRadius: 4 }} onClick={() => { setRejectProduct(p); setRejectReason(''); }}>Reject</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Group products by title */}
                {(() => {
                  const searched = filteredProducts.filter(p => !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.vendor.username.toLowerCase().includes(search.toLowerCase()));
                  const groups = new Map<string, typeof products>();
                  for (const p of searched) {
                    const key = p.title;
                    if (!groups.has(key)) groups.set(key, []);
                    groups.get(key)!.push(p);
                  }
                  return Array.from(groups.entries()).map(([title, groupProducts]) => {
                    const totalStock = groupProducts.reduce((s, p) => s + p.stock, 0);
                    const totalValue = groupProducts.reduce((s, p) => s + p.storePrice * p.stock, 0);
                    const soldCount = groupProducts.reduce((s, p) => s + ((p as any).soldCount || 0), 0);
                    const vendors = [...new Map(groupProducts.map(p => [p.vendor.id, p.vendor])).values()];
                    const isExpanded = expandedGroup === title;
                    const view = groupView[title] || 'list';
                    // Status counts
                    const statusCounts = groupProducts.reduce((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; }, {} as Record<string, number>);

                    // Bulk download helpers
                    const downloadText = (content: string, filename: string) => {
                      const blob = new Blob([content], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url; a.download = filename; a.click();
                      URL.revokeObjectURL(url);
                    };
                    const extractField = (accountsData: string, fieldIndex: number): string => {
                      return accountsData.split(/\r?\n/).filter(Boolean).map(line => {
                        const parts = line.split(':');
                        return parts[fieldIndex] || '';
                      }).filter(Boolean).join('\n');
                    };
                    const format = (groupProducts[0]?.deliveryFormat || 'email:pass').toLowerCase();
                    const fmtParts = format.split(':');
                    const usernameIdx = fmtParts.findIndex((f: string) => f === 'user' || f === 'username' || f === 'usr');
                    const passIdx = fmtParts.findIndex((f: string) => f === 'pass' || f === 'password' || f === 'pwd');
                    const emailIdx = fmtParts.findIndex((f: string) => f === 'mail' || f === 'email');
                    const emailPassIdx = fmtParts.findIndex((f: string) => f === 'mailpass' || f === 'mailpass' || f === 'mailpass');
                    // For mailpass, also check if 'mail' is followed by 'pass' as separate fields
                    const mailPassCombined = fmtParts.findIndex((f: string) => f === 'mailpass');

                    const getAllAccounts = () => groupProducts.map(p => (p.accountsData || '').split(/\r?\n/).filter(Boolean)).flat();
                    const allAccountsCount = getAllAccounts().length;

                    const panelStyle: React.CSSProperties = { marginBottom: 12, border: isExpanded ? '2px solid #3ea136' : undefined };

                    return (
                      <div key={title} className="panel" style={panelStyle}>
                        {/* Header */}
                        <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, fontSize: 14 }}>{title}</span>
                            <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 3, background: '#eee', color: '#666' }}>{platformLabel(groupProducts[0].platform)}</span>
                            {Object.entries(statusCounts).map(([st, count]) => (
                              <span key={st} className={`badge badge-${st}`} style={{ fontSize: 10 }}>{st}: {count}</span>
                            ))}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#888' }}>
                            <span>{vendors.length} vendor{vendors.length !== 1 ? 's' : ''}</span>
                            <span>·</span>
                            <span>{totalStock} stock</span>
                            {soldCount > 0 && (<><span>·</span><span>{soldCount} sold</span></>)}
                            <span>·</span>
                            <span style={{ fontWeight: 600, color: '#3ea136' }}>{money(totalValue)}</span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div style={{ padding: '8px 16px', display: 'flex', gap: 6, flexWrap: 'wrap', borderBottom: isExpanded ? '1px solid #eee' : undefined }}>
                          <button
                            onClick={() => {
                              const next = isExpanded && view === 'details' ? null : title;
                              setExpandedGroup(next);
                              if (next) setGroupView(v => ({ ...v, [title]: 'details' }));
                            }}
                            className="btn btn-sm"
                            style={{ background: isExpanded && view === 'details' ? '#5a32a3' : '#6f42c1', color: '#fff', border: 'none', padding: '5px 10px', fontSize: 12, fontWeight: 600, borderRadius: 4 }}
                          >Details</button>
                          <button
                            onClick={() => {
                              const next = isExpanded && view === 'vendors' ? null : title;
                              setExpandedGroup(next);
                              if (next) setGroupView(v => ({ ...v, [title]: 'vendors' }));
                            }}
                            className="btn btn-sm"
                            style={{ background: isExpanded && view === 'vendors' ? '#0056b3' : '#007bff', color: '#fff', border: 'none', padding: '5px 10px', fontSize: 12, fontWeight: 600, borderRadius: 4 }}
                          >Seller ({vendors.length})</button>
                          <button
                            onClick={() => {
                              const next = isExpanded && view === 'list' ? null : title;
                              setExpandedGroup(next);
                              if (next) setGroupView(v => ({ ...v, [title]: 'list' }));
                            }}
                            className="btn btn-sm"
                            style={{ background: isExpanded && view === 'list' ? '#17a2b8' : '#20c997', color: '#fff', border: 'none', padding: '5px 10px', fontSize: 12, fontWeight: 600, borderRadius: 4 }}
                          >Products List ({groupProducts.length})</button>
                          {/* Quick actions on the group */}
                          {groupProducts.some(p => p.status === 'pending') && (
                            <button className="btn btn-sm" style={{ background: '#28a745', color: '#fff', border: 'none', padding: '5px 10px', fontSize: 12, fontWeight: 600, borderRadius: 4 }} onClick={() => {
                              if (confirm(`Approve all ${groupProducts.filter(p => p.status === 'pending').length} pending products in "${title}"?`)) {
                                groupProducts.filter(p => p.status === 'pending').forEach(p => doProductAction('approve', p.id));
                              }
                            }}>Approve All</button>
                          )}
                          {/* Visibility toggle */}
                          {(() => {
                            const lid = groupProducts[0]?.listingId;
                            if (!lid) return null;
                            const isVisible = listingVisibility[lid] !== undefined ? listingVisibility[lid] : true;
                            return (
                              <button
                                className="btn btn-sm"
                                style={{ background: isVisible ? '#6c757d' : '#ff9800', color: '#fff', border: 'none', padding: '5px 10px', fontSize: 12, fontWeight: 600, borderRadius: 4 }}
                                onClick={() => {
                                  const action = isVisible ? 'Hide' : 'Show';
                                  if (confirm(`${action} listing \"${title}\" for users and vendors? Admin can always see it.`)) {
                                    toggleListingVisibility(lid);
                                  }
                                }}
                              >{isVisible ? 'Hide' : 'Show'}</button>
                            );
                          })()}
                        </div>

                        {/* Expanded content */}
                        {isExpanded && view === 'details' && (
                          <div style={{ padding: 16 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                              <div><div style={{ fontSize: 11, color: '#888' }}>Platform</div><div style={{ fontWeight: 600 }}>{platformLabel(groupProducts[0].platform)}</div></div>
                              <div><div style={{ fontSize: 11, color: '#888' }}>Category</div><div style={{ fontWeight: 600 }}>{groupProducts[0].category || '—'}</div></div>
                              <div><div style={{ fontSize: 11, color: '#888' }}>Description</div><div style={{ fontSize: 12 }}>{groupProducts[0].description || 'No description'}</div></div>
                              <div><div style={{ fontSize: 11, color: '#888' }}>Delivery Format</div><div style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>{groupProducts[0].deliveryFormat}</div></div>
                              <div><div style={{ fontSize: 11, color: '#888' }}>Price Range</div><div style={{ fontWeight: 600, color: '#3ea136' }}>{money(Math.min(...groupProducts.map(p => p.storePrice)))} — {money(Math.max(...groupProducts.map(p => p.storePrice)))}</div></div>
                              <div><div style={{ fontSize: 11, color: '#888' }}>Country</div><div style={{ fontWeight: 600 }}>{groupProducts[0].countryRegister || 'Global'}</div></div>
                            </div>
                            {/* Bulk download buttons */}
                            <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 11, color: '#888', alignSelf: 'center' }}>Download:</span>
                              {usernameIdx >= 0 && (
                                <button className="btn btn-sm btn-secondary" onClick={() => {
                                  const all = getAllAccounts();
                                  const data = extractField(all.join('\n'), usernameIdx);
                                  downloadText(data, `${title.replace(/[^a-z0-9]/gi, '_')}_usernames.txt`);
                                }}>↓ Usernames</button>
                              )}
                              {passIdx >= 0 && (
                                <button className="btn btn-sm btn-secondary" onClick={() => {
                                  const all = getAllAccounts();
                                  const data = extractField(all.join('\n'), passIdx);
                                  downloadText(data, `${title.replace(/[^a-z0-9]/gi, '_')}_passwords.txt`);
                                }}>↓ Passwords</button>
                              )}
                              {emailIdx >= 0 && (
                                <button className="btn btn-sm btn-secondary" onClick={() => {
                                  const all = getAllAccounts();
                                  const data = extractField(all.join('\n'), emailIdx);
                                  downloadText(data, `${title.replace(/[^a-z0-9]/gi, '_')}_emails.txt`);
                                }}>↓ Emails</button>
                              )}
                              {emailIdx >= 0 && passIdx >= 0 && (
                                <button className="btn btn-sm btn-secondary" onClick={() => {
                                  const all = getAllAccounts();
                                  const lines = all.map(line => {
                                    const parts = line.split(':');
                                    return `${parts[emailIdx] || ''}:${parts[passIdx] || ''}`;
                                  }).filter(l => l !== ':');
                                  downloadText(lines.join('\n'), `${title.replace(/[^a-z0-9]/gi, '_')}_email_pass.txt`);
                                }}>↓ Email:Pass</button>
                              )}
                              <button className="btn btn-sm btn-secondary" onClick={() => {
                                const all = getAllAccounts();
                                downloadText(all.join('\n'), `${title.replace(/[^a-z0-9]/gi, '_')}_all_data.txt`);
                              }}>↓ All Data</button>
                            </div>
                          </div>
                        )}

                        {isExpanded && view === 'vendors' && (
                          <div style={{ padding: '8px 0' }}>
                            {vendors.map(v => (
                              <div key={v.id} className="row" style={{ cursor: 'pointer' }} onClick={() => loadUserDetail(v.id)}>
                                <div style={{ flex: 1 }}>
                                  <span style={{ fontWeight: 600 }}>{v.name || v.username}</span>
                                  <span style={{ fontSize: 11, color: '#888', marginLeft: 6 }}>@{v.username}</span>
                                </div>
                                <span className={`badge badge-${v.vendorStatus}`}>{v.vendorStatus}</span>
                                <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>{groupProducts.filter(p => p.vendor.id === v.id).length} product{groupProducts.filter(p => p.vendor.id === v.id).length !== 1 ? 's' : ''} · {groupProducts.filter(p => p.vendor.id === v.id).reduce((s, p) => s + p.stock, 0)} stock</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {isExpanded && view === 'list' && (
                          <div style={{ padding: '4px 0' }}>
                            {/* Product-level actions bar */}
                            <div style={{ padding: '6px 16px', background: '#f5f5f5', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '2px solid #e0e0e0' }}>
                              <input type="checkbox" checked={groupProducts.length > 0 && groupProducts.every(p => listSelected.has(p.id))} onChange={e => setListSelected(prev => {
                                const next = new Set(prev);
                                groupProducts.forEach(p => { if (e.target.checked) next.add(p.id); else next.delete(p.id); });
                                return next;
                              })} />
                              <span style={{ fontSize: 11, fontWeight: 600, color: '#666' }}>Select All</span>
                              <span style={{ fontSize: 11, color: '#888' }}>({groupProducts.filter(p => listSelected.has(p.id)).length} selected)</span>
                            </div>
                            {groupProducts.map(p => {
                              const accountLines = (p.accountsData || '').split(/\r?\n/).filter(Boolean);
                              return (
                                <div key={p.id} style={{ borderBottom: '2px solid #e0e0e0' }}>
                                  {/* Vendor header for this product */}
                                  <div style={{ padding: '6px 16px', background: '#fafafa', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    <input type="checkbox" checked={listSelected.has(p.id)} onChange={() => { setListSelected(prev => { const next = new Set(prev); if (next.has(p.id)) next.delete(p.id); else next.add(p.id); return next; }); }} style={{ flexShrink: 0 }} />
                                    <span
                                      style={{ fontWeight: 600, fontSize: 12, color: '#1976d2', cursor: 'pointer', textDecoration: 'underline' }}
                                      onClick={() => loadUserDetail(p.vendor.id)}
                                    >@{p.vendor.username}</span>
                                    <span style={{ fontSize: 10, color: '#888' }}>#{(p as any).sku || 'N/A'}</span>
                                    <span className={`badge badge-${p.status}`} style={{ fontSize: 10 }}>{p.status}</span>
                                    {p.isDuplicate && <span style={{ color: '#e53e3e', fontSize: 10 }}>[DUPE]</span>}
                                    <span style={{ fontSize: 11, color: '#3ea136', fontWeight: 600 }}>{money(p.storePrice)}/ea</span>
                                    <span style={{ fontSize: 11, color: '#888' }}>· {accountLines.length} accounts</span>
                                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                                      {p.status === 'pending' && <button className="btn btn-sm" style={{ background: '#28a745', color: '#fff', border: 'none', padding: '5px 10px', fontSize: 12, fontWeight: 600, borderRadius: 4 }} onClick={() => doProductAction('approve', p.id)}>Approve</button>}
                                      {p.status === 'pending' && <button className="btn btn-sm" style={{ background: '#dc3545', color: '#fff', border: 'none', padding: '5px 10px', fontSize: 12, fontWeight: 600, borderRadius: 4 }} onClick={() => { setRejectProduct(p); setRejectReason(''); }}>Reject</button>}
                                      <button className="btn btn-sm" style={{ background: p.status === 'hold' ? '#ff9800' : '#666', color: '#fff', border: 'none', padding: '5px 10px', fontSize: 12, borderRadius: 4 }} onClick={() => doProductAction('hold', p.id)}>{p.status === 'hold' ? 'Unhold' : 'Hold'}</button>
                                      <button className="btn btn-sm" style={{ background: '#28a745', color: '#fff', border: 'none', padding: '5px 10px', fontSize: 12, fontWeight: 600, borderRadius: 4 }} onClick={() => { setEditProduct(p); setEpTitle(p.title); setEpDesc(p.description); setEpPrice(String(p.vendorPrice)); setEpStock(String(p.stock)); }}>Edit</button>
                                      <button className="btn btn-sm" style={{ background: '#dc3545', color: '#fff', border: 'none', padding: '5px 10px', fontSize: 12, fontWeight: 600, borderRadius: 4 }} onClick={() => { if (confirm(`Delete product from @${p.vendor.username}?`)) doProductAction('delete', p.id); }}>Delete</button>
                                    </div>
                                  </div>
                                  {/* Account lines */}
                                  {accountLines.length === 0 ? (
                                    <div style={{ padding: '8px 16px', fontSize: 11, color: '#aaa', fontStyle: 'italic' }}>No accounts uploaded yet</div>
                                  ) : (
                                    accountLines.map((line, lineIdx) => {
                                      const accountKey = `${p.id}:${lineIdx}`;
                                      const isEditingThisLine = editingLine?.productId === p.id && editingLine?.lineIndex === lineIdx;
                                      return (
                                        <div key={lineIdx} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 16px', borderBottom: '1px solid #f5f5f5', background: isEditingThisLine ? '#fffde7' : selectedAccounts.has(accountKey) ? '#f0f7ff' : '#fff' }}>
                                          <span style={{ fontSize: 10, color: '#aaa', width: 28, flexShrink: 0, textAlign: 'right' }}>#{lineIdx + 1}</span>
                                          <input type="checkbox" checked={selectedAccounts.has(accountKey)} onChange={() => {
                                            setSelectedAccounts(prev => {
                                              const next = new Set(prev);
                                              if (next.has(accountKey)) next.delete(accountKey); else next.add(accountKey);
                                              return next;
                                            });
                                          }} style={{ flexShrink: 0 }} />
                                          {isEditingThisLine ? (
                                            <div style={{ flex: 1, display: 'flex', gap: 4 }}>
                                              <input type="text" value={editingLineText} onChange={e => setEditingLineEdit(e.target.value)} style={{ flex: 1, fontFamily: 'monospace', fontSize: 11, padding: '2px 6px', border: '1px solid #3ea136', borderRadius: 3 }} autoFocus onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                  fetch('/api/admin/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'edit_account_line', productId: p.id, lineIndex: lineIdx, newLine: editingLineText }) })
                                                    .then(r => r.json()).then(r => { if (r.success) { loadAll(); setEditingLine(null); } else toast(r.error || 'Failed to edit line', 'error'); });
                                                }
                                                if (e.key === 'Escape') setEditingLine(null);
                                              }} />
                                              <button className="btn btn-primary btn-sm" onClick={() => {
                                                fetch('/api/admin/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'edit_account_line', productId: p.id, lineIndex: lineIdx, newLine: editingLineText }) })
                                                  .then(r => r.json()).then(r => { if (r.success) { loadAll(); setEditingLine(null); } else toast(r.error || 'Failed to edit line', 'error'); });
                                              }}>Save</button>
                                              <button className="btn btn-secondary btn-sm" onClick={() => setEditingLine(null)}>Cancel</button>
                                            </div>
                                          ) : (
                                            <span style={{ flex: 1, fontFamily: 'monospace', fontSize: 11, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{line}</span>
                                          )}
                                          {!isEditingThisLine && (
                                            <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                                              <button className="btn btn-secondary btn-sm" style={{ fontSize: 10, padding: '1px 5px' }} title="Edit line" onClick={() => { setEditingLine({ productId: p.id, lineIndex: lineIdx }); setEditingLineEdit(line); }}>Edit</button>
                                              <button className="btn btn-danger btn-sm" style={{ fontSize: 10, padding: '1px 5px' }} title="Delete line" onClick={() => {
                                                if (confirm(`Delete this account line?`)) {
                                                  fetch('/api/admin/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete_account_line', productId: p.id, lineIndex: lineIdx }) })
                                                    .then(r => r.json()).then(r => { if (r.success) loadAll(); else toast(r.error || 'Failed to delete line', 'error'); });
                                                }
                                              }}>Del</button>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              );
                            })}
                            {/* Bulk actions bar */}
                            <div style={{ padding: '8px 16px', display: 'flex', gap: 6, flexWrap: 'wrap', borderTop: '2px solid #e0e0e0', background: '#fafafa', alignItems: 'center' }}>
                              {selectedAccounts.size > 0 && (
                                <>
                                  <span style={{ fontSize: 11, fontWeight: 600, color: '#1976d2' }}>{selectedAccounts.size} selected</span>
                                  <button className="btn btn-danger btn-sm" style={{ background: '#dc3545', color: '#fff', border: 'none', padding: '5px 10px', fontSize: 11, borderRadius: 4 }} onClick={() => {
                                    if (confirm(`Delete ${selectedAccounts.size} selected account lines? This cannot be undone.`)) {
                                      const entries = Array.from(selectedAccounts).map(k => { const [pid, idx] = k.split(':'); return { productId: pid, lineIndex: parseInt(idx) }; });
                                      entries.sort((a, b) => b.lineIndex - a.lineIndex);
                                      (async () => {
                                        for (const e of entries) {
                                          await fetch('/api/admin/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete_account_line', productId: e.productId, lineIndex: e.lineIndex }) });
                                        }
                                        setSelectedAccounts(new Set());
                                        loadAll();
                                      })();
                                    }
                                  }}>Delete Selected</button>
                                </>
                              )}
                              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                                <span style={{ fontSize: 11, color: '#888', alignSelf: 'center' }}>Download:</span>
                                {usernameIdx >= 0 && <button className="btn btn-sm btn-secondary" onClick={() => { const all = getAllAccounts(); downloadText(extractField(all.join('\n'), usernameIdx), `${title.replace(/[^a-z0-9]/gi, '_')}_usernames.txt`); }}>↓ Usernames</button>}
                                {passIdx >= 0 && <button className="btn btn-sm btn-secondary" onClick={() => { const all = getAllAccounts(); downloadText(extractField(all.join('\n'), passIdx), `${title.replace(/[^a-z0-9]/gi, '_')}_passwords.txt`); }}>↓ Passwords</button>}
                                {emailIdx >= 0 && <button className="btn btn-sm btn-secondary" onClick={() => { const all = getAllAccounts(); downloadText(extractField(all.join('\n'), emailIdx), `${title.replace(/[^a-z0-9]/gi, '_')}_emails.txt`); }}>↓ Emails</button>}
                                {emailIdx >= 0 && passIdx >= 0 && <button className="btn btn-sm btn-secondary" onClick={() => {
                                  const all = getAllAccounts();
                                  const lines = all.map(line => { const parts = line.split(':'); return `${parts[emailIdx] || ''}:${parts[passIdx] || ''}`; }).filter(l => l !== ':');
                                  downloadText(lines.join('\n'), `${title.replace(/[^a-z0-9]/gi, '_')}_email_pass.txt`);
                                }}>↓ Email:Pass</button>}
                                <button className="btn btn-sm btn-secondary" onClick={() => { const all = getAllAccounts(); downloadText(all.join('\n'), `${title.replace(/[^a-z0-9]/gi, '_')}_all.txt`); }}>↓ All Data ({allAccountsCount} lines)</button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}

                {/* Floating batch action bar */}
                {(() => {
                  const allSelected = Array.from(new Set([...pendingQueueSelected, ...listSelected]));
                  if (allSelected.length === 0) return null;
                  const batchAction = async (action: 'batch_approve' | 'batch_reject' | 'batch_delete', label: string) => {
                    if (action !== 'batch_approve' && !confirm(`${label.charAt(0).toUpperCase() + label.slice(1)} ${allSelected.length} selected products?`)) return;
                    try {
                      const res = await fetch('/api/admin/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ids: allSelected }) });
                      const r = await res.json();
                      if (r.success) {
                        toast(`${r.count || allSelected.length} products ${label}`, 'success');
                        setPendingQueueSelected(new Set());
                        setListSelected(new Set());
                        loadAll();
                      } else toast(r.error || 'Action failed', 'error');
                    } catch { toast('Action failed', 'error'); }
                  };
                  return (
                    <div style={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 950, background: '#222', color: '#fff', borderRadius: 8, padding: '8px 14px', display: 'flex', gap: 8, alignItems: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.35)' }}>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{allSelected.length} selected</span>
                      <button style={{ padding: '5px 12px', borderRadius: 4, border: 'none', background: '#28a745', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }} onClick={() => batchAction('batch_approve', 'approved')}>Approve Selected</button>
                      <button style={{ padding: '5px 12px', borderRadius: 4, border: 'none', background: '#eab308', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }} onClick={() => batchAction('batch_reject', 'rejected')}>Reject Selected</button>
                      <button style={{ padding: '5px 12px', borderRadius: 4, border: 'none', background: '#dc3545', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }} onClick={() => batchAction('batch_delete', 'deleted')}>Delete Selected</button>
                      <button style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 14 }} onClick={() => { setPendingQueueSelected(new Set()); setListSelected(new Set()); }}>×</button>
                    </div>
                  );
                })()}
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
                      <div><div style={{ fontSize: 11, color: "#888" }}>Vendor</div><div style={{ fontWeight: 600, color: '#1976d2', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => loadUserDetail(selectedProduct.vendor.id)}>@{selectedProduct.vendor.username}</div></div>
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
                      <button className="btn btn-secondary btn-sm" onClick={() => setViewAccountsProduct(selectedProduct)}>View Accounts</button>
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
                        <div style={{ flex: 1 }}><span style={{ fontWeight: 600, color: '#1976d2', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => loadUserDetail(p.buyer.id)}>{p.buyer.username}</span> · {p.quantity}x</div>
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
                        <div style={{ flex: 1 }}><span style={{ fontWeight: 600, color: '#1976d2', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => loadUserDetail(r.buyer.id)}>{r.buyer.username}</span> · {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)} · {r.comment}</div>
                        <span style={{ fontSize: 10, color: "#aaa" }}>{new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ==================== BEST SELLERS ==================== */}
            {tab === "best-sellers" && (
              <BestSellerManager loadAll={loadAll} />
            )}

            {/* ==================== MANAGE ==================== */}
            {tab === "manage" && (
              <>
                <div className="panel" style={{ marginBottom: 12 }}>
                  <div className="panel-head">Universal Search</div>
                  <div style={{ padding: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input type="text" placeholder="Type to search users, vendors, or products..." value={mgmtQuery} onChange={e => setMgmtQuery(e.target.value)} className="input" style={{ flex: 1 }} autoFocus />
                    <select value={mgmtType} onChange={e => setMgmtType(e.target.value)} className="input" style={{ width: 120 }}>
                      <option value="all">All</option>
                      <option value="users">Users</option>
                      <option value="vendors">Vendors</option>
                      <option value="products">Products</option>
                    </select>
                  </div>
                </div>
                {mgmtLoading && mgmtQuery ? (
                  <div style={{ padding: 20, color: '#888', fontSize: 12, textAlign: 'center' }}>Searching...</div>
                ) : (
                  <>
                    {/* Users */}
                    {mgmtResults.users.length > 0 && (
                      <div className="panel" style={{ marginBottom: 12 }}>
                        <div className="panel-head">Users ({mgmtResults.users.length})</div>
                        {mgmtResults.users.map(u => {
                          const expKey = `user-${u.id}`;
                          const isExpanded = mgmtExpanded === expKey;
                          return (
                            <div key={u.id}>
                              <div className="row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px 80px', gap: 10, alignItems: 'center', cursor: 'pointer' }} onClick={() => setMgmtExpanded(isExpanded ? null : expKey)}>
                                <div><span style={{ fontWeight: 600, color: '#1976d2', textDecoration: 'underline' }}>{u.name || u.username}</span> <span style={{ fontSize: 11, color: '#888' }}>@{u.username}</span><span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 8, background: "#e8f5e9", color: "#2e7d32", fontWeight: 600, marginLeft: 6 }}>User</span></div>
                                <div style={{ fontSize: 12, color: '#666' }}>{u.email}</div>
                                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600, background: u.blocked ? '#fde8e8' : '#e8f5e9', color: u.blocked ? '#c62828' : '#2e7d32' }}>{u.blocked ? 'Blocked' : 'Active'}</span>
                                <span style={{ fontWeight: 600, color: '#3ea136', fontSize: 12, textAlign: 'right' }}>{money(u.balance)}</span>
                              </div>
                              {isExpanded && (
                                <div style={{ padding: '8px 16px 12px', background: '#f9f9f9', borderBottom: '2px solid #3ea136' }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                                    <div><div style={{ fontSize: 10, color: '#888' }}>Role</div><div style={{ fontSize: 12, fontWeight: 600 }}>{u.role}</div></div>
                                    <div><div style={{ fontSize: 10, color: '#888' }}>Country</div><div style={{ fontSize: 12 }}>{u.vendorCountry || 'Global'}</div></div>
                                    <div><div style={{ fontSize: 10, color: '#888' }}>Registered</div><div style={{ fontSize: 12 }}>{new Date(u.registeredAt).toLocaleDateString()}</div></div>
                                    <div><div style={{ fontSize: 10, color: '#888' }}>Last Login</div><div style={{ fontSize: 12 }}>{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}</div></div>
                                  </div>
                                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    <button className="btn btn-primary btn-sm" style={{ background: '#1976d2', color: '#fff', border: 'none', padding: '4px 10px', fontSize: 11, borderRadius: 4 }} onClick={e => { e.stopPropagation(); loadUserDetail(u.id); }}>Open Detail</button>
                                    <button className="btn btn-sm" style={{ background: '#28a745', color: '#fff', border: 'none', padding: '4px 10px', fontSize: 11, borderRadius: 4 }} onClick={e => { e.stopPropagation(); setEditUser(u); setEditName(u.name); setEditUsername(u.username); setEditEmail(u.email); setEditBalance(String(u.balance)); setEditRole(u.role); setEditPassword(''); }}>Edit</button>
                                    <button className="btn btn-sm" style={{ background: '#5fa830', color: '#fff', border: 'none', padding: '4px 10px', fontSize: 11, borderRadius: 4 }} onClick={e => { e.stopPropagation(); setTopupUser(u); setTopupAmount(''); setTopupReason(''); }}>Top-up</button>
                                    <button className="btn btn-sm" style={{ background: '#666', color: '#fff', border: 'none', padding: '4px 10px', fontSize: 11, borderRadius: 4 }} onClick={e => { e.stopPropagation(); setMsgUser(u); setMsgTitle(''); setMsgBody(''); }}>Message</button>
                                    {u.muted ? (
                                      <button className="btn btn-sm" style={{ background: '#ff9800', color: '#fff', border: 'none', padding: '4px 10px', fontSize: 11, borderRadius: 4 }} onClick={e => { e.stopPropagation(); doUserAction('unmute', u.id); }}>Unmute</button>
                                    ) : (
                                      <button className="btn btn-sm" style={{ background: '#666', color: '#fff', border: 'none', padding: '4px 10px', fontSize: 11, borderRadius: 4 }} onClick={e => { e.stopPropagation(); setMuteUser(u); setMuteDays(0); }}>Mute</button>
                                    )}
                                    <button className="btn btn-sm" style={{ background: '#dc3545', color: '#fff', border: 'none', padding: '4px 10px', fontSize: 11, borderRadius: 4 }} onClick={e => { e.stopPropagation(); doUserAction('toggle_block', u.id, { blocked: u.blocked }); }}>{u.blocked ? 'Unblock' : 'Block'}</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {/* Vendors */}
                    {mgmtResults.vendors.length > 0 && (
                      <div className="panel" style={{ marginBottom: 12 }}>
                        <div className="panel-head">Vendors ({mgmtResults.vendors.length})</div>
                        {mgmtResults.vendors.map(u => {
                          const expKey = `vendor-${u.id}`;
                          const isExpanded = mgmtExpanded === expKey;
                          return (
                            <div key={u.id}>
                              <div className="row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px 80px', gap: 10, alignItems: 'center', cursor: 'pointer' }} onClick={() => setMgmtExpanded(isExpanded ? null : expKey)}>
                                <div><span style={{ fontWeight: 600, color: '#1976d2', textDecoration: 'underline' }}>{u.name || u.username}</span> <span style={{ fontSize: 11, color: '#888' }}>@{u.username}</span><span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 8, background: "#e3f2fd", color: "#1565c0", fontWeight: 600, marginLeft: 6 }}>Vendor</span></div>
                                <div style={{ fontSize: 12, color: '#666' }}>{u.email}</div>
                                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600, background: u.vendorStatus === 'approved' ? '#e8f5e9' : '#fff3cd', color: u.vendorStatus === 'approved' ? '#2e7d32' : '#856404' }}>{u.vendorStatus}</span>
                                <span style={{ fontWeight: 600, color: '#3ea136', fontSize: 12, textAlign: 'right' }}>{money(u.balance)}</span>
                              </div>
                              {isExpanded && (
                                <div style={{ padding: '8px 16px 12px', background: '#f9f9f9', borderBottom: '2px solid #3ea136' }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                                    <div><div style={{ fontSize: 10, color: '#888' }}>Status</div><div style={{ fontSize: 12, fontWeight: 600 }}>{u.vendorStatus}</div></div>
                                    <div><div style={{ fontSize: 10, color: '#888' }}>Country</div><div style={{ fontSize: 12 }}>{u.vendorCountry || 'Global'}</div></div>
                                    <div><div style={{ fontSize: 10, color: '#888' }}>Registered</div><div style={{ fontSize: 12 }}>{new Date(u.registeredAt).toLocaleDateString()}</div></div>
                                    <div><div style={{ fontSize: 10, color: '#888' }}>Last Login</div><div style={{ fontSize: 12 }}>{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}</div></div>
                                  </div>
                                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    <button className="btn btn-primary btn-sm" style={{ background: '#1976d2', color: '#fff', border: 'none', padding: '4px 10px', fontSize: 11, borderRadius: 4 }} onClick={e => { e.stopPropagation(); loadUserDetail(u.id); }}>Open Detail</button>
                                    <button className="btn btn-sm" style={{ background: '#28a745', color: '#fff', border: 'none', padding: '4px 10px', fontSize: 11, borderRadius: 4 }} onClick={e => { e.stopPropagation(); setEditUser(u); setEditName(u.name); setEditUsername(u.username); setEditEmail(u.email); setEditBalance(String(u.balance)); setEditRole(u.role); setEditPassword(''); }}>Edit</button>
                                    <button className="btn btn-sm" style={{ background: '#5fa830', color: '#fff', border: 'none', padding: '4px 10px', fontSize: 11, borderRadius: 4 }} onClick={e => { e.stopPropagation(); setTopupUser(u); setTopupAmount(''); setTopupReason(''); }}>Top-up</button>
                                    <button className="btn btn-sm" style={{ background: '#666', color: '#fff', border: 'none', padding: '4px 10px', fontSize: 11, borderRadius: 4 }} onClick={e => { e.stopPropagation(); setMsgUser(u); setMsgTitle(''); setMsgBody(''); }}>Message</button>
                                    {u.muted ? (
                                      <button className="btn btn-sm" style={{ background: '#ff9800', color: '#fff', border: 'none', padding: '4px 10px', fontSize: 11, borderRadius: 4 }} onClick={e => { e.stopPropagation(); doUserAction('unmute', u.id); }}>Unmute</button>
                                    ) : (
                                      <button className="btn btn-sm" style={{ background: '#666', color: '#fff', border: 'none', padding: '4px 10px', fontSize: 11, borderRadius: 4 }} onClick={e => { e.stopPropagation(); setMuteUser(u); setMuteDays(0); }}>Mute</button>
                                    )}
                                    <button className="btn btn-sm" style={{ background: '#dc3545', color: '#fff', border: 'none', padding: '4px 10px', fontSize: 11, borderRadius: 4 }} onClick={e => { e.stopPropagation(); doUserAction('toggle_block', u.id, { blocked: u.blocked }); }}>{u.blocked ? 'Unblock' : 'Block'}</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {/* Products */}
                    {mgmtResults.products.length > 0 && (
                      <div className="panel" style={{ marginBottom: 12 }}>
                        <div className="panel-head">Products ({mgmtResults.products.length})</div>
                        {mgmtResults.products.map(p => {
                          const expKey = `product-${p.id}`;
                          const isExpanded = mgmtExpanded === expKey;
                          return (
                            <div key={p.id}>
                              <div className="row" style={{ display: 'grid', gridTemplateColumns: '1fr 100px 60px 80px', gap: 10, alignItems: 'center', cursor: 'pointer' }} onClick={() => setMgmtExpanded(isExpanded ? null : expKey)}>
                                <div><span style={{ fontWeight: 600 }}>{p.title}</span> <span style={{ fontSize: 11, color: '#888' }}>by @{p.vendor.username}</span><span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 8, background: "#f3e5f5", color: "#6a1b9a", fontWeight: 600, marginLeft: 6 }}>Product</span></div>
                                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600, background: p.status === 'approved' ? '#e8f5e9' : p.status === 'pending' ? '#fff3cd' : '#fde8e8', color: p.status === 'approved' ? '#2e7d32' : p.status === 'pending' ? '#856404' : '#c62828' }}>{p.status}</span>
                                <span style={{ fontSize: 12, color: '#888' }}>{p.stock} stock</span>
                                <span style={{ fontWeight: 600, color: '#3ea136', fontSize: 12, textAlign: 'right' }}>{money(p.storePrice)}</span>
                              </div>
                              {isExpanded && (
                                <div style={{ padding: '8px 16px 12px', background: '#f9f9f9', borderBottom: '2px solid #3ea136' }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                                    <div><div style={{ fontSize: 10, color: '#888' }}>Platform</div><div style={{ fontSize: 12, fontWeight: 600 }}>{p.platform}</div></div>
                                    <div><div style={{ fontSize: 10, color: '#888' }}>Category</div><div style={{ fontSize: 12 }}>{p.category}</div></div>
                                    <div><div style={{ fontSize: 10, color: '#888' }}>Vendor Price</div><div style={{ fontSize: 12 }}>{money(p.vendorPrice)}</div></div>
                                    <div><div style={{ fontSize: 10, color: '#888' }}>Created</div><div style={{ fontSize: 12 }}>{new Date(p.createdAt).toLocaleDateString()}</div></div>
                                  </div>
                                  <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>{p.description || 'No description'}</div>
                                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    <button className="btn btn-sm" style={{ background: '#1976d2', color: '#fff', border: 'none', padding: '4px 10px', fontSize: 11, borderRadius: 4 }} onClick={e => { e.stopPropagation(); loadProductDetail(p.id); }}>Open Detail</button>
                                    {p.status === 'pending' && <button className="btn btn-sm" style={{ background: '#28a745', color: '#fff', border: 'none', padding: '4px 10px', fontSize: 11, borderRadius: 4 }} onClick={e => { e.stopPropagation(); doProductAction('approve', p.id); }}>Approve</button>}
                                    {p.status === 'pending' && <button className="btn btn-sm" style={{ background: '#dc3545', color: '#fff', border: 'none', padding: '4px 10px', fontSize: 11, borderRadius: 4 }} onClick={e => { e.stopPropagation(); setRejectProduct(p); setRejectReason(''); }}>Reject</button>}
                                    <button className="btn btn-sm" style={{ background: '#ff9800', color: '#fff', border: 'none', padding: '4px 10px', fontSize: 11, borderRadius: 4 }} onClick={e => { e.stopPropagation(); doProductAction('hold', p.id); }}>{p.status === 'hold' ? 'Unhold' : 'Hold'}</button>
                                    <button className="btn btn-sm" style={{ background: '#28a745', color: '#fff', border: 'none', padding: '4px 10px', fontSize: 11, borderRadius: 4 }} onClick={e => { e.stopPropagation(); setEditProduct(p); setEpTitle(p.title); setEpDesc(p.description); setEpPrice(String(p.vendorPrice)); setEpStock(String(p.stock)); }}>Edit</button>
                                    <button className="btn btn-sm" style={{ background: '#dc3545', color: '#fff', border: 'none', padding: '4px 10px', fontSize: 11, borderRadius: 4 }} onClick={e => { e.stopPropagation(); if (confirm(`Delete ${p.title}?`)) doProductAction('delete', p.id); }}>Delete</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {mgmtResults.users.length === 0 && mgmtResults.vendors.length === 0 && mgmtResults.products.length === 0 && mgmtQuery && !mgmtLoading && (
                      <div style={{ padding: 20, color: '#888', fontSize: 12, textAlign: 'center' }}>No results found for "{mgmtQuery}"</div>
                    )}
                    {!mgmtQuery && (
                      <div style={{ padding: 20, color: '#888', fontSize: 12, textAlign: 'center' }}>Type a search query to find users, vendors, or products</div>
                    )}
                  </>
                )}
              </>
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
                        <div style={{ fontSize: 11, color: "#888" }}>Buyer: {o.buyer?.username ?? "—"} · Vendor: {o.product.vendor?.username ?? "—"} · {o.quantity}x</div>
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
                <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>💸 Withdrawals ({withdrawals.length})</span>
                  <button className="btn btn-sm btn-secondary" onClick={() => { fetch('/api/dashboard/admin').then(r => r.json()).then(d => { setWithdrawals(d.allWithdrawals || []); }); }}>Refresh</button>
                </div>
                {withdrawals.length === 0 ? <div style={{ padding: 20, color: '#888', fontSize: 13, textAlign: 'center' }}>No withdrawals</div> :
                  withdrawals.map(w => (
                    <div key={w.id} style={{ borderBottom: '1px solid #eee', padding: 12 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px 80px', gap: 10, alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{w.user?.username || 'Vendor'}</div>
                          <div style={{ fontSize: 11, color: '#888' }}>{w.user?.email || ''}</div>
                        </div>
                        <div style={{ fontSize: 12, color: '#666' }}>{w.method?.toUpperCase()}</div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{money(w.amount)}</div>
                          <div style={{ fontSize: 10, color: '#888' }}>Net: {money(w.netAmount)} · Fee: {money(w.fee)}</div>
                        </div>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600, background: w.status === 'approved' ? '#e8f5e9' : w.status === 'pending' ? '#fff3cd' : '#fce4ec', color: w.status === 'approved' ? '#2e7d32' : w.status === 'pending' ? '#856404' : '#c62828' }}>{w.status}</span>
                      </div>
                      {w.wallet && (
                        <div style={{ marginTop: 6, padding: '4px 8px', background: '#f0f7ff', borderRadius: 4, fontFamily: 'monospace', fontSize: 11, color: '#555', wordBreak: 'break-all' }}>
                          Wallet: {w.wallet}
                        </div>
                      )}
                      {w.status === 'pending' && (
                        <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                          <button style={{ padding: '4px 12px', borderRadius: 4, border: 'none', background: '#28a745', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }} onClick={async () => { if (!confirm('Approve this withdrawal?')) return; const res = await fetch('/api/withdrawals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'admin_approve', withdrawalId: w.id }) }); if (res.ok) { setWithdrawals(prev => prev.map(x => x.id === w.id ? { ...x, status: 'approved' } : x)); } }}>Approve</button>
                          <button style={{ padding: '4px 12px', borderRadius: 4, border: 'none', background: '#dc3545', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }} onClick={async () => { if (!confirm('Reject this withdrawal?')) return; const res = await fetch('/api/withdrawals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'admin_reject', withdrawalId: w.id }) }); if (res.ok) { setWithdrawals(prev => prev.map(x => x.id === w.id ? { ...x, status: 'rejected' } : x)); } }}>Reject</button>
                        </div>
                      )}
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
              <>
                {(() => {
                  const totalAmount = allDeposits.reduce((s: number, d: any) => s + (d.amount || 0), 0);
                  const pendingAmount = allDeposits.filter((d: any) => d.status === 'pending').reduce((s: number, d: any) => s + (d.amount || 0), 0);
                  return (
                    <div className="panel" style={{ marginBottom: 12 }}>
                      <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <span>💰 All Deposits ({allDeposits.length})</span>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 12 }}>
                          <span style={{ fontWeight: 600 }}>Total: <span style={{ color: '#3ea136' }}>{money(totalAmount)}</span></span>
                          <span style={{ fontWeight: 600 }}>Pending: <span style={{ color: '#eab308' }}>{money(pendingAmount)}</span></span>
                          <button className="btn btn-sm btn-secondary" onClick={fetchDeposits}>Refresh</button>
                        </div>
                      </div>
                      {allDeposits.length === 0 ? (
                        <div style={{ padding: 20, color: '#888', fontSize: 13, textAlign: 'center' }}>No deposits found. Deposits will appear here when users fund their accounts.</div>
                      ) : (
                        allDeposits.map((d: any) => (
                          <div key={d.id} className="row" style={{ borderBottom: '1px solid #eee', padding: 12 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px 80px 90px', gap: 10, alignItems: 'center' }}>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 13, color: '#1976d2', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => d.userId && loadUserDetail(d.userId)}>{d.user?.username || d.userId}</div>
                                <div style={{ fontSize: 11, color: '#888' }}>{d.user?.email || ''}</div>
                              </div>
                              <div style={{ fontSize: 12, color: '#666' }}>{d.network || d.method}</div>
                              <div>
                                <div style={{ fontWeight: 700, color: '#3ea136', fontSize: 14 }}>{money(d.amount)}</div>
                                {d.exactAmount && <div style={{ fontSize: 10, color: '#888' }}>Exact: {d.exactAmount} USDT</div>}
                              </div>
                              <div>
                                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600, background: d.status === 'completed' ? '#e8f5e9' : d.status === 'pending' ? '#fff3cd' : '#fde8e8', color: d.status === 'completed' ? '#2e7d32' : d.status === 'pending' ? '#856404' : '#c62828' }}>{d.status}</span>
                                {d.status === 'completed' && <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>Completed</div>}
                              </div>
                              <span style={{ fontSize: 10, color: '#aaa', textAlign: 'right' }}>{new Date(d.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: 11 }}>
                              {d.txHash && (
                                <div style={{ padding: '4px 8px', background: '#f5f5f5', borderRadius: 4, fontFamily: 'monospace', color: '#555', wordBreak: 'break-all', flex: '1 1 300px' }}>
                                  TX: {d.txHash}
                                </div>
                              )}
                              {d.walletAddress && (
                                <div style={{ padding: '4px 8px', background: '#f0f7ff', borderRadius: 4, fontFamily: 'monospace', color: '#555', wordBreak: 'break-all', flex: '1 1 300px' }}>
                                  Wallet: {d.walletAddress}
                                </div>
                              )}
                              {d.status === 'pending' && (
                                <div style={{ flexShrink: 0 }}>
                                  <div style={{ display: 'flex', gap: 4 }}>
                                    <button style={{ padding: '4px 10px', borderRadius: 4, border: 'none', background: '#28a745', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }} onClick={async () => { if (!confirm('Approve this deposit?')) return; const res = await fetch('/api/deposits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'admin_approve', depositId: d.id }) }); if (res.ok) fetchDeposits(); }}>Approve</button>
                                    <button style={{ padding: '4px 10px', borderRadius: 4, border: 'none', background: '#dc3545', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }} onClick={async () => { if (!confirm('Reject this deposit?')) return; const res = await fetch('/api/deposits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'admin_reject', depositId: d.id }) }); if (res.ok) fetchDeposits(); }}>Reject</button>
                                    <button style={{ padding: '4px 10px', borderRadius: 4, border: 'none', background: '#17a2b8', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }} onClick={async () => {
                                      try {
                                        const res = await fetch('/api/deposits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'admin_verify', depositId: d.id }) });
                                        const r = await res.json();
                                        if (res.ok && r.success) {
                                          const v = r.result || {};
                                          const text = v.confirmed ? `Confirmed on-chain${v.amount ? ` · ${v.amount} USDT` : ''}` : v.partial ? `Partial: ${v.actualAmount || 0}/${v.expectedAmount || d.amount} USDT` : (v.reason || 'Verified');
                                          setDepositVerify(prev => ({ ...prev, [d.id]: { ok: v.confirmed !== false, text } }));
                                          toast(v.confirmed ? 'Deposit verified on-chain' : 'On-chain check completed', v.confirmed ? 'success' : 'info');
                                        } else {
                                          setDepositVerify(prev => ({ ...prev, [d.id]: { ok: false, text: r.error || 'Verification failed' } }));
                                          toast(r.error || 'Verification failed', 'error');
                                        }
                                      } catch { toast('Verification failed', 'error'); }
                                    }}>Verify on-chain</button>
                                  </div>
                                  {depositVerify[d.id] && (
                                    <div style={{ fontSize: 11, color: depositVerify[d.id].ok ? '#2e7d32' : '#c62828', marginTop: 4 }}>
                                      {depositVerify[d.id].ok ? '✓' : '✕'} {depositVerify[d.id].text}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  );
                })()}
              </>
            )}

            {/* ==================== DISPUTES ==================== */}
            {tab === "disputes" && (
              <div className="panel">
                <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>⚖️ Disputes ({allDisputes.length})</span>
                  <button className="btn btn-sm btn-secondary" onClick={() => { fetch('/api/dashboard/admin').then(r => r.json()).then(d => { setAllDisputes(d.allDisputes || []); }); }}>Refresh</button>
                </div>
                {allDisputes.length === 0 ? <div style={{ padding: 20, color: '#888', fontSize: 13, textAlign: 'center' }}>No disputes</div> :
                  allDisputes.map(d => (
                    <div key={d.id} style={{ borderBottom: '1px solid #eee', padding: 12 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 10, alignItems: 'start' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#1976d2', cursor: 'pointer' }} onClick={() => d.buyer?.id && loadUserDetail(d.buyer.id)}>{d.buyer?.username || 'Unknown'} <span style={{ color: '#888', fontWeight: 400, fontSize: 11 }}>{d.buyer?.email || ''}</span></div>
                          {d.purchase?.product?.title && (
                            <div style={{ fontSize: 12, color: '#333', marginTop: 4 }}>Product: <strong>{d.purchase.product.title}</strong> {d.purchase.product.platform ? `(${d.purchase.product.platform})` : ''} · {money(d.purchase.product.storePrice || 0)} × {d.purchase.quantity || 1}</div>
                          )}
                          {d.purchase?.product?.vendor && (
                            <div style={{ fontSize: 12, color: '#333', marginTop: 2 }}>Vendor: <strong>{d.purchase.product.vendor.username}</strong> <span style={{ color: '#888', fontSize: 11 }}>{d.purchase.product.vendor.email || ''}</span></div>
                          )}
                          <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>{d.reason}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 11, color: '#aaa' }}>{new Date(d.createdAt).toLocaleDateString()}</div>
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600, display: 'inline-block', marginTop: 4, background: d.status === 'open' ? '#fff3cd' : d.status === 'resolved' ? '#e8f5e9' : '#fde8e8', color: d.status === 'open' ? '#856404' : d.status === 'resolved' ? '#2e7d32' : '#c62828' }}>{d.status}</span>
                          {d.status === 'resolved' && d.refundAmount > 0 && (
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#3ea136', marginTop: 4 }}>Refunded {money(d.refundAmount)}</div>
                          )}
                          {d.status === 'resolved' && d.vendorCharge > 0 && (
                            <div style={{ fontSize: 11, color: '#c62828', marginTop: 2 }}>Vendor charged {money(d.vendorCharge)}</div>
                          )}
                        </div>
                      </div>
                      {d.purchase?.accounts && (
                        <pre style={{ fontSize: 11, background: '#f9f9f9', padding: 8, borderRadius: 4, fontFamily: 'monospace', overflowX: 'auto', whiteSpace: 'pre-wrap', marginTop: 6, marginBottom: 0 }}>{d.purchase.accounts}</pre>
                      )}
                      {d.status === 'open' && (
                        <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
                          <input type="text" placeholder="Resolution note..." value={disputeResolution[d.id] || ''} onChange={e => setDisputeResolution(prev => ({ ...prev, [d.id]: e.target.value }))} className="input" style={{ flex: 1, fontSize: 12, padding: '6px 10px' }} />
                          <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                            <input type="checkbox" checked={disputeRefund[d.id] || false} onChange={e => setDisputeRefund(prev => ({ ...prev, [d.id]: e.target.checked }))} /> Refund & charge vendor
                          </label>
                          <button style={{ padding: '6px 12px', borderRadius: 4, border: 'none', background: '#28a745', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }} onClick={async () => {
                            const resolution = disputeResolution[d.id]?.trim();
                            if (!resolution) { toast('Enter a resolution note', 'error'); return; }
                            if (!confirm('Resolve this dispute? Buyer will be refunded and vendor charged.')) return;
                            const res = await fetch('/api/admin/actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'resolve_dispute', disputeId: d.id, resolution, refundBuyer: !!disputeRefund[d.id] }) });
                            if (res.ok) {
                              const rj = await res.json();
                              setAllDisputes(prev => prev.map(x => x.id === d.id ? { ...x, status: 'resolved', resolution, refundAmount: rj.refundAmount || 0, vendorCharge: rj.vendorCharge || 0 } : x));
                              setDisputeResolution(prev => { const p = { ...prev }; delete p[d.id]; return p; });
                              loadAll();
                            } else { const r = await res.json(); toast(r.error || 'Failed to resolve', 'error'); }
                          }}>Resolve</button>
                        </div>
                      )}
                      {d.resolution && (
                        <div style={{ marginTop: 6, padding: '6px 10px', background: '#f0f7ff', borderRadius: 4, fontSize: 11, color: '#555' }}>
                          Resolution: {d.resolution}
                        </div>
                      )}
                    </div>
                  ))
                }
              </div>
            )}

            {/* ==================== NOTIFICATIONS ==================== */}
            {tab === "notifications" && (
              <div className="panel">
                <div className="panel-head">Notifications</div>
                {notifList.length === 0 ? <div style={{ padding: 20, color: '#888', fontSize: 13, textAlign: 'center' }}>No notifications</div> : notifList.map(n => (
                  <div key={n.id} className="row">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{n.title}</div>
                      <div style={{ fontSize: 11, color: '#888' }}>{n.message}</div>
                    </div>
                    <span style={{ fontSize: 10, color: '#aaa' }}>{new Date(n.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}

            {/* ==================== NOTICES ==================== */}
            {tab === "notices" && (
              <>
                <div className="panel" style={{ marginBottom: 12 }}>
                  <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Send Notice</span>
                    {!noticeFormOpen && (
                      <button className="btn btn-sm btn-primary" onClick={() => { setNoticeFormOpen(true); setEditingNotice(null); }}>Send New Notice</button>
                    )}
                  </div>
                  {noticeFormOpen && (
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
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <label className="label" style={{ marginBottom: 0 }}>Closeable by users:</label>
                      <select value={noticeCloseable ? "yes" : "no"} onChange={e => setNoticeCloseable(e.target.value === "yes")} className="input" style={{ width: 120 }}>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <div style={{ fontSize: 12, color: "#888", padding: "6px 0" }}>
                        Notice types: <span style={{ color: "#e53e3e" }}>urgent</span> · <span style={{ color: "#3ea136" }}>coupon</span> · <span style={{ color: "#2196f3" }}>info</span> · <span style={{ color: "#ff9800" }}>goodnews</span> · <span style={{ color: "#9c27b0" }}>warning</span>
                      </div>
                    </div>
                    {editingNotice ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-primary" onClick={saveNoticeEdit}>Update Notice</button>
                        <button className="btn btn-secondary" onClick={() => { setEditingNotice(null); setNoticeTitle(""); setNoticeBody(""); }}>Cancel Edit</button>
                      </div>
                    ) : (
                      <button className="btn btn-primary" onClick={sendNotice}>Send Notice</button>
                    )}
                  </div>
                  )}
                </div>
                <div className="panel">
                  <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Notice List ({allNotices.length})</span>
                    <button className="btn btn-sm btn-secondary" onClick={loadNotices}>Refresh</button>
                  </div>
                  {allNotices.length === 0 ? (
                    <div style={{ padding: 20, color: "#888", fontSize: 13, textAlign: "center" }}>No notices created yet</div>
                  ) : allNotices.map(n => (
                    <div key={n.id} style={{ padding: 12, borderBottom: "1px solid #eee" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 13, fontWeight: 700 }}>{n.title}</span>
                            <span className={`badge badge-${n.type}`}>{n.type}</span>
                            <span className={`badge ${n.active ? "badge-approved" : "badge-rejected"}`}>{n.active ? "Active" : "Inactive"}</span>
                            {n.closeable === false && <span style={{ fontSize: 10, color: "#888" }}>not closeable</span>}
                          </div>
                          <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{n.message}</div>
                          <div style={{ fontSize: 10, color: "#aaa", marginTop: 4 }}>{new Date(n.createdAt).toLocaleString()}</div>
                          {n.hiddenForUserIds && (() => { try { const h = JSON.parse(n.hiddenForUserIds); return h.length > 0 ? <div style={{ fontSize: 10, color: "#e53e3e", marginTop: 2 }}>Hidden from {h.length} user(s)</div> : null; } catch { return null; } })()}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                          <button className="btn btn-sm btn-secondary" onClick={() => { setEditingNotice(n); setNoticeTitle(n.title); setNoticeBody(n.message.replace(/^\[NOTICE:[^\]]+\]\s*/, "")); setNoticeType(n.type || "info"); setNoticeCloseable(n.closeable !== false); setNoticeActive(n.active !== false); }}>Edit</button>
                          <button className="btn btn-sm btn-secondary" onClick={() => { setHideNotice(n); const s = new Set<string>(); if (n.hiddenForUserIds) { try { JSON.parse(n.hiddenForUserIds).forEach((id: string) => s.add(id)); } catch {} } setHideNoticeUserIds(s); }}>Hide from users</button>
                          <button className="btn btn-sm btn-danger" onClick={() => deleteNotice(n.id)}>Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
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
                              <div style={{ fontSize: 11, color: "#888" }}>{o.buyer?.username ?? "—"} bought {o.quantity}x from {o.product.vendor?.username ?? "—"}</div>
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

        {/* ==================== SUPPORT CHAT ==================== */}
      {tab === "support-chat" && (
        <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 200px)' }}>
          {/* Session list */}
          <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
            <div className="panel" style={{ flex: 1, overflow: 'auto' }}>
              <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Support Tickets</span>
                <button className="btn btn-sm btn-secondary" onClick={() => fetchChatSessions(chatSessionFilter)}>Refresh</button>
              </div>
              <div style={{ padding: '8px 12px', borderBottom: '1px solid #eee' }}>
                <input type="text" placeholder="Search tickets..." value={chatSearch} onChange={e => setChatSearch(e.target.value)} className="input" style={{ marginBottom: 6, fontSize: 12, padding: '6px 8px' }} />
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                  {[{ v: '', l: 'All' }, { v: 'open', l: 'Open' }, { v: 'assigned', l: 'Assigned' }, { v: 'resolved', l: 'Resolved' }, { v: 'closed', l: 'Closed' }].map(f => (
                    <button key={f.v} onClick={() => setChatSessionFilter(f.v)} style={{ padding: '3px 8px', fontSize: 11, borderRadius: 3, border: chatSessionFilter === f.v ? '2px solid #3ea136' : '1px solid #ddd', background: chatSessionFilter === f.v ? '#e8f5e9' : '#fff', cursor: 'pointer', fontWeight: chatSessionFilter === f.v ? 600 : 400 }}>{f.l}</button>
                  ))}
                  <select value={chatSort} onChange={e => setChatSort(e.target.value as 'recent' | 'priority')} style={{ marginLeft: 'auto', padding: '3px 8px', fontSize: 11, borderRadius: 3, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}>
                    <option value="recent">Recent</option>
                    <option value="priority">Priority</option>
                  </select>
                </div>
              </div>
              {(() => {
                const q = chatSearch.trim().toLowerCase();
                const filtered = chatSessions
                  .filter((s: any) => !q || (s.subject || '').toLowerCase().includes(q) || (s.user?.username || '').toLowerCase().includes(q) || (s.user?.name || '').toLowerCase().includes(q))
                  .sort((a: any, b: any) => chatSort === 'priority'
                    ? (PRIORITY_WEIGHT[b.priority] || 0) - (PRIORITY_WEIGHT[a.priority] || 0) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                    : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
                return (
                  <>
                    {chatSessions.length === 0 && <div style={{ padding: 20, color: '#888', fontSize: 12, textAlign: 'center' }}>No tickets</div>}
                    {chatSessions.length > 0 && filtered.length === 0 && <div style={{ padding: 20, color: '#888', fontSize: 12, textAlign: 'center' }}>No matching tickets</div>}
                    {filtered.map((s: any) => (
                      <div key={s.id} onClick={() => openChatSessionAdmin(s.id)} style={{ padding: '10px 12px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', background: activeChatSession?.id === s.id ? '#f0f7ed' : 'transparent' }} onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f9')} onMouseLeave={e => (e.currentTarget.style.background = activeChatSession?.id === s.id ? '#f0f7ed' : 'transparent')}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{s.subject}</span>
                          {s.unreadCount > 0 && <span style={{ background: '#e53e3e', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 10, fontWeight: 600 }}>{s.unreadCount}</span>}
                        </div>
                        <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>@{s.user?.username} · {s.category}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 8, background: s.status === 'open' ? '#e8f5e9' : s.status === 'assigned' ? '#e3f2fd' : '#eee', color: s.status === 'open' ? '#2e7d32' : '#1565c0' }}>{s.status}</span>
                            <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 8, fontWeight: 600, background: s.priority === 'urgent' ? '#fde8e8' : s.priority === 'high' ? '#fff3cd' : s.priority === 'low' ? '#f5f5f5' : '#eee', color: s.priority === 'urgent' ? '#c62828' : s.priority === 'high' ? '#856404' : s.priority === 'low' ? '#999' : '#666' }}>{s.priority}</span>
                            {s.rating ? <span style={{ fontSize: 10, color: '#ff9800', fontWeight: 600 }} title={s.ratingComment ? `Rating comment: ${s.ratingComment}` : ''}>★ {s.rating}/5</span> : null}
                          </div>
                          <span style={{ fontSize: 10, color: '#aaa' }}>{new Date(s.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>
          </div>
          {/* Chat area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {!activeChatSession ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: 13 }}>Select a ticket to view</div>
            ) : (
              <>
                <div className="panel" style={{ marginBottom: 8 }}>
                  <div style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>
                        {activeChatSession.subject}
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 8, marginLeft: 6, background: activeChatSession.priority === 'urgent' ? '#fde8e8' : activeChatSession.priority === 'high' ? '#fff3cd' : activeChatSession.priority === 'low' ? '#f5f5f5' : '#eee', color: activeChatSession.priority === 'urgent' ? '#c62828' : activeChatSession.priority === 'high' ? '#856404' : activeChatSession.priority === 'low' ? '#999' : '#666', fontWeight: 600, verticalAlign: 'middle' }}>{activeChatSession.priority}</span>
                        {activeChatSession.rating ? <span style={{ fontSize: 11, color: '#ff9800', marginLeft: 6 }} title={activeChatSession.ratingComment ? `Rating comment: ${activeChatSession.ratingComment}` : ''}>★ {activeChatSession.rating}/5</span> : null}
                      </div>
                      <div style={{ fontSize: 11, color: '#888' }}>@{activeChatSession.user?.username} · {activeChatSession.category}</div>
                      {activeChatSession.ratingComment && <div style={{ fontSize: 10, color: '#888', fontStyle: 'italic', marginTop: 2 }}>"{activeChatSession.ratingComment}"</div>}
                      {(() => {
                        if (!activeChatSession.relatedType || !activeChatSession.relatedId) return null;
                        const isOrder = activeChatSession.relatedType.toLowerCase().includes('order');
                        const label = isOrder ? `📦 Order #${activeChatSession.relatedId}` : `⚖️ ${activeChatSession.relatedType.charAt(0).toUpperCase() + activeChatSession.relatedType.slice(1)} #${activeChatSession.relatedId}`;
                        return (
                          <button onClick={() => setTab(isOrder ? 'orders' : 'disputes')} style={{ marginTop: 4, padding: '2px 10px', borderRadius: 12, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', background: isOrder ? '#e8f5e9' : '#fde8e8', color: isOrder ? '#2e7d32' : '#c62828' }}>{label}</button>
                        );
                      })()}
                      {(() => {
                        if (!activeChatSession.slaDeadline) return null;
                        const diff = new Date(activeChatSession.slaDeadline).getTime() - Date.now();
                        if (diff <= 0) return <div style={{ fontSize: 11, color: '#c62828', fontWeight: 700, marginTop: 2 }}>⏰ SLA: OVERDUE</div>;
                        const h = Math.floor(diff / 3600000);
                        const m = Math.floor((diff % 3600000) / 60000);
                        return <div style={{ fontSize: 11, color: '#856404', fontWeight: 600, marginTop: 2 }}>⏰ SLA: {h}h {m}m left</div>;
                      })()}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <select onChange={e => { if (e.target.value) assignChatSession(activeChatSession.id, e.target.value); }} style={{ padding: '4px 8px', fontSize: 11, borderRadius: 3, border: '1px solid #ddd' }}>
                        <option value="">Assign to...</option>
                        {moderators.map((m: any) => <option key={m.id} value={m.id}>{m.name || m.username}</option>)}
                      </select>
                      <button className="btn btn-sm" style={{ background: '#17a2b8', color: '#fff', border: 'none', padding: '4px 10px', fontSize: 11, borderRadius: 4 }} disabled={!adminUserId} title={adminUserId ? 'Take this ticket' : 'No admin user loaded'} onClick={async () => { if (adminUserId) { await assignChatSession(activeChatSession.id, adminUserId); openChatSessionAdmin(activeChatSession.id); } }}>Take</button>
                      <button className="btn btn-sm" style={{ background: '#6c757d', color: '#fff', border: 'none', padding: '4px 10px', fontSize: 11, borderRadius: 4 }} onClick={async () => { try { await fetch('/api/chat/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'unassign', sessionId: activeChatSession.id }) }); fetchChatSessions(chatSessionFilter); openChatSessionAdmin(activeChatSession.id); toast('Ticket unassigned', 'success'); } catch { toast('Failed to unassign', 'error'); } }}>Unassign</button>
                      <button className="btn btn-sm" style={{ background: '#7b1fa2', color: '#fff', border: 'none', padding: '4px 10px', fontSize: 11, borderRadius: 4 }} onClick={() => resolveChatSession(activeChatSession.id)}>Resolve</button>
                    </div>
                  </div>
                </div>
                <div className="panel" style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ flex: 1, overflow: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {activeChatMessages.map((m: any) => (
                      <div key={m.id} style={{ display: 'flex', justifyContent: m.isAdmin ? 'flex-start' : 'flex-end' }}>
                        <div style={{ maxWidth: '70%', padding: '8px 12px', borderRadius: 12, background: m.isAdmin ? '#e3f2fd' : '#3ea136', color: m.isAdmin ? '#333' : '#fff', fontSize: 13 }}>
                          <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 2 }}>{m.sender?.name || m.sender?.username} {m.isAdmin ? '(Support)' : '(User)'}</div>
                          <div>{m.message}</div>
                          <div style={{ fontSize: 9, opacity: 0.6, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: m.isAdmin ? 'flex-start' : 'flex-end', gap: 4 }}>
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {!m.isAdmin && (
                              <span style={{ fontSize: 11, fontWeight: 700, color: m.read ? '#1565c0' : 'rgba(0,0,0,0.3)' }}>
                                {m.read ? '\u2713\u2713' : '\u2713'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: '8px 12px', borderTop: '1px solid #eee', display: 'flex', gap: 6 }}>
                    <input type="text" value={chatReplyMsg} onChange={e => setChatReplyMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChatReply()} placeholder="Type a reply..." style={{ flex: 1, padding: '8px 10px', border: '1px solid #ddd', borderRadius: 20, fontSize: 13 }} />
                    <button onClick={sendChatReply} disabled={!chatReplyMsg.trim()} style={{ padding: '8px 16px', background: '#3ea136', color: '#fff', border: 'none', borderRadius: 20, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Send</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ==================== MODERATORS ==================== */}
      {tab === "moderators" && (
        <>
          <div className="panel" style={{ marginBottom: 12 }}>
            <div className="panel-head">Create Moderator</div>
            <div style={{ padding: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
              <div><label className="label">Name</label><input type="text" value={modName} onChange={e => setModName(e.target.value)} className="input" placeholder="John Doe" /></div>
              <div><label className="label">Username</label><input type="text" value={modUsername} onChange={e => setModUsername(e.target.value)} className="input" placeholder="mod_john" /></div>
              <div><label className="label">Email</label><input type="email" value={modEmail} onChange={e => setModEmail(e.target.value)} className="input" placeholder="john@test.com" /></div>
              <div><label className="label">Password</label><input type="text" value={modPassword} onChange={e => setModPassword(e.target.value)} className="input" placeholder="password" /></div>
              <button className="btn btn-primary btn-sm" onClick={createModerator}>Create</button>
            </div>
          </div>
          <div className="panel">
            <div className="panel-head">Moderators ({moderators.length})</div>
            {moderators.length === 0 && <div style={{ padding: 20, color: '#888', fontSize: 12, textAlign: 'center' }}>No moderators yet</div>}
            {moderators.map((m: any) => (
              <div key={m.id} className="row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 80px 80px', gap: 10, alignItems: 'center' }}>
                <div><span style={{ fontWeight: 600 }}>{m.name || m.username}</span></div>
                <div style={{ fontSize: 12, color: '#666' }}>{m.email}</div>
                <div style={{ fontSize: 11, color: '#888' }}>Active: {m.activeSessions || 0} tickets</div>
                <div style={{ fontSize: 11, color: '#aaa' }}>{m.lastLogin ? new Date(m.lastLogin).toLocaleDateString() : 'Never'}</div>
                <button className="btn btn-sm" style={{ background: '#dc3545', color: '#fff', border: 'none' }} onClick={() => removeModerator(m.id)}>Remove</button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ==================== RECYCLE BIN ==================== */}
      {tab === "recycle-bin" && (
        <div className="panel">
          <div className="panel-head">
            <span>Recycle Bin</span>
          </div>
          <div style={{ padding: 12 }}>
            {/* Filter tabs */}
            <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
              {["all", "products", "listings", "coupons", "banners", "announcements"].map(t => (
                <button key={t} onClick={() => setRecycleType(t)} className={`btn btn-sm ${recycleType === t ? "btn-primary" : "btn-secondary"}`}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {loadingRecycle ? (
              <div style={{ color: "#888", fontSize: 12, padding: 20, textAlign: "center" }}>Loading...</div>
            ) : (
              <>
                {Object.entries(recycleBin).map(([type, items]) => (
                  items.length > 0 && (
                    <div key={type} style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#ccc", marginBottom: 8, textTransform: "capitalize" }}>
                        {type} ({items.length})
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {items.map((item: any) => (
                          <div key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#2a2a2a", borderRadius: 6, border: "1px solid #333" }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 500, color: "#eee", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {item.title || item.code || item.name || item.id}
                              </div>
                              <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>
                                Deleted {item.deletedAt ? new Date(item.deletedAt).toLocaleDateString() : ""}
                                {item.listing ? ` • From: ${item.listing.title}` : ""}
                                {item.vendor ? ` • By: ${item.vendor.username}` : ""}
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                              <button onClick={() => handleRecycleAction("restore", type, item.id)} className="btn btn-sm" style={{ background: "#22c55e", color: "#fff", border: "none" }}>Restore</button>
                              <button onClick={() => { if (window.confirm("Permanently delete this item?")) handleRecycleAction("permanent_delete", type, item.id); }} className="btn btn-sm" style={{ background: "#ef4444", color: "#fff", border: "none" }}>Delete</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                ))}
                {Object.values(recycleBin).every((items: any[]) => items.length === 0) && (
                  <div style={{ color: "#888", fontSize: 12, padding: 20, textAlign: "center" }}>Recycle bin is empty</div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ==================== SETTINGS ==================== */}
      {tab === "settings" && (
        <>
          <div className="panel" style={{ marginBottom: 12 }}>
            <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>⚙️ Site Settings</span>
            </div>
            <div style={{ padding: 16 }}>
              <AdminSettingsWidget />
            </div>
          </div>
        </>
      )}

        </div> {/* /content */}
      </div> {/* /wrap */}

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
              <div><label className="label">Reason (optional)</label><input type="text" value={topupReason} onChange={e => setTopupReason(e.target.value)} className="input" placeholder="e.g. compensation, bonus..." /></div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setTopupUser(null)}>Cancel</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={async () => { await doUserAction("topup", topupUser.id, { amount: topupAmount, reason: topupReason }); setTopupUser(null); }}>Add Balance</button>
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
              <div style={{ background: '#f9f9f9', borderRadius: 6, padding: '10px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11 }}>
                <div><span style={{ color: '#888' }}>Platform:</span> <strong>{platformLabel(editProduct.platform)}</strong></div>
                <div><span style={{ color: '#888' }}>Category:</span> <strong>{editProduct.category || '—'}</strong></div>
                <div><span style={{ color: '#888' }}>Accounts:</span> <strong>{((editProduct.accountsData || '').split(/\r?\n/).filter(Boolean).length) || editProduct.stock}</strong></div>
                <div><span style={{ color: '#888' }}>Status:</span> <span className={`badge badge-${editProduct.status}`} style={{ fontSize: 10 }}>{editProduct.status}</span></div>
                <div><span style={{ color: '#888' }}>SKU:</span> <strong>#{(editProduct as any).sku || 'N/A'}</strong></div>
              </div>
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
                    // toggle_block now reads current state server-side
                    await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "toggle_block", userId: vr.userId }) });
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

      {/* Hide Notice Modal */}
      {hideNotice && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setHideNotice(null)}>
          <div style={{ background: "#fff", borderRadius: 6, width: 440, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #eee", fontWeight: 600, fontSize: 15 }}>Hide Notice from Users</div>
            <div style={{ padding: 16 }}>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>Notice: {hideNotice.title}. Select users who should NOT see this notice.</div>
              <div style={{ maxHeight: 260, overflowY: "auto", border: "1px solid #eee", borderRadius: 4, marginBottom: 12 }}>
                {users.map(u => (
                  <label key={u.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", cursor: "pointer", borderBottom: "1px solid #f5f5f5" }}>
                    <input type="checkbox" checked={hideNoticeUserIds.has(u.id)} onChange={e => { const s = new Set(hideNoticeUserIds); if (e.target.checked) s.add(u.id); else s.delete(u.id); setHideNoticeUserIds(s); }} />
                    <span style={{ fontSize: 12 }}>{u.name || u.username} <span style={{ color: "#888" }}>({u.email})</span></span>
                  </label>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setHideNotice(null)}>Cancel</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveHideUsers}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Product Accounts Modal */}
      {previewProduct && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setPreviewProduct(null)}>
          <div style={{ background: "#fff", borderRadius: 6, width: 560, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #eee", fontWeight: 600, fontSize: 15 }}>Preview Accounts: {previewProduct.title}</div>
            <div style={{ padding: 16 }}>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>Vendor: @{previewProduct.vendor?.username} · {money(previewProduct.storePrice)}/ea</div>
              {previewProduct.accountsData ? (
                <>
                  <pre style={{ fontSize: 11, background: "#111", color: "#3ea136", padding: 10, borderRadius: 4, maxHeight: 360, overflow: "auto", fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{previewProduct.accountsData.split(/\r?\n/).filter(Boolean).slice(0, 10).join('\n')}</pre>
                  <div style={{ fontSize: 11, color: "#888", marginTop: 6 }}>Showing first 10 of {previewProduct.accountsData.split(/\r?\n/).filter(Boolean).length}</div>
                </>
              ) : (
                <div style={{ padding: 20, color: "#888", fontSize: 12, textAlign: "center" }}>No accounts uploaded.</div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setPreviewProduct(null)}>Close</button>
                {previewProduct.status === 'pending' && <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { doProductAction('approve', previewProduct.id); setPreviewProduct(null); }}>Approve</button>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject All Pending Products Modal */}
      {rejectAllOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setRejectAllOpen(false)}>
          <div style={{ background: "#fff", borderRadius: 6, width: 420, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #eee", fontWeight: 600, color: "#e53e3e" }}>Reject All Pending Products</div>
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 12, color: "#888" }}>{products.filter(p => p.status === "pending").length} pending products will be rejected. The vendors will be notified with this reason.</div>
              <div><label className="label">Reason for rejection</label><textarea value={rejectAllReason} onChange={e => setRejectAllReason(e.target.value)} className="input" rows={3} required placeholder="Explain why these listings were rejected..." /></div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setRejectAllOpen(false)}>Cancel</button>
                <button className="btn btn-danger" style={{ flex: 1 }} disabled={!rejectAllReason.trim()} onClick={async () => {
                  const ids = products.filter(p => p.status === "pending").map(p => p.id);
                  if (!ids.length) { setRejectAllOpen(false); return; }
                  try {
                    const res = await fetch('/api/admin/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'batch_reject', ids, reason: rejectAllReason }) });
                    const r = await res.json();
                    if (r.success) { toast(`${r.count} products rejected`, 'success'); setRejectAllOpen(false); setRejectAllReason(''); setPendingQueueSelected(new Set()); loadAll(); }
                    else toast(r.error || 'Failed to reject', 'error');
                  } catch { toast('Failed to reject', 'error'); }
                }}>Reject All</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Accounts Modal */}
      {viewAccountsProduct && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setViewAccountsProduct(null)}>
          <div style={{ background: "#fff", borderRadius: 6, width: 560, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #eee", fontWeight: 600, fontSize: 15 }}>Accounts: {viewAccountsProduct.title}</div>
            <div style={{ padding: 16 }}>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>Vendor: @{viewAccountsProduct.vendor?.username} · {viewAccountsProduct.stock || 0} accounts</div>
              {viewAccountsProduct.accountsData ? (
                <pre style={{ fontSize: 11, background: "#111", color: "#3ea136", padding: 10, borderRadius: 4, maxHeight: 360, overflow: "auto", fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{viewAccountsProduct.accountsData}</pre>
              ) : (
                <div style={{ padding: 20, color: "#888", fontSize: 12, textAlign: "center" }}>No accounts uploaded yet</div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setViewAccountsProduct(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );


}