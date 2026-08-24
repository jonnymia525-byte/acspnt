"use client";

import Link from "next/link";

import { useState } from "react";
import { useStore } from "@/store";
import { toast } from "@/components/accs/widgets/toast";

interface Props { initialTab: "login" | "signup" | "seller"; sellerMode?: boolean; }

const getStrength = (pwd: string) => {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score; // 0-4
};
const strengthLabel = ["Weak", "Weak", "Fair", "Good", "Strong"];
const strengthColor = ["#e53e3e", "#e53e3e", "#ff9800", "#3ea136", "#3ea136"];

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

function GoogleButton() {
  return (
    <button type="button" onClick={() => toast("Google sign-in is not configured yet. Use email/password.", "info")} style={{ width: "100%", padding: "10px 0", borderRadius: 6, border: "1px solid #ddd", background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
      <svg viewBox="0 0 24 24" width="18" height="18">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Continue with Google
    </button>
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
  const [loginRemember, setLoginRemember] = useState(false);

  const [regUser, setRegUser] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regContact, setRegContact] = useState("email");
  const [regDetail, setRegDetail] = useState("");
  const [regTerms, setRegTerms] = useState(false);
  const [verifyInfo, setVerifyInfo] = useState("");

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

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [sellerStep, setSellerStep] = useState(1);
  const [sellerSubmitted, setSellerSubmitted] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [verifyEmailStep, setVerifyEmailStep] = useState(false);
  const [verifyEmailAddress, setVerifyEmailAddress] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);

  const clearFieldError = (key: string) => setFieldErrors(f => ({ ...f, [key]: "" }));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: loginUser, password: loginPass, captchaAnswer: captcha, captchaA: ca, captchaB: cb, remember: loginRemember }) });
      const data = await res.json();
      if (res.status === 429) setError("Too many attempts. Please wait 15 minutes before trying again.");
      else if (data.twoFaRequired) { setTwoFaStep(true); setTwoFaUserId(data.userId); setTwoFaUsername(data.username); }
      else if (data.success) { setUser(data.user); const r = data.user.role; location.href = r === "admin" ? "/?page=admin-dashboard" : r === "vendor" ? "/?page=vendor-dashboard" : "/?page=user-dashboard"; }
      else setError(data.error || "Login failed");
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

  const handleVerifyEmail = async () => {
    if (verifyCode.length !== 6) return;
    setVerifyLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/verify-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: verifyEmailAddress, code: verifyCode }) });
      const data = await res.json();
      if (data.success) location.href = "/?page=user-dashboard";
      else setError(data.error || "Verification failed");
    } catch { setError("Network error"); }
    setVerifyLoading(false);
  };

  

  

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    const fe: Record<string, string> = {};
    if (regUser.trim().length < 3) fe.username = "Username must be at least 3 characters";
    if (!/^\S+@\S+\.\S+$/.test(regEmail)) fe.email = "Enter a valid email";
    if (regPass.length < 8 || !/[0-9]/.test(regPass)) fe.password = "Password must be at least 8 characters and contain a number";
    if (regConfirm !== regPass) fe.confirm = "Passwords do not match";
    setFieldErrors(fe);
    if (Object.keys(fe).length > 0) { setLoading(false); return; }
    try {
      const res = await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: regUser, email: regEmail, password: regPass, confirmPassword: regConfirm, contactMethod: regContact, contactDetail: regDetail, terms: regTerms, captchaAnswer: captcha, captchaA: ca, captchaB: cb }) });
      const data = await res.json();
      if (data.needsVerification) { setVerifyEmailStep(true); setVerifyEmailAddress(regEmail); setVerifyInfo(data.emailCode); }
      else if (data.success) {
        if (data.user) setUser(data.user);
        setSignupSuccess(true);
        setTimeout(() => { location.href = "/?page=user-dashboard"; }, 1200);
      } else {
        const err = data.error || "Registration failed";
        if (/username/i.test(err)) setFieldErrors(f => ({ ...f, username: err }));
        else if (/password/i.test(err)) setFieldErrors(f => ({ ...f, password: err }));
        else if (/email/i.test(err)) setFieldErrors(f => ({ ...f, email: err }));
        else setError(err);
      }
    } catch { setError("Network error"); }
    setLoading(false);
  };

  const handleSellerContinue = (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    const fe: Record<string, string> = {};
    if (!sFirst.trim()) fe.firstName = "First name is required";
    if (!sLast.trim()) fe.lastName = "Last name is required";
    if (!/^\S+@\S+\.\S+$/.test(sEmail)) fe.email = "Enter a valid email";
    if (sPass.length < 8 || !/[0-9]/.test(sPass)) fe.password = "Password must be at least 8 characters and contain a number";
    setFieldErrors(fe);
    if (Object.keys(fe).length === 0) setSellerStep(2);
  };

  const handleSeller = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/vendor-apply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ firstName: sFirst, lastName: sLast, username: sUser, email: sEmail, password: sPass, contactMethod: sContact, contactDetail: sDetail, productDetails: sDetails, bulk: sBulk, terms: sTerms, captchaAnswer: captcha, captchaA: ca, captchaB: cb }) });
      const data = await res.json();
      if (data.success) setSellerSubmitted(true);
      else {
        const err = data.error || "Application failed";
        if (/username/i.test(err)) setFieldErrors(f => ({ ...f, username: err }));
        else if (/password/i.test(err)) setFieldErrors(f => ({ ...f, password: err }));
        else if (/email/i.test(err)) setFieldErrors(f => ({ ...f, email: err }));
        else setError(err);
      }
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
              <button key={k} onClick={() => { setTab(k); setError(""); setFieldErrors({}); setSellerStep(1); setSignupSuccess(false); setSellerSubmitted(false); setVerifyEmailStep(false); setVerifyInfo(""); setVerifyCode(""); }}
                style={{ flex: 1, padding: "10px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", background: "none", border: "none", borderBottom: tab === k ? "2px solid #3ea136" : "2px solid transparent", color: tab === k ? "#3ea136" : "#888" }}>
                {l}
              </button>
            ))}
          </div>
          <div style={{ padding: 20 }}>
            {error && <div style={{ fontSize: 12, color: "#e53e3e", background: "#fee2e2", padding: 8, borderRadius: 6, marginBottom: 12 }}>{error}</div>}

            {verifyEmailStep ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 13, color: "#555" }}>Check your email — verification code: <strong>{verifyInfo}</strong></div>
                <div style={{ fontSize: 12, color: "#888", lineHeight: 1.5 }}>A 6-digit verification code was sent to <strong>{verifyEmailAddress}</strong>. Enter it below to activate your account.</div>
                <input type="text" maxLength={6} value={verifyCode} onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                  className="input" style={{ textAlign: "center", fontSize: 20, letterSpacing: 6, fontFamily: "monospace" }} placeholder="000000" autoFocus />
                <button type="button" disabled={verifyLoading || verifyCode.length !== 6} className="btn btn-primary" style={{ width: "100%" }} onClick={handleVerifyEmail}>
                  {verifyLoading ? "Verifying..." : "Verify Email"}
                </button>
                <div style={{ fontSize: 11, color: "#888", textAlign: "center" }}>Didn't receive it? Resend will be available in a few minutes.</div>
                <button type="button" onClick={() => { setVerifyInfo(""); setVerifyEmailStep(false); setVerifyCode(""); setError(""); setTab("login"); }} className="btn btn-ghost" style={{ width: "100%", fontSize: 12 }}>Go to Login</button>
              </div>
            ) : signupSuccess ? (
              <div style={{ textAlign: "center", padding: 20 }}>
                <div style={{ width: 60, height: 60, borderRadius: 30, background: "#e8f5e9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}><span style={{ fontSize: 28, color: "#3ea136" }}>✓</span></div>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Account created!</h2>
                <p style={{ fontSize: 13, color: "#666", lineHeight: 1.6 }}>Redirecting...</p>
              </div>
            ) : sellerSubmitted ? (
              <div style={{ textAlign: "center", padding: 20 }}>
                <div style={{ width: 60, height: 60, borderRadius: 30, background: "#e8f5e9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}><span style={{ fontSize: 28, color: "#3ea136" }}>✓</span></div>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Application Submitted!</h2>
                <p style={{ fontSize: 13, color: "#666", lineHeight: 1.6 }}>Thank you! Our team will review your application and contact you within 48 hours via your chosen contact method.</p>
                <Link href="/" className="btn btn-primary" style={{ display: "block", marginTop: 12 }}>Back to Store</Link>
              </div>
            ) : twoFaStep ? (
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
              <form onSubmit={handleLogin} noValidate style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label className="label">Username or Email</label>
                  <input type="text" value={loginUser} onChange={e => setLoginUser(e.target.value)} className="input" autoComplete="username" required />
                </div>
                <div>
                  <label className="label">Password</label>
                  <div style={{ position: "relative" }}>
                    <input type={showPass ? "text" : "password"} value={loginPass} onChange={e => setLoginPass(e.target.value)} className="input" style={{ paddingRight: 36 }} autoComplete="current-password" required />
                    <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#888" }}>
                      {showPass ? "hide" : "show"}
                    </button>
                  </div>
                </div>
<Captcha a={ca} b={cb} value={captcha} onSelect={setCaptcha} />
                <label style={{ fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="checkbox" checked={loginRemember} onChange={e => setLoginRemember(e.target.checked)} /> Remember me
                </label>
                <button type="submit" disabled={loading || captcha === null} className="btn btn-primary" style={{ width: "100%" }}>
                  {loading ? "Logging in..." : "Login"}
                </button>
<GoogleButton />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Link href="/?page=forgot-password" style={{ fontSize: 12, color: '#e53e3e' }}>Forgot password?</Link>
                  <Link href="/?page=register" style={{ fontSize: 12, color: '#3ea136' }}>No account? Sign up</Link>
                </div>
              </form>
            ) : tab === "signup" ? (
              <form onSubmit={handleSignup} noValidate style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label className="label">Username</label>
                  <input type="text" value={regUser} onChange={e => { setRegUser(e.target.value); clearFieldError("username"); }} className="input" autoComplete="username" required />
                  {fieldErrors.username && <div style={{ fontSize: 10, color: "#e53e3e", marginTop: 2 }}>{fieldErrors.username}</div>}
                </div>
                <div>
                  <label className="label">Email</label>
                  <input type="email" value={regEmail} onChange={e => { setRegEmail(e.target.value); clearFieldError("email"); }} className="input" autoComplete="email" required />
                  {fieldErrors.email && <div style={{ fontSize: 10, color: "#e53e3e", marginTop: 2 }}>{fieldErrors.email}</div>}
                </div>
                <div>
                  <label className="label">Password</label>
                  <div style={{ position: "relative" }}>
                    <input type={showPass ? "text" : "password"} value={regPass} onChange={e => { setRegPass(e.target.value); clearFieldError("password"); clearFieldError("confirm"); }} className="input" style={{ paddingRight: 36 }} autoComplete="new-password" required minLength={8} />
                    <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#888" }}>{showPass ? "hide" : "show"}</button>
                  </div>
                  {fieldErrors.password && <div style={{ fontSize: 10, color: "#e53e3e", marginTop: 2 }}>{fieldErrors.password}</div>}
                  {regPass && (
                    <div style={{ marginTop: 4 }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        {[0,1,2,3].map(i => <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < getStrength(regPass) ? strengthColor[getStrength(regPass)] : "#e0e0e0" }} />)}
                      </div>
                      <div style={{ fontSize: 10, color: strengthColor[getStrength(regPass)], marginTop: 2 }}>{strengthLabel[getStrength(regPass)]}</div>
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>8+ chars, number, uppercase</div>
                </div>
                <div>
                  <label className="label">Confirm Password</label>
                  <input type="password" value={regConfirm} onChange={e => { setRegConfirm(e.target.value); clearFieldError("confirm"); }} className="input" autoComplete="new-password" required />
                  {fieldErrors.confirm && <div style={{ fontSize: 10, color: "#e53e3e", marginTop: 2 }}>{fieldErrors.confirm}</div>}
                </div>
                <div>
                  <label className="label">Contact Method</label>
                  <select value={regContact} onChange={e => setRegContact(e.target.value)} className="input">
                    <option value="email">Email</option><option value="telegram">Telegram</option><option value="whatsapp">WhatsApp</option>
                  </select>
                </div>
                <div><label className="label">Contact Detail</label><input type="text" value={regDetail} onChange={e => setRegDetail(e.target.value)} className="input" required /></div>
                <label style={{ fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="checkbox" checked={regTerms} onChange={e => setRegTerms(e.target.checked)} />
                  I agree to the <Link href="/?page=terms" style={{ color: "#3ea136", textDecoration: "underline" }}>Terms of Service</Link>
                </label>
                <Captcha a={ca} b={cb} value={captcha} onSelect={setCaptcha} />
                <button type="submit" disabled={loading || captcha === null || !regTerms} className="btn btn-primary" style={{ width: "100%" }}>{loading ? "Creating..." : "Create Account"}</button>
                <GoogleButton />
                <Link href="/?page=login" style={{ textAlign: "center", fontSize: 12, color: "#3ea136" }}>Have an account? Login</Link>
              </form>
            ) : (
              <>
                <div style={{ fontSize: 12, color: "#666", marginBottom: 12, textAlign: "center" }}>Step {sellerStep} of 2 — {sellerStep === 1 ? "Account" : "Details"}</div>
                {sellerStep === 1 ? (
                  <form onSubmit={handleSellerContinue} noValidate style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <label className="label">First Name</label>
                        <input type="text" value={sFirst} onChange={e => { setSFirst(e.target.value); clearFieldError("firstName"); }} className="input" autoComplete="given-name" required />
                        {fieldErrors.firstName && <div style={{ fontSize: 10, color: "#e53e3e", marginTop: 2 }}>{fieldErrors.firstName}</div>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <label className="label">Last Name</label>
                        <input type="text" value={sLast} onChange={e => { setSLast(e.target.value); clearFieldError("lastName"); }} className="input" autoComplete="family-name" required />
                        {fieldErrors.lastName && <div style={{ fontSize: 10, color: "#e53e3e", marginTop: 2 }}>{fieldErrors.lastName}</div>}
                      </div>
                    </div>
                    <div>
                      <label className="label">Username</label>
                      <input type="text" value={sUser} onChange={e => { setSUser(e.target.value); clearFieldError("username"); }} className="input" placeholder="(optional)" autoComplete="username" />
                      {fieldErrors.username && <div style={{ fontSize: 10, color: "#e53e3e", marginTop: 2 }}>{fieldErrors.username}</div>}
                    </div>
                    <div>
                      <label className="label">Email</label>
                      <input type="email" value={sEmail} onChange={e => { setSEmail(e.target.value); clearFieldError("email"); }} className="input" autoComplete="email" required />
                      {fieldErrors.email && <div style={{ fontSize: 10, color: "#e53e3e", marginTop: 2 }}>{fieldErrors.email}</div>}
                    </div>
                    <div>
                      <label className="label">Password</label>
                      <input type="password" value={sPass} onChange={e => { setSPass(e.target.value); clearFieldError("password"); }} className="input" autoComplete="new-password" required minLength={8} />
                      {fieldErrors.password && <div style={{ fontSize: 10, color: "#e53e3e", marginTop: 2 }}>{fieldErrors.password}</div>}
                      {sPass && (
                        <div style={{ marginTop: 4 }}>
                          <div style={{ display: "flex", gap: 4 }}>
                            {[0,1,2,3].map(i => <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < getStrength(sPass) ? strengthColor[getStrength(sPass)] : "#e0e0e0" }} />)}
                          </div>
                          <div style={{ fontSize: 10, color: strengthColor[getStrength(sPass)], marginTop: 2 }}>{strengthLabel[getStrength(sPass)]}</div>
                        </div>
                      )}
                    </div>
                    <button type="submit" className="btn" style={{ width: "100%", background: "#8e44ad", color: "#fff" }}>Continue</button>
                  </form>
                ) : (
                  <form onSubmit={handleSeller} noValidate style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" onClick={() => { setSellerStep(1); setError(""); }} className="btn btn-ghost" style={{ flex: 1 }}>Back</button>
                      <button type="submit" disabled={loading || captcha === null || !sTerms} className="btn" style={{ flex: 1, background: "#8e44ad", color: "#fff" }}>
                        {loading ? "Submitting..." : "Submit Application"}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
