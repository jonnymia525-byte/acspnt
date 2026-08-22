"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useStore } from "@/store";

interface TicketReply {
  id: string;
  username: string;
  name: string;
  role: string;
}

interface Ticket {
  id: string;
  subject: string;
  category: string;
  priority: string;
  message: string;
  status: string;
  reply: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  createdAt: string;
  repliedBy: TicketReply | null;
}

export function SupportPage() {
  const { user } = useStore();
  const [sent, setSent] = useState(false);
  const [cat, setCat] = useState("general");
  const [priority, setPriority] = useState("normal");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Ticket list
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTickets = async () => {
    if (!user) return;
    setLoadingTickets(true);
    try {
      const res = await fetch("/api/support/tickets");
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch {}
    setLoadingTickets(false);
  };

  useEffect(() => {
    fetchTickets();
  }, [user]);

  const fileToBase64 = (f: File): Promise<{ data: string; name: string }> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          data: reader.result as string,
          name: f.name,
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSubmitting(true);

    let attachmentUrl = null;
    let attachmentName = null;

    if (file) {
      try {
        const { data, name } = await fileToBase64(file);
        attachmentUrl = data;
        attachmentName = name;
      } catch {}
    }

    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          category: cat,
          priority,
          message,
          attachmentUrl,
          attachmentName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSent(true);
        fetchTickets();
      } else {
        alert(data.error || "Failed to submit ticket");
      }
    } catch {
      alert("Failed to submit ticket");
    }
    setSubmitting(false);
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "open": return "#3ea136";
      case "replied": return "#1976d2";
      case "closed": return "#888";
      default: return "#888";
    }
  };

  const priorityColor = (p: string) => {
    switch (p) {
      case "urgent": return "#e53e3e";
      case "high": return "#ff9800";
      case "normal": return "#3ea136";
      case "low": return "#888";
      default: return "#888";
    }
  };

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
        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="panel-head">Submit Ticket</div>
          {sent ? (
            <div style={{ padding: 32, textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>✅ Ticket Submitted</div>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>We will respond within 24 hours.</div>
              <button className="btn btn-primary" onClick={() => { setSent(false); setSubject(""); setMessage(""); setFile(null); }}>Submit Another</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
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

              {/* File Attachment */}
              <div>
                <label className="label">Attachment (optional)</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.txt,.pdf,.doc,.docx,.csv,.json"
                    style={{ display: "none" }}
                    onChange={e => {
                      const f = e.target.files?.[0] || null;
                      if (f && f.size > 5 * 1024 * 1024) {
                        alert("File must be under 5MB");
                        return;
                      }
                      setFile(f);
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ fontSize: 12 }}
                  >
                    📎 Choose File
                  </button>
                  {file && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                      <span style={{ color: "#333" }}>{file.name}</span>
                      <span style={{ color: "#888" }}>({(file.size / 1024).toFixed(1)} KB)</span>
                      <button
                        type="button"
                        onClick={() => setFile(null)}
                        style={{ background: "none", border: "none", color: "#e53e3e", cursor: "pointer", fontSize: 14, padding: 0 }}
                      >✕</button>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 10, color: "#aaa", marginTop: 4 }}>Max 5MB. Images, text, PDF, or CSV files.</div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </form>
          )}
        </div>

        {/* My Tickets List */}
        {user && (
          <div className="panel">
            <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>My Tickets ({tickets.length})</span>
              <button
                className="btn btn-secondary"
                style={{ fontSize: 11, padding: "3px 8px" }}
                onClick={fetchTickets}
              >
                ↻ Refresh
              </button>
            </div>
            {loadingTickets ? (
              <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: "#888" }}>Loading tickets...</div>
            ) : tickets.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: "#888" }}>
                No tickets yet. Submit one above!
              </div>
            ) : (
              tickets.map(ticket => (
                <div
                  key={ticket.id}
                  style={{
                    borderBottom: "1px solid #eee",
                    padding: "12px 16px",
                    cursor: "pointer",
                    background: expandedTicket === ticket.id ? "#f9f9f9" : "#fff",
                  }}
                  onClick={() => setExpandedTicket(expandedTicket === ticket.id ? null : ticket.id)}
                >
                  {/* Ticket header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", flex: 1, minWidth: 0 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 3,
                        background: statusColor(ticket.status), color: "#fff", textTransform: "uppercase", flexShrink: 0,
                      }}>
                        {ticket.status}
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 3,
                        border: `1px solid ${priorityColor(ticket.priority)}`, color: priorityColor(ticket.priority), flexShrink: 0,
                      }}>
                        {ticket.priority}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ticket.subject}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 10, color: "#aaa" }}>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                      {ticket.reply && (
                        <span style={{ fontSize: 10, color: "#1976d2", fontWeight: 700 }}>💬 Replied</span>
                      )}
                      <span style={{ fontSize: 12, color: "#888" }}>{expandedTicket === ticket.id ? "▲" : "▼"}</span>
                    </div>
                  </div>

                  {/* Expanded ticket detail */}
                  {expandedTicket === ticket.id && (
                    <div style={{ marginTop: 12, borderTop: "1px solid #eee", paddingTop: 12 }}>
                      {/* User message */}
                      <div style={{ background: "#f5f5f5", borderRadius: 6, padding: 12, marginBottom: 8 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#888", marginBottom: 4, textTransform: "uppercase" }}>
                          Your Message
                        </div>
                        <div style={{ fontSize: 13, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{ticket.message}</div>
                        {ticket.attachmentUrl && ticket.attachmentName && (
                          <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #e0e0e0" }}>
                            <div style={{ fontSize: 10, color: "#888", marginBottom: 4 }}>📎 Attachment:</div>
                            {ticket.attachmentUrl.startsWith("data:image") ? (
                              <a href={ticket.attachmentUrl} target="_blank" rel="noopener noreferrer">
                                <img
                                  src={ticket.attachmentUrl}
                                  alt={ticket.attachmentName}
                                  style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 4, border: "1px solid #ddd" }}
                                />
                              </a>
                            ) : (
                              <a
                                href={ticket.attachmentUrl}
                                download={ticket.attachmentName}
                                style={{ fontSize: 12, color: "#1976d2", textDecoration: "underline" }}
                              >
                                📄 {ticket.attachmentName}
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Admin reply — shown in bold */}
                      {ticket.reply && (
                        <div style={{
                          background: "#e8f5e9", borderRadius: 6, padding: 12,
                          borderLeft: "4px solid #3ea136",
                        }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#3ea136", marginBottom: 4, textTransform: "uppercase" }}>
                            👨‍💼 Admin Reply{ticket.repliedBy ? ` — ${ticket.repliedBy.name || ticket.repliedBy.username}` : ""}
                          </div>
                          <div style={{
                            fontSize: 13,
                            fontWeight: 700,
                            whiteSpace: "pre-wrap",
                            lineHeight: 1.5,
                            color: "#1a1a1a",
                          }}>
                            {ticket.reply}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
