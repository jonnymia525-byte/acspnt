"use client";

import { useState } from "react";

interface Props {
  user: { name: string; email: string; username: string; role: string };
  onUpdate: (user: { name?: string; email?: string }) => void;
}

export function ProfileSettings({ user, onUpdate }: Props) {
  const [name, setName] = useState(user.name || "");
  const [email, setEmail] = useState(user.email || "");
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const handleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMsg("");
    try {
      const res = await fetch("/api/auth/update-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg("Profile updated successfully");
        onUpdate(data.user);
      } else {
        setError(data.error || "Failed to update");
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      setError("New passwords do not match");
      return;
    }
    setLoading(true);
    setError("");
    setMsg("");
    try {
      const res = await fetch("/api/auth/update-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg("Password changed successfully");
        setCurrentPass("");
        setNewPass("");
        setConfirmPass("");
      } else {
        setError(data.error || "Failed to change password");
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: 16 }}>
      {msg && <div style={{ fontSize: 12, color: "#3ea136", background: "#f0fdf4", padding: 10, borderRadius: 6, marginBottom: 12 }}>{msg}</div>}
      {error && <div style={{ fontSize: 12, color: "#e53e3e", background: "#fee2e2", padding: 10, borderRadius: 6, marginBottom: 12 }}>{error}</div>}

      {/* Profile Info */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "#333" }}>👤 Profile Information</h3>
        <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>
          Username: <strong style={{ color: "#333" }}>{user.username}</strong>
          <span style={{ marginLeft: 8, color: "#aaa" }}>(cannot be changed)</span>
        </div>
        <form onSubmit={handleProfile} style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 400 }}>
          <div>
            <label className="label">Display Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="input" placeholder="Your name" />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" required />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: "fit-content" }}>
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid #eee", margin: "16px 0" }} />

      {/* Change Password */}
      <div>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "#333" }}>🔒 Change Password</h3>
        <form onSubmit={handlePassword} style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 400 }}>
          <div>
            <label className="label">Current Password</label>
            <input type="password" value={currentPass} onChange={e => setCurrentPass(e.target.value)} className="input" required />
          </div>
          <div>
            <label className="label">New Password</label>
            <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} className="input" required minLength={8} />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} className="input" required />
          </div>
          <button type="submit" disabled={loading || !currentPass || newPass.length < 8 || newPass !== confirmPass} className="btn" style={{ width: "fit-content", background: "#333", color: "#fff" }}>
            {loading ? "Changing..." : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
