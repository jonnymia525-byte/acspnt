"use client";

import { useState, useEffect, useRef } from "react";
import { useStore } from "@/store";

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
}
interface ChatMessage {
  id: string;
  message: string;
  isAdmin: boolean;
  read: boolean;
  createdAt: string;
  sender: { id: string; username: string; name: string; role: string };
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
  const [loading, setLoading] = useState(false);
  const messagesEnd = useRef<HTMLDivElement>(null);

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/chat");
      const d = await res.json();
      setSessions(d.sessions || []);
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

  const [unreadCount, setUnreadCount] = useState(0);

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
        const sessions = d.sessions || [];
        let unread = 0;
        for (const s of sessions) {
          unread += s.unreadCount || 0;
        }
        setUnreadCount(unread);
        setSessions(sessions);
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

  const openSession = (session: ChatSession) => {
    setActiveSession(session);
    setView("chat");
    // Refresh sessions after opening so unread count updates
    // (server marks messages as read when fetching them)
    setTimeout(() => fetchSessions(), 1000);
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !activeSession) return;
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_message", sessionId: activeSession.id, message: newMsg }),
      });
      const d = await res.json();
      if (d.success) {
        setNewMsg("");
        fetchMessages(activeSession.id);
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
        body: JSON.stringify({ action: "create_session", subject: newSubject, category: newCategory, priority: newPriority, message: newMsg }),
      });
      const d = await res.json();
      if (d.success) {
        setNewSubject("");
        setNewMsg("");
        setNewCategory("general");
        setNewPriority("normal");
        fetchSessions();
        openSession(d.session);
      }
    } catch {}
    setLoading(false);
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
                        {s.unreadCount && s.unreadCount > 0 && (
                          <span style={{ background: "#e53e3e", color: "#fff", fontSize: 9, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 8, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{s.unreadCount}</span>
                        )}
                        <span style={{
                          fontSize: 10, padding: "2px 8px", borderRadius: 10, fontWeight: 600,
                          background: s.status === "open" ? "#e8f5e9" : s.status === "assigned" ? "#e3f2fd" : s.status === "resolved" ? "#f3e5f5" : "#eee",
                          color: s.status === "open" ? "#2e7d32" : s.status === "assigned" ? "#1565c0" : s.status === "resolved" ? "#7b1fa2" : "#666",
                        }}>{s.status}</span>
                      </div>
                    </div>
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
                <div style={{ flex: 1, overflow: "auto", padding: "8px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                  {messages.map(m => {
                    const isOwnMessage = !m.isAdmin && m.sender?.id === user?.id;
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
                  <div style={{ padding: "8px 12px", borderTop: "1px solid #eee", display: "flex", gap: 6 }}>
                    <input
                      type="text" value={newMsg} onChange={e => setNewMsg(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && sendMessage()}
                      placeholder="Type a message..." style={{ flex: 1, padding: "8px 10px", border: "1px solid #ddd", borderRadius: 20, fontSize: 13 }}
                    />
                    <button onClick={sendMessage} disabled={loading || !newMsg.trim()} style={{
                      padding: "8px 16px", background: "#3ea136", color: "#fff", border: "none", borderRadius: 20, fontWeight: 600, cursor: "pointer", fontSize: 13,
                    }}>Send</button>
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
