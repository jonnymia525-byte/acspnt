"use client";

import { useState, useEffect, useCallback } from "react";

const DEFAULT_SETTINGS: Record<string, string> = {
  site_name: "AccsPoint", site_description: "", promotion_notice: "",
  support_email: "", support_telegram: "", min_deposit: "5",
  maintenance_mode: "false", registration_enabled: "true", vendor_auto_approve: "false",
  order_warranty_hours: "48", max_upload_size_mb: "5", footer_text: "",
  primary_color: "#3ea136", currency_symbol: "$", default_language: "en",
  platform_commission_pct: "15", vendor_payout_threshold: "50", vendor_payout_schedule: "weekly",
  rate_limit_purchase_per_hour: "10", rate_limit_deposit_per_day: "20", rate_limit_signup_per_ip: "5",
  seo_title: "", seo_description: "", seo_og_image: "",
  referral_bonus_amount: "1", referral_enabled: "true",
};

const SOCIAL_PLATFORMS = [
  { key: "social_twitter", label: "Twitter / X", icon: "𝕏", placeholder: "https://x.com/accspoint" },
  { key: "social_telegram", label: "Telegram", icon: "✈️", placeholder: "https://t.me/accspoint" },
  { key: "social_discord", label: "Discord", icon: "💬", placeholder: "https://discord.gg/accspoint" },
  { key: "social_facebook", label: "Facebook", icon: "📘", placeholder: "https://facebook.com/accspoint" },
  { key: "social_instagram", label: "Instagram", icon: "📷", placeholder: "https://instagram.com/accspoint" },
  { key: "social_youtube", label: "YouTube", icon: "🎬", placeholder: "https://youtube.com/@accspoint" },
  { key: "social_tiktok", label: "TikTok", icon: "🎵", placeholder: "https://tiktok.com/@accspoint" },
  { key: "social_reddit", label: "Reddit", icon: "🤖", placeholder: "https://reddit.com/r/accspoint" },
];

interface PageContent {
  title: string;
  items?: { q?: string; a?: string; t?: string; d?: string }[];
  content?: string;
}

