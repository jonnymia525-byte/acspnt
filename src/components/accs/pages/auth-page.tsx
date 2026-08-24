"use client";

import Link from "next/link";

import { useState } from "react";
import { useStore } from "@/store";

interface Props { initialTab: "login" | "signup" | "seller"; sellerMode?: boolean; }

function Captcha({ a, b, value, onSelect }: { a: number; b: number; value: number | null; onSelect: (v: number) => void }) {
  const [options] = useState(() => [a + b, a + b + 1].sort(() => Math.random() - 0.5));
  return (
    <div style={{ background: "#f9f9f9", padding: 10, borderRadius: 6 }}>
      <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>What is {a} + {b}?</div>
      <div style={{ display: "flex", gap: 8 }}>
        {options.map(v => (
          <label key={v} style={{ flex: 1, textAlign: "center", padding: 8, borderRadius: 6, border: value === v ? "2px solid #3ea136" : "2px solid #ddd", cursor: "pointer", fontSize: 13, background: value === v ? "#f0fdf4" : "#fff" }}>
            <input type="radio" name="captcha" value={v} className="sr-only" onChange={() => onSelect(v)} />
            {v}
          </label>
        ))}
      </div>
    </div>
  );
}

export function AuthPage({ initialTab }: Props) {
  const { setUser } = useStore();
  const [tab, setTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [twoFaStep, setTwoFaStep] = useState(false);
  const [twoFaUserId, setTwoFaUserId] = useState("");
  const [twoFaUsername, setTwoFaUsername] = useState("");

  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [login2fa, setLogin2fa] = useState("");

  const [regUser, setRegUser] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regContact, setRegContact] = useState("email");
  const [regDetail, setRegDetail] = useState("");

  const [sFirst, setSFirst] = useState("");
  const [sLast, setSLast] = useState("");
  const [sEmail, setSEmail] = useState("");
  const [sPass, setSPass] = useState("");
  const [sUser, setSUser] = useState("");
  const [sContact, setSContact] = useState("telegram");
  const [sDetail, setSDetail] = useState("");
  const [sDetails, setSDetails] = useState("");
  const [sBulk, setSBulk] = useState(false);
  const [sTerms, setSTerms] = useState(false);

  const [ca] = useState(() => Math.floor(Math.random() * 20) + 1);
  const [cb] = useState(() => Math.floor(Math.random() * 20) + 1);
  const [captcha, setCaptcha] = useState<number | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: loginUser, password: loginPass, captchaAnswer: captcha }) });
      const data = await res.json();
      if (data.twoFaRequired) { setTwoFaStep(true); setTwoFaUserId(data.userId); setTwoFaUsername(data.username); }
      else      if (data.success) { setUser(data.user); const r = data.user.role; location.href = r === "admin" ? "/?page=admin-dashboard" : r === "vendor" ? "/?page=vendor-dashboard" : "/?page=user-dashboard"; } else setError(data.error || "Login failed");
    } catch { setError("Network error"); }
    setLoading(false);
  };

  const handle2fa = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/2fa/verify-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: twoFaUserId, code: login2fa }) });
      const data = await res.json();
      if (data.success) { setUser(data.user); const r = data.user.role; location.href = r === "admin" ? "/?page=admin-dashboard" : r === "vendor" ? "/?page=vendor-dashboard" : "/?page=user-dashboard"; } else setError(data.error || "Invalid code");
    } catch { setError("Network error"); }
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: regUser, email: regEmail, password: regPass, confirmPassword: regConfirm, contactMethod: regContact, contactDetail: regDetail }) });
      const data = await res.json();
      if (data.success) { setUser(data.user); const r = data.user.role; location.href = r === "admin" ? "/?page=admin-dashboard" : r === "vendor" ? "/?page=vendor-dashboard" : "/?page=user-dashboard"; } else setError(data.error);
    } catch { setError("Network error"); }
    setLoading(false);
  };

  const handleSeller = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/vendor-apply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ firstName: sFirst, lastName: sLast, username: sUser, email: sEmail, password: sPass, contactMethod: sContact, contactDetail: sDetail, productDetails: sDetails, bulk: sBulk, terms: sTerms }) });
      const data = await res.json();
      if (data.success) { setUser(data.user); location.href = "/?page=vendor-dashboard"; } else setError(data.error);
    } catch { setError("Network error"); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f5", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Link href="/" style={{ fontSize: 24, fontWeight: 800 }}>Accs<span style={{ color: "#e53e3e" }}>Point</span></Link>
        </div>
        <div className="panel">
          <div style={{ display: "flex", borderBottom: "1px solid #eee" }}>
            {([["login", "Login"], ["signup", "Sign Up"], ["seller", "Become a Seller"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => { setTab(k); setError(""); }}
                style={{ flex: 1, padding: "10px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", background: "none", border: "none", borderBottom: tab === k ? "2px solid #3ea136" : "2px solid transparent", color: tab === k ? "#3ea136" : "#888" }}>
                {l}
              </button>
            ))}
          </div>
          <div style={{ padding: 20 }}>
            {error && <div style={{ fontSize: 12, color: "#e53e3e", background: "#fee2e2", padding: 8, borderRadius: 6, marginBottom: 12 }}>{error}</div>}

            {twoFaStep ? (
              <form onSubmit={handle2fa} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 13, color: "#555" }}>Hi <strong>{twoFaUsername}</strong> &mdash; enter your 6-digit code.</div>
                <input type="text" maxLength={6} value={login2fa} onChange={e => setLogin2fa(e.target.value.replace(/\D/g, ""))}
                  className="input" style={{ textAlign: "center", fontSize: 20, letterSpacing: 6, fontFamily: "monospace" }} placeholder="000000" autoFocus />
                <button type="submit" disabled={loading || login2fa.length !== 6} className="btn btn-primary" style={{ width: "100%" }}>
                  {loading ? "Verifying..." : "Verify"}
                </button>
                <button type="button" onClick={() => { setTwoFaStep(false); setError(""); }} className="btn btn-ghost" style={{ width: "100%", fontSize: 12 }}>Back</button>
              </form>
            ) : tab === "login" ? (
              <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label className="label">Username or Email</label>
                  <input type="text" value={loginUser} onChange={e => setLoginUser(e.target.value)} className="input" required />
                </div>
                <div>
                  <label className="label">Password</label>
                  <div style={{ position: "relative" }}>
                    <input type={showPass ? "text" : "password"} value={loginPass} onChange={e => setLoginPass(e.target.value)} className="input" style={{ paddingRight: 36 }} required />
                    <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#888" }}>
                      {showPass ? "hide" : "show"}
                    </button>
                  </div>
                </div>
                <Captcha a={ca} b={cb} value={captcha} onSelect={setCaptcha} />
                <button type="submit" disabled={loading || captcha === null} className="btn btn-primary" style={{ width: "100%" }}>
                  {loading ? "Logging in..." : "Login"}
                </button>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Link href="/?page=forgot-password" style={{ fontSize: 12, color: '#e53e3e' }}>Forgot password?</Link>
                  <Link href="/?page=register" style={{ fontSize: 12, color: '#3ea136' }}>No account? Sign up</Link>
                </div>
              </form>
            ) : tab === "signup" ? (
              <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div><label className="label">Username</label><input type="text" value={regUser} onChange={e => setRegUser(e.target.value)} className="input" required /></div>
                <div><label className="label">Email</label><input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} className="input" required /></div>
                <div>
                  <label className="label">Password</label>
                  <div style={{ position: "relative" }}>
                    <input type={showPass ? "text" : "password"} value={regPass} onChange={e => setRegPass(e.target.value)} className="input" style={{ paddingRight: 36 }} required minLength={8} />
                    <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#888" }}>{showPass ? "hide" : "show"}</button>
                  </div>
                </div>
                <div><label className="label">Confirm Password</label><input type="password" value={regConfirm} onChange={e => setRegConfirm(e.target.value)} className="input" required /></div>
                <div>
                  <label className="label">Contact Method</label>
                  <select value={regContact} onChange={e => setRegContact(e.target.value)} className="input">
                    <option value="email">Email</option><option value="telegram">Telegram</option><option value="whatsapp">WhatsApp</option>
                  </select>
                </div>
                <div><label className="label">Contact Detail</label><input type="text" value={regDetail} onChange={e => setRegDetail(e.target.value)} className="input" required /></div>
                <Captcha a={ca} b={cb} value={captcha} onSelect={setCaptcha} />
                <button type="submit" disabled={loading || captcha === null} className="btn btn-primary" style={{ width: "100%" }}>{loading ? "Creating..." : "Create Account"}</button>
                <Link href="/?page=login" style={{ textAlign: "center", fontSize: 12, color: "#3ea136" }}>Have an account? Login</Link>
              </form>
            ) : (
              <form onSubmit={handleSeller} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}><label className="label">First Name</label><input type="text" value={sFirst} onChange={e => setSFirst(e.target.value)} className="input" required /></div>
                  <div style={{ flex: 1 }}><label className="label">Last Name</label><input type="text" value={sLast} onChange={e => setSLast(e.target.value)} className="input" required /></div>
                </div>
                <div><label className="label">Username</label><input type="text" value={sUser} onChange={e => setSUser(e.target.value)} className="input" placeholder="(optional)" /></div>
                <div><label className="label">Email</label><input type="email" value={sEmail} onChange={e => setSEmail(e.target.value)} className="input" required /></div>
                <div><label className="label">Password</label><input type="password" value={sPass} onChange={e => setSPass(e.target.value)} className="input" required minLength={8} /></div>
                <div>
                  <label className="label">Contact</label>
                  <select value={sContact} onChange={e => setSContact(e.target.value)} className="input">
                    <option value="telegram">Telegram</option><option value="whatsapp">WhatsApp</option>
                  </select>
                </div>
                <div><label className="label">Contact Detail</label><input type="text" value={sDetail} onChange={e => setSDetail(e.target.value)} className="input" required /></div>
                <div>
                  <label className="label">Product Details (20-500 chars)</label>
                  <textarea value={sDetails} onChange={e => setSDetails(e.target.value)} className="input" rows={3} minLength={20} maxLength={500} required />
                  <div style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}>{sDetails.length}/500</div>
                </div>
                <label style={{ fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="checkbox" checked={sBulk} onChange={e => setSBulk(e.target.checked)} /> I supply accounts in bulk
                </label>
                <label style={{ fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="checkbox" checked={sTerms} onChange={e => setSTerms(e.target.checked)} />
                  I agree to the <Link href="/?page=seller-terms" style={{ color: "#3ea136", textDecoration: "underline" }}>Seller Terms</Link>
                </label>
                <Captcha a={ca} b={cb} value={captcha} onSelect={setCaptcha} />
                <button type="submit" disabled={loading || captcha === null || !sTerms} className="btn" style={{ width: "100%", background: "#8e44ad", color: "#fff" }}>
                  {loading ? "Submitting..." : "Submit Application"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
