"use client";

import Link from "next/link";
import { useState } from "react";

export function ResetPasswordPage({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg(data.message);
      } else {
        setError(data.error || "Something went wrong");
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f5", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Link href="/" style={{ fontSize: 24, fontWeight: 800 }}>Accs<span style={{ color: "#e53e3e" }}>Point</span></Link>
        </div>
        <div className="panel" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Reset Password</h2>

          {msg && (
            <>
              <div style={{ fontSize: 12, color: "#3ea136", background: "#f0fdf4", padding: 10, borderRadius: 6, marginBottom: 12 }}>{msg}</div>
              <Link href="/?page=login" style={{ display: "block", textAlign: "center", fontSize: 13, color: "#3ea136", fontWeight: 600 }}>Go to Login</Link>
            </>
          )}
          {error && <div style={{ fontSize: 12, color: "#e53e3e", background: "#fee2e2", padding: 10, borderRadius: 6, marginBottom: 12 }}>{error}</div>}

          {!msg && (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label className="label">New Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input" required minLength={8} placeholder="Minimum 8 characters" />
              </div>
              <div>
                <label className="label">Confirm Password</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className="input" required />
              </div>
              <button type="submit" disabled={loading || password.length < 8 || password !== confirm} className="btn btn-primary" style={{ width: "100%" }}>
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          )}

          <div style={{ marginTop: 16, textAlign: "center" }}>
            <Link href="/?page=login" style={{ fontSize: 12, color: "#3ea136" }}>Back to Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
