"use client";

import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { useStore } from "@/store";
import { ChatFaqAccordion } from "./chat-widget";

interface ChatSession {
  id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
  assignee?: { username: string; name: string } | null;
  _count?: { messages: number };
  unreadCount?: number;
  typingAt?: string | null;
  rating?: number | null;
}
interface ChatMessage {
  id: string;
  message: string;
  isAdmin: boolean;
  read: boolean;
  createdAt: string;
  attachment?: string | null;
  sender: { id: string; username: string; name: string; role: string };
}
interface CannedResponse {
  id: string;
  title: string;
  content: string;
}

export function ChatSupport() {
  const { user } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<"list" | "chat" | "new">("list");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [newPriority, setNewPriority] = useState("normal");
  const [newRelatedType, setNewRelatedType] = useState("None");
  const [newRelatedId, setNewRelatedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [otherTyping, setOtherTyping] = useState(false);
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);
  const [showCanned, setShowCanned] = useState(false);
  const [attachment, setAttachment] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastTypingSent = useRef(0);

  const isStaff = user?.role === "admin" || user?.role === "moderator";
  const isImage = (a: string) => a.startsWith("data:image/");

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/chat");
      const d = await res.json();
      const list = (d.sessions || []) as ChatSession[];
      setSessions(list);
      setActiveSession(prev => {
        if (!prev) return prev;
        const fresh = list.find(s => s.id === prev.id);
        return fresh ? { ...prev, ...fresh } : prev;
      });
    } catch {}
  };

  const fetchMessages = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/chat?sessionId=${sessionId}`);
      const d = await res.json();
      setMessages(d.messages || []);
      setTimeout(() => messagesEnd.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch {}
  };

  useEffect(() => {
    if (isOpen && user) fetchSessions();
  }, [isOpen, user]);

  // Smart polling: 10s when tab active, pause when hidden, re-fetch on focus
  useEffect(() => {
    if (!user) return;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const ACTIVE_MS = 10000;

    const checkUnread = () => {
      fetch("/api/chat").then(r => r.json()).then(d => {
        const list = (d.sessions || []) as ChatSession[];
        let unread = 0;
        for (const s of list) {
          unread += s.unreadCount || 0;
        }
        setUnreadCount(unread);
        setSessions(list);
        setActiveSession(prev => {
          if (!prev) return prev;
          const fresh = list.find(s => s.id === prev.id);
          return fresh ? { ...prev, ...fresh } : prev;
        });
      }).catch(() => {});
    };

    const startPolling = () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(checkUnread, ACTIVE_MS);
    };

    const stopPolling = () => {
      if (intervalId) { clearInterval(intervalId); intervalId = null; }
    };

    // Initial fetch
    checkUnread();
    startPolling();

    // Pause when tab hidden, resume when visible
    const onVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        checkUnread(); // immediate re-fetch on focus
        startPolling();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [user]);

  useEffect(() => {
    if (!activeSession) return;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const MSG_POLL_MS = 5000;

    fetchMessages(activeSession.id);
    const start = () => { intervalId = setInterval(() => fetchMessages(activeSession.id), MSG_POLL_MS); };
    const stop = () => { if (intervalId) { clearInterval(intervalId); intervalId = null; } };
    start();

    const onVis = () => {
      if (document.hidden) stop();
      else { fetchMessages(activeSession.id); start(); }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => { stop(); document.removeEventListener("visibilitychange", onVis); };
  }, [activeSession?.id]);

  // Canned responses for staff
  useEffect(() => {
    if (user && (user.role === "admin" || user.role === "moderator")) {
      fetch("/api/canned-responses").then(r => r.json()).then(d => {
        setCannedResponses(d.responses || []);
      }).catch(() => {});
    }
  }, [user]);

  // Typing indicator: throttled send (max once per 3s) + re-check every 3s
  const sendTyping = () => {
    if (!activeSession) return;
    const now = Date.now();
    if (now - lastTypingSent.current < 3000) return;
    lastTypingSent.current = now;
    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "typing", sessionId: activeSession.id }),
    }).catch(() => {});
  };

  useEffect(() => {
    if (!activeSession) return;
    const checkTyping = async () => {
      try {
        const res = await fetch("/api/chat");
        const d = await res.json();
        const list = d.sessions || [];
        setSessions(list);
        const s = list.find((x: ChatSession) => x.id === activeSession.id);
        if (s) {
          setActiveSession(prev => (prev ? { ...prev, typingAt: s.typingAt, status: s.status, rating: s.rating } : prev));
        }
        if (!s || !s.typingAt) { setOtherTyping(false); return; }
        const t = new Date(s.typingAt).getTime();
        const now = Date.now();
        setOtherTyping(t > now - 4000 && t > lastTypingSent.current + 1000);
      } catch { setOtherTyping(false); }
    };
    checkTyping();
    const iv = setInterval(checkTyping, 3000);
    return () => clearInterval(iv);
  }, [activeSession?.id]);

  const openSession = (session: ChatSession) => {
    setActiveSession(session);
    setView("chat");
    setRating(0);
    setRatingComment("");
    setRatingSubmitted(false);
    setAttachment(null);
    // Refresh sessions after opening so unread count updates
    // (server marks messages as read when fetching them)
    setTimeout(() => fetchSessions(), 1000);
  };

  const sendMessage = async () => {
    if ((!newMsg.trim() && !attachment) || !activeSession) return;
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_message", sessionId: activeSession.id, message: newMsg, attachment }),
      });
      const d = await res.json();
      if (d.success) {
        setNewMsg("");
        setAttachment(null);
        fetchMessages(activeSession.id);
        fetchSessions();
      }
    } catch {}
    setLoading(false);
  };

  const createSession = async () => {
    if (!newSubject.trim() || !newMsg.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_session", subject: newSubject, category: newCategory, priority: newPriority, message: newMsg,
          relatedType: newRelatedType === "None" ? "other" : newRelatedType.toLowerCase(),
          relatedId: newRelatedType === "None" ? null : newRelatedId,
        }),
      });
      const d = await res.json();
      if (d.success) {
        setNewSubject("");
        setNewMsg("");
        setNewCategory("general");
        setNewPriority("normal");
        setNewRelatedType("None");
        setNewRelatedId("");
        fetchSessions();
        openSession(d.session);
      }
    } catch {}
    setLoading(false);
  };

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAttachment(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const submitRating = async () => {
    if (!activeSession || rating < 1) return;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rate_session", sessionId: activeSession.id, rating, comment: ratingComment }),
      });
      const d = await res.json();
      if (d.success) setRatingSubmitted(true);
    } catch {}
  };

  if (!user) return null;

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => { setIsOpen(true); setUnreadCount(0); }}
          style={{
            position: "fixed", bottom: 20, right: 20, zIndex: 9999,
            background: "#3ea136", color: "#fff", border: "none", borderRadius: 28,
            padding: "14px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,0,0,0.25)", display: "flex", alignItems: "center", gap: 8,
          }}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="#fff"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
          Contact Support
          {unreadCount > 0 && (
            <span style={{ position: "absolute", top: -4, right: -4, background: "#e53e3e", color: "#fff", fontSize: 11, minWidth: 20, height: 20, padding: "0 5px", borderRadius: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{unreadCount}</span>
          )}
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div style={{
          position: "fixed", bottom: 20, right: 20, zIndex: 9999,
          width: 380, maxWidth: "90vw", height: 500, maxHeight: "80vh",
          background: "#fff", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{ background: "#3ea136", color: "#fff", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>
                {view === "new" ? "New Ticket" : view === "chat" ? activeSession?.subject || "Chat" : "Support"}
              </div>
              <div style={{ fontSize: 11, opacity: 0.85 }}>
                {view === "list" ? `${sessions.length} ticket(s)` : view === "chat" ? "Messages update every 5s" : "How can we help?"}
              </div>
            </div>
            <button onClick={() => { setIsOpen(false); setView("list"); setActiveSession(null); }} style={{ background: "none", border: "none", color: "#fff", fontSize: 20, cursor: "pointer" }}>&times;</button>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
            {/* List view */}
            {view === "list" && (
              <div style={{ flex: 1, overflow: "auto" }}>
                <div style={{ padding: "8px 12px 4px", borderBottom: "1px solid #eee" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase", padding: "0 4px", marginBottom: 2 }}>Quick help</div>
                  <ChatFaqAccordion />
                </div>
                <button
                  onClick={() => setView("new")}
                  style={{ width: "100%", padding: 12, background: "#f0f7ed", border: "none", borderBottom: "1px solid #eee", cursor: "pointer", fontWeight: 600, color: "#3ea136", fontSize: 14 }}
                >
                  + New Support Ticket
                </button>
                {sessions.length === 0 && (
                  <div style={{ padding: 30, textAlign: "center", color: "#888", fontSize: 13 }}>
                    No tickets yet. Click above to create one.
                  </div>
                )}
                {sessions.map(s => (
                  <div
                    key={s.id}
                    onClick={() => openSession(s)}
                    style={{ padding: "10px 16px", borderBottom: "1px solid #f0f0f0", cursor: "pointer", transition: "background 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#f9f9f9")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{s.subject}</span>
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        {(s.unreadCount || 0) > 0 && (
                          <span style={{ background: "#e53e3e", color: "#fff", fontSize: 9, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 8, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{s.unreadCount}</span>
                        )}
                        <span style={{
                          fontSize: 10, padding: "2px 8px", borderRadius: 10, fontWeight: 600,
                          background: s.status === "open" ? "#e8f5e9" : s.status === "assigned" ? "#e3f2fd" : s.status === "resolved" ? "#f3e5f5" : "#eee",
                          color: s.status === "open" ? "#2e7d32" : s.status === "assigned" ? "#1565c0" : s.status === "resolved" ? "#7b1fa2" : "#666",
                        }}>{s.status}</span>
                      </div>
                    </div>
                    {s.messages?.[0]?.message && (
                      <div style={{ fontSize: 11, color: "#aaa", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.messages[0].message.slice(0, 40)}</div>
                    )}
                    <div style={{ fontSize: 11, color: "#888", marginTop: 4, display: "flex", justifyContent: "space-between" }}>
                      <span>{s.category} · {s.priority}</span>
                      <span>{new Date(s.updatedAt).toLocaleDateString()}</span>
                    </div>
                    {s.assignee && <div style={{ fontSize: 11, color: "#1976d2", marginTop: 2 }}>Assigned to: {s.assignee.name || s.assignee.username}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* New ticket view */}
            {view === "new" && (
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                <button onClick={() => setView("list")} style={{ background: "none", border: "none", color: "#3ea136", cursor: "pointer", fontSize: 13, textAlign: "left", padding: 0 }}>&larr; Back to tickets</button>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "#666", marginBottom: 4 }}>Subject</label>
                  <input type="text" value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="Brief description of your issue" style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13 }} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", fontSize: 12, color: "#666", marginBottom: 4 }}>Category</label>
                    <select value={newCategory} onChange={e => setNewCategory(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13 }}>
                      <option value="general">General</option>
                      <option value="order">Order Issue</option>
                      <option value="payment">Payment</option>
                      <option value="account">Account</option>
                      <option value="vendor">Vendor</option>
                      <option value="dispute">Dispute</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", fontSize: 12, color: "#666", marginBottom: 4 }}>Priority</label>
                    <select value={newPriority} onChange={e => setNewPriority(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13 }}>
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "#666", marginBottom: 4 }}>Related to</label>
                  <select value={newRelatedType} onChange={e => setNewRelatedType(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13 }}>
                    <option value="None">None</option>
                    <option value="Order">Order</option>
                    <option value="Product">Product</option>
                    <option value="Dispute">Dispute</option>
                    <option value="Deposit">Deposit</option>
                    <option value="Withdrawal">Withdrawal</option>
                  </select>
                </div>
                {newRelatedType !== "None" && (
                  <div>
                    <label style={{ display: "block", fontSize: 12, color: "#666", marginBottom: 4 }}>{newRelatedType} ID</label>
                    <input type="text" value={newRelatedId} onChange={e => setNewRelatedId(e.target.value)} placeholder={`Enter ${newRelatedType.toLowerCase()} ID`} style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13 }} />
                  </div>
                )}
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <label style={{ display: "block", fontSize: 12, color: "#666", marginBottom: 4 }}>Message</label>
                  <textarea value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Describe your issue in detail..." style={{ flex: 1, minHeight: 100, padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13, resize: "vertical" }} />
                </div>
                <button
                  onClick={createSession}
                  disabled={loading || !newSubject.trim() || !newMsg.trim()}
                  style={{ padding: "10px 0", background: loading || !newSubject.trim() || !newMsg.trim() ? "#ccc" : "#3ea136", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, cursor: loading ? "wait" : "pointer", fontSize: 14 }}
                >
                  {loading ? "Sending..." : "Submit Ticket"}
                </button>
              </div>
            )}

            {/* Chat view */}
            {view === "chat" && activeSession && (
              <>
                <button onClick={() => { setView("list"); setActiveSession(null); }} style={{ background: "none", border: "none", color: "#3ea136", cursor: "pointer", fontSize: 13, textAlign: "left", padding: "8px 16px", borderBottom: "1px solid #f0f0f0" }}>&larr; Back to tickets</button>
                {activeSession.status === "resolved" && !isStaff && !activeSession.rating && !ratingSubmitted && (
                  <div style={{ padding: 12, borderBottom: "1px solid #eee", background: "#fafafa" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Rate this support session</div>
                    <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                      {[1, 2, 3, 4, 5].map(n => (
                        <button key={n} onClick={() => setRating(n)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, lineHeight: 1, filter: n <= rating ? "none" : "grayscale(1)", opacity: n <= rating ? 1 : 0.4 }}>★</button>
                      ))}
                    </div>
                    <input type="text" value={ratingComment} onChange={e => setRatingComment(e.target.value)} placeholder="Comment (optional)" style={{ width: "100%", padding: "6px 8px", border: "1px solid #ddd", borderRadius: 6, fontSize: 12, marginBottom: 6 }} />
                    <button onClick={submitRating} disabled={rating < 1} style={{ padding: "6px 12px", background: rating < 1 ? "#ccc" : "#3ea136", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: rating < 1 ? "not-allowed" : "pointer" }}>Submit rating</button>
                  </div>
                )}
                {activeSession.status === "resolved" && !isStaff && !activeSession.rating && ratingSubmitted && (
                  <div style={{ padding: 12, borderBottom: "1px solid #eee", background: "#fafafa", fontSize: 12, fontWeight: 600, color: "#2e7d32" }}>Thanks for your feedback! ★ {rating}</div>
                )}
                <div style={{ flex: 1, overflow: "auto", padding: "8px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                  {messages.map(m => {
                    const isAdminMsg = m.isAdmin;
                    return (
                      <div key={m.id} style={{ display: "flex", justifyContent: isAdminMsg ? "flex-start" : "flex-end" }}>
                        <div style={{
                          maxWidth: "80%", padding: "8px 12px", borderRadius: 12,
                          background: isAdminMsg ? "#e3f2fd" : "#3ea136",
                          color: isAdminMsg ? "#333" : "#fff",
                          fontSize: 13,
                        }}>
                          {isAdminMsg && <div style={{ fontSize: 10, fontWeight: 600, color: "#1976d2", marginBottom: 2 }}>{m.sender?.name || m.sender?.username} (Support)</div>}
                          <div>{m.message}</div>
                          {m.attachment && (
                            isImage(m.attachment) ? (
                              <img src={m.attachment} alt="" style={{ maxWidth: 180, borderRadius: 6, display: "block", marginTop: 4 }} />
                            ) : (
                              <a href={m.attachment} target="_blank" rel="noopener noreferrer" style={{ color: isAdminMsg ? "#1976d2" : "#fff", textDecoration: "underline", display: "block", marginTop: 4, fontSize: 12 }}>📎 Attachment</a>
                            )
                          )}
                          <div style={{ fontSize: 9, opacity: 0.6, marginTop: 4, textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            {/* Read receipts: only show for own messages (user-sent) */}
                            {!isAdminMsg && (
                              <span style={{ fontSize: 11, fontWeight: 700, color: m.read ? "#fff" : "rgba(255,255,255,0.5)" }}>
                                {m.read ? "✓✓" : "✓"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEnd} />
                </div>
                {activeSession.status !== "closed" && activeSession.status !== "resolved" ? (
                  <div style={{ padding: "6px 8px 8px", borderTop: "1px solid #eee" }}>
                    {otherTyping && <div style={{ fontSize: 10, color: "#1976d2", padding: "2px 12px" }}>Support is typing...</div>}
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {isStaff && (
                        <div style={{ position: "relative" }}>
                          <button onClick={() => setShowCanned(v => !v)} title="Canned responses" style={{ width: 32, height: 32, background: "#f5f5f5", border: "1px solid #ddd", borderRadius: "50%", cursor: "pointer", fontSize: 14, flexShrink: 0 }}>⚡</button>
                          {showCanned && (
                            <div style={{ position: "absolute", bottom: "100%", left: 0, marginBottom: 4, background: "#fff", border: "1px solid #ddd", borderRadius: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", minWidth: 200, maxHeight: 180, overflowY: "auto", zIndex: 50, padding: 4 }}>
                              {cannedResponses.length === 0 && <div style={{ padding: 8, fontSize: 11, color: "#888" }}>No canned responses</div>}
                              {cannedResponses.map(c => (
                                <button key={c.id} onClick={() => { setNewMsg(prev => (prev ? `${prev} ${c.content}` : c.content)); setShowCanned(false); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 10px", fontSize: 12, background: "none", border: "none", cursor: "pointer", borderRadius: 4 }}>{c.title}</button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      <button onClick={() => fileInputRef.current?.click()} title="Attach file" style={{ width: 32, height: 32, background: "#f5f5f5", border: "1px solid #ddd", borderRadius: "50%", cursor: "pointer", fontSize: 14, flexShrink: 0 }}>📎</button>
                      {attachment && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#f0f7ed", border: "1px solid #cfe3c9", borderRadius: 10, padding: "2px 8px", fontSize: 11, color: "#3ea136", flexShrink: 0 }}>
                          📎 1 attachment
                          <button onClick={() => setAttachment(null)} style={{ background: "none", border: "none", color: "#999", cursor: "pointer", fontSize: 12 }}>&times;</button>
                        </div>
                      )}
                      <input type="file" ref={fileInputRef} style={{ display: "none" }} onChange={handleFile} />
                      <input
                        type="text" value={newMsg} onChange={e => { setNewMsg(e.target.value); sendTyping(); }}
                        onKeyDown={e => e.key === "Enter" && sendMessage()}
                        placeholder="Type a message..." style={{ flex: 1, padding: "8px 10px", border: "1px solid #ddd", borderRadius: 20, fontSize: 13 }}
                      />
                      <button onClick={sendMessage} disabled={loading || (!newMsg.trim() && !attachment)} style={{
                        padding: "8px 16px", background: loading || (!newMsg.trim() && !attachment) ? "#ccc" : "#3ea136", color: "#fff", border: "none", borderRadius: 20, fontWeight: 600, cursor: "pointer", fontSize: 13, flexShrink: 0,
                      }}>Send</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: 12, textAlign: "center", color: "#888", fontSize: 12, borderTop: "1px solid #eee" }}>
                    This ticket is {activeSession.status}.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
