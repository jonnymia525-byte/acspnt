"use client";

import Link from "next/link";
import { useState } from "react";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMsg("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg(data.message);
        // In dev mode, show reset URL directly
        if (data.resetUrl) {
          setMsg((prev: string) => `${prev}\n\nDev reset URL: ${data.resetUrl}`);
        }
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
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Forgot Password</h2>
          <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>

          {msg && <div style={{ fontSize: 12, color: "#3ea136", background: "#f0fdf4", padding: 10, borderRadius: 6, marginBottom: 12, whiteSpace: "pre-wrap" }}>{msg}</div>}
          {error && <div style={{ fontSize: 12, color: "#e53e3e", background: "#fee2e2", padding: 10, borderRadius: 6, marginBottom: 12 }}>{error}</div>}

          {!msg && (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label className="label">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" required placeholder="your@email.com" />
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: "100%" }}>
                {loading ? "Sending..." : "Send Reset Link"}
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