export function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, string>>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState<string>("general");

  // Social
  const [socials, setSocials] = useState<Record<string, string>>({});

  // Page content
  const [pageContent, setPageContent] = useState<Record<string, PageContent | null>>({});
  const [editingPage, setEditingPage] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<PageContent | null>(null);

  // Wallets
  const [wallets, setWallets] = useState<Record<string, string>>({});

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, pagesRes] = await Promise.all([
        fetch("/api/admin/settings").then(r => r.json()),
        fetch("/api/admin/page-content").then(r => r.json()),
      ]);
      if (settingsRes.settings) {
        setSettings((s: Record<string, string>) => ({ ...s, ...settingsRes.settings }));
        // Extract socials
        const socs: Record<string, string> = {};
        const wals: Record<string, string> = {};
        for (const [k, v] of Object.entries(settingsRes.settings)) {
          if (k.startsWith("social_")) socs[k] = v as string;
          if (k.startsWith("wallet_")) wals[k] = v as string;
        }
        setSocials(socs);
        setWallets(wals);
      }
      if (pagesRes.pages) setPageContent(pagesRes.pages);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const allSettings = { ...settings, ...socials, ...wallets };
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: allSettings }),
      });
      const r = await res.json();
      if (r.success) alert("Settings saved!"); else alert(r.error || "Failed");
    } catch { alert("Failed to save"); }
    setSaving(false);
  };

  const savePageContent = async (page: string, content: PageContent) => {
    try {
      const res = await fetch("/api/admin/page-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page, content }),
      });
      const r = await res.json();
      if (r.success) {
        setPageContent(prev => ({ ...prev, [page]: content }));
        setEditingPage(null);
        alert(`${page} page saved!`);
      } else alert(r.error || "Failed");
    } catch { alert("Failed"); }
  };

  const toggleSetting = (key: string) => setSettings(s => ({ ...s, [key]: s[key] === "true" ? "false" : "true" }));

  const sections = [
    { key: "general", label: "🏢", name: "General" },
    { key: "appearance", label: "🎨", name: "Design" },
    { key: "social", label: "📱", name: "Social" },
    { key: "wallets", label: "💳", name: "Wallets" },
    { key: "orders", label: "📦", name: "Orders" },
    { key: "support", label: "💬", name: "Support" },
    { key: "seo", label: "🔍", name: "SEO" },
    { key: "referral", label: "🔗", name: "Referral" },
    { key: "pages", label: "📄", name: "Pages" },
    { key: "toggles", label: "🔧", name: "Toggles" },
  ];

  const s = (key: string) => settings[key] || DEFAULT_SETTINGS[key] || "";
  const update = (key: string, val: string) => setSettings(prev => ({ ...prev, [key]: val }));

  if (loading) return <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: "#888" }}>Loading settings...</div>;

  return (
    <div>
      {/* Section Nav - scrollable on mobile */}
      <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 12, marginBottom: 12, borderBottom: "1px solid #eee", WebkitOverflowScrolling: "touch" }}>
        {sections.map(sec => (
          <button key={sec.key} onClick={() => setSection(sec.key)} style={{
            padding: "6px 12px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
            background: section === sec.key ? "#3ea136" : "#f0f0f0",
            color: section === sec.key ? "#fff" : "#666",
            flexShrink: 0,
          }}>
            {sec.label} {sec.name}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* GENERAL */}
        {section === "general" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>🏢 General</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>Site Name</label><input style={inputStyle} value={s("site_name")} onChange={e => update("site_name", e.target.value)} /></div>
              <div><label style={labelStyle}>Site Description</label><input style={inputStyle} value={s("site_description")} onChange={e => update("site_description", e.target.value)} /></div>
            </div>
            <div><label style={labelStyle}>Promotion / Notice Bar</label><textarea style={{ ...inputStyle, minHeight: 60 }} rows={2} value={s("promotion_notice")} onChange={e => update("promotion_notice", e.target.value)} placeholder="HTML supported. Use accspoint.news for link placeholder." /></div>
            <div><label style={labelStyle}>Footer Text</label><input style={inputStyle} value={s("footer_text")} onChange={e => update("footer_text", e.target.value)} /></div>
          </div>
        )}

        {/* APPEARANCE */}
        {section === "appearance" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>🎨 Appearance</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>Primary Color</label>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input type="color" value={s("primary_color")} onChange={e => update("primary_color", e.target.value)} style={{ width: 40, height: 34, border: "1px solid #ddd", borderRadius: 4, cursor: "pointer" }} />
                  <input style={{ ...inputStyle, flex: 1 }} value={s("primary_color")} onChange={e => update("primary_color", e.target.value)} />
                </div>
              </div>
              <div><label style={labelStyle}>Currency Symbol</label><input style={inputStyle} value={s("currency_symbol")} onChange={e => update("currency_symbol", e.target.value)} /></div>
              <div><label style={labelStyle}>Language</label>
                <select style={inputStyle} value={s("default_language")} onChange={e => update("default_language", e.target.value)}>
                  <option value="en">English</option><option value="ru">Russian</option><option value="es">Spanish</option><option value="pt">Portuguese</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* SOCIAL MEDIA */}
        {section === "social" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>📱 Social Media Links</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>
              {SOCIAL_PLATFORMS.map(p => (
                <div key={p.key} style={{ display: "flex", alignItems: "center", gap: 8, background: "#fafafa", borderRadius: 6, padding: 8, border: "1px solid #eee" }}>
                  <span style={{ fontSize: 18, flexShrink: 0, width: 28, textAlign: "center" }}>{p.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>{p.label}</div>
                    <input style={{ ...inputStyle, fontSize: 11, padding: "6px 8px" }} placeholder={p.placeholder} value={socials[p.key] || ""} onChange={e => setSocials(prev => ({ ...prev, [p.key]: e.target.value }))} />
                  </div>
                  {socials[p.key] && <button onClick={() => setSocials(prev => { const n = { ...prev }; delete n[p.key]; return n; })} style={{ background: "none", border: "none", color: "#e53e3e", cursor: "pointer", fontSize: 14 }}>✕</button>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* WALLETS */}
        {section === "wallets" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>💳 USDT Wallet Addresses</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { key: "wallet_trc20", label: "TRC20 (TRON)", color: "#FF0013", icon: "T" },
                { key: "wallet_bep20", label: "BEP20 (BNB Smart Chain)", color: "#F3BA2F", icon: "B" },
                { key: "wallet_erc20", label: "ERC20 (Ethereum)", color: "#627EEA", icon: "E" },
              ].map(w => (
                <div key={w.key} style={{ display: "flex", alignItems: "center", gap: 8, background: "#fafafa", borderRadius: 6, padding: 8, border: "1px solid #eee" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 16, background: w.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{w.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>{w.label}</div>
                    <input style={{ ...inputStyle, fontFamily: "monospace", fontSize: 11, padding: "6px 8px" }} placeholder={`Enter ${w.label} USDT wallet address...`} value={wallets[w.key] || ""} onChange={e => setWallets(prev => ({ ...prev, [w.key]: e.target.value }))} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 10, color: "#aaa" }}>⚠️ Double-check addresses before saving. Shown to users during deposits.</div>
          </div>
        )}

        {/* ORDERS */}
        {section === "orders" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>📦 Orders & Commission</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>Commission %</label><input type="number" min="0" max="50" style={inputStyle} value={s("platform_commission_pct")} onChange={e => update("platform_commission_pct", e.target.value)} /><div style={hintStyle}>Platform fee on each sale</div></div>
              <div><label style={labelStyle}>Warranty (hours)</label><input type="number" style={inputStyle} value={s("order_warranty_hours")} onChange={e => update("order_warranty_hours", e.target.value)} /><div style={hintStyle}>Shown on product tags</div></div>
              <div><label style={labelStyle}>Min Deposit ($)</label><input type="number" step="0.01" style={inputStyle} value={s("min_deposit")} onChange={e => update("min_deposit", e.target.value)} /></div>
              <div><label style={labelStyle}>Max Upload (MB)</label><input type="number" style={inputStyle} value={s("max_upload_size_mb")} onChange={e => update("max_upload_size_mb", e.target.value)} /></div>
              <div><label style={labelStyle}>Payout Threshold ($)</label><input type="number" style={inputStyle} value={s("vendor_payout_threshold")} onChange={e => update("vendor_payout_threshold", e.target.value)} /><div style={hintStyle}>Min vendor balance to withdraw</div></div>
              <div><label style={labelStyle}>Payout Schedule</label>
                <select style={inputStyle} value={s("vendor_payout_schedule")} onChange={e => update("vendor_payout_schedule", e.target.value)}>
                  <option value="weekly">Weekly</option><option value="biweekly">Bi-weekly</option><option value="monthly">Monthly</option><option value="manual">Manual</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* SUPPORT */}
        {section === "support" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>💬 Support Contact</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>Support Email</label><input type="email" style={inputStyle} value={s("support_email")} onChange={e => update("support_email", e.target.value)} /></div>
              <div><label style={labelStyle}>Buyer Support Telegram</label><input style={inputStyle} value={s("support_telegram")} onChange={e => update("support_telegram", e.target.value)} placeholder="@buyer_support" /><div style={hintStyle}>Telegram link for buyer support</div></div>
              <div><label style={labelStyle}>Seller Support Telegram</label><input style={inputStyle} value={s("seller_support_telegram") || ""} onChange={e => update("seller_support_telegram", e.target.value)} placeholder="@seller_support" /><div style={hintStyle}>Separate Telegram link for seller/supplier support</div></div>
            </div>
          </div>
        )}

        {/* SEO */}
        {section === "seo" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>🔍 SEO Settings</h3>
            <div><label style={labelStyle}>Meta Title</label><input style={inputStyle} value={s("seo_title")} onChange={e => update("seo_title", e.target.value)} placeholder="AccsPoint - Premium Accounts Marketplace" /></div>
            <div><label style={labelStyle}>Meta Description</label><textarea style={{ ...inputStyle, minHeight: 60 }} rows={2} value={s("seo_description")} onChange={e => update("seo_description", e.target.value)} placeholder="Buy and sell premium social media, streaming, and email accounts" /></div>
            <div><label style={labelStyle}>OG Image URL</label><input style={inputStyle} value={s("seo_og_image")} onChange={e => update("seo_og_image", e.target.value)} placeholder="https://..." /></div>
          </div>
        )}

        {/* REFERRAL */}
        {section === "referral" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>🔗 Referral Program</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>Bonus Amount ($)</label><input type="number" step="0.01" style={inputStyle} value={s("referral_bonus_amount")} onChange={e => update("referral_bonus_amount", e.target.value)} /><div style={hintStyle}>Given to referrer per signup</div></div>
              <div><label style={labelStyle}>Rate Limit: Purchases/Hour</label><input type="number" style={inputStyle} value={s("rate_limit_purchase_per_hour")} onChange={e => update("rate_limit_purchase_per_hour", e.target.value)} /></div>
              <div><label style={labelStyle}>Rate Limit: Deposits/Day</label><input type="number" style={inputStyle} value={s("rate_limit_deposit_per_day")} onChange={e => update("rate_limit_deposit_per_day", e.target.value)} /></div>
              <div><label style={labelStyle}>Rate Limit: Signups/IP</label><input type="number" style={inputStyle} value={s("rate_limit_signup_per_ip")} onChange={e => update("rate_limit_signup_per_ip", e.target.value)} /></div>
            </div>
          </div>
        )}

        {/* PAGES - Content Editor */}
        {section === "pages" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>📄 Page Content Editor</h3>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>Edit FAQ, Terms of Use, and other public pages. Changes appear immediately on the site.</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
              {[
                { key: "faq", label: "❓ FAQ Page", desc: "Frequently asked questions" },
                { key: "terms", label: "📜 Terms of Use", desc: "Marketplace rules" },
                { key: "seller_terms", label: "🏪 Seller Terms", desc: "Vendor conditions" },
                { key: "about", label: "ℹ️ About Page", desc: "About AccsPoint" },
              ].map(p => (
                <button key={p.key} onClick={() => {
                  const content = pageContent[p.key] || { title: p.label, items: [] };
                  setEditingPage(p.key);
                  setEditingContent(JSON.parse(JSON.stringify(content)));
                }} style={{ padding: 14, borderRadius: 8, border: "2px solid #eee", background: "#fff", cursor: "pointer", textAlign: "left" }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{p.label}</div>
                  <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>{p.desc}</div>
                </button>
              ))}
            </div>

            {/* Page Content Editor Modal */}
            {editingPage && editingContent && (
              <div style={{ background: "#f9f9f9", borderRadius: 8, padding: 16, border: "1px solid #ddd" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h4 style={{ margin: 0, fontSize: 14 }}>Editing: {editingContent.title || editingPage}</h4>
                  <button onClick={() => { setEditingPage(null); setEditingContent(null); }} style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer" }}>✕</button>
                </div>

                {editingPage === "about" ? (
                  <div>
                    <label style={labelStyle}>Page Title</label>
                    <input style={inputStyle} value={editingContent.title || ""} onChange={e => setEditingContent(c => c ? { ...c, title: e.target.value } : null)} />
                    <label style={{ ...labelStyle, marginTop: 8 }}>Content</label>
                    <textarea style={{ ...inputStyle, minHeight: 100 }} rows={5} value={editingContent.content || ""} onChange={e => setEditingContent(c => c ? { ...c, content: e.target.value } : null)} />
                  </div>
                ) : (
                  <div>
                    <label style={labelStyle}>Page Title</label>
                    <input style={inputStyle} value={editingContent.title || ""} onChange={e => setEditingContent(c => c ? { ...c, title: e.target.value } : null)} />

                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <label style={{ ...labelStyle, margin: 0 }}>Items ({editingContent.items?.length || 0})</label>
                        <button onClick={() => setEditingContent(c => c ? { ...c, items: [...(c.items || []), editingPage === "faq" ? { q: "", a: "" } : { t: "", d: "" }] } : null)} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid #3ea136", background: "#fff", color: "#3ea136", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>+ Add Item</button>
                      </div>

                      {(editingContent.items || []).map((item, idx) => (
                        <div key={idx} style={{ background: "#fff", borderRadius: 6, padding: 10, marginBottom: 8, border: "1px solid #e0e0e0" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <span style={{ fontSize: 11, color: "#888" }}>#{idx + 1}</span>
                            <button onClick={() => setEditingContent(c => c ? { ...c, items: c.items?.filter((_, i) => i !== idx) } : null)} style={{ background: "none", border: "none", color: "#e53e3e", cursor: "pointer", fontSize: 12 }}>🗑️ Remove</button>
                          </div>
                          {editingPage === "faq" ? (
                            <>
                              <input style={{ ...inputStyle, marginBottom: 6, fontSize: 12 }} placeholder="Question" value={item.q || ""} onChange={e => {
                                const items = [...(editingContent.items || [])];
                                items[idx] = { ...items[idx], q: e.target.value };
                                setEditingContent(c => c ? { ...c, items } : null);
                              }} />
                              <textarea style={{ ...inputStyle, fontSize: 12, minHeight: 50 }} rows={2} placeholder="Answer" value={item.a || ""} onChange={e => {
                                const items = [...(editingContent.items || [])];
                                items[idx] = { ...items[idx], a: e.target.value };
                                setEditingContent(c => c ? { ...c, items } : null);
                              }} />
                            </>
                          ) : (
                            <>
                              <input style={{ ...inputStyle, marginBottom: 6, fontSize: 12 }} placeholder="Title" value={item.t || ""} onChange={e => {
                                const items = [...(editingContent.items || [])];
                                items[idx] = { ...items[idx], t: e.target.value };
                                setEditingContent(c => c ? { ...c, items } : null);
                              }} />
                              <textarea style={{ ...inputStyle, fontSize: 12, minHeight: 50 }} rows={2} placeholder="Description" value={item.d || ""} onChange={e => {
                                const items = [...(editingContent.items || [])];
                                items[idx] = { ...items[idx], d: e.target.value };
                                setEditingContent(c => c ? { ...c, items } : null);
                              }} />
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button onClick={() => { setEditingPage(null); setEditingContent(null); }} style={{ flex: 1, padding: "8px 0", borderRadius: 6, border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: 12 }}>Cancel</button>
                  <button onClick={() => editingPage && editingContent && savePageContent(editingPage, editingContent)} style={{ flex: 2, padding: "8px 0", borderRadius: 6, border: "none", background: "#3ea136", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>💾 Save {editingContent.title}</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TOGGLES */}
        {section === "toggles" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>🔧 Toggles</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
              {[
                { key: "maintenance_mode", label: "Maintenance Mode", desc: "Show maintenance page to all non-admin users" },
                { key: "registration_enabled", label: "Registration Enabled", desc: "Allow new user signups" },
                { key: "vendor_auto_approve", label: "Auto-Approve Vendors", desc: "Skip manual vendor review" },
                { key: "referral_enabled", label: "Referral Program", desc: "Allow referral codes and bonuses" },
              ].map(toggle => (                  <div key={toggle.key} onClick={() => toggleSetting(toggle.key)} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: 12, borderRadius: 8,
                  border: `2px solid ${s(toggle.key) === "true" ? "#3ea136" : "#e0e0e0"}`,
                  background: s(toggle.key) === "true" ? "#f0faf0" : "#fff", cursor: "pointer",
                  transition: "all 0.15s",
                }}>
                  <div style={{ width: 40, height: 22, borderRadius: 11, background: s(toggle.key) === "true" ? "#3ea136" : "#ccc", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                    <div style={{ width: 18, height: 18, borderRadius: 9, background: "#fff", position: "absolute", top: 2, left: s(toggle.key) === "true" ? 20 : 2, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{toggle.label}</div>
                    <div style={{ fontSize: 10, color: "#888" }}>{toggle.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div style={{ marginTop: 20, padding: "12px 0", borderTop: "2px solid #eee", display: "flex", gap: 8 }}>
        <button onClick={saveSettings} disabled={saving} style={{
          flex: 1, padding: "12px 0", borderRadius: 8, border: "none", background: "#3ea136", color: "#fff",
          fontSize: 14, fontWeight: 700, cursor: "pointer",
        }}>{saving ? "Saving..." : "💾 Save All Settings"}</button>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, marginBottom: 4, color: "#555" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 12, outline: "none", boxSizing: "border-box" };
const hintStyle: React.CSSProperties = { fontSize: 10, color: "#aaa", marginTop: 2 };
