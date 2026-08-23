"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useStore } from "@/store";

const NETWORKS = [
  { id: "trc20", label: "TRC20 (TRON)", color: "#FF0013", minDeposit: 5 },
  { id: "bep20", label: "BEP20 (BNB Smart Chain)", color: "#F3BA2F", minDeposit: 5 },
  { id: "erc20", label: "ERC20 (Ethereum)", color: "#627EEA", minDeposit: 10 },
];

interface DepositResult {
  depositId: string;
  exactAmount: number;
  network: string;
  networkLabel: string;
  walletAddress: string;
  explorer: string;
  explorerUrl: string;
  minConfirmations: number;
}

const EXPLORER_URLS: Record<string, string> = {
  trc20: "https://tronscan.org/#/transaction/",
  bep20: "https://bscscan.com/tx/",
  erc20: "https://etherscan.io/tx/",
};

export function USDTDeposit() {
  const { user } = useStore();
  const [step, setStep] = useState<"select" | "payment" | "verify" | "done">("select");
  const [selectedNetwork, setSelectedNetwork] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DepositResult | null>(null);
  const [txHash, setTxHash] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState("");
  const [copied, setCopied] = useState<"address" | "amount" | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [errMsg, setErrMsg] = useState("");

  const network = NETWORKS.find(n => n.id === selectedNetwork);

  useEffect(() => {
    fetch("/api/deposits").then(r => r.json()).then(d => {
      if (d.deposits) setHistory(d.deposits);
    }).catch(() => {});
  }, []);

  const copy = (text: string, type: "address" | "amount") => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const handleCreate = async () => {
    const amt = parseFloat(amount);
    if (!network || isNaN(amt) || amt < network.minDeposit) return;
    setLoading(true);
    try {
      const res = await fetch("/api/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_deposit", amount: amt, network: selectedNetwork }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data);
        setStep("payment");
        setErrMsg("");
      } else {
        setErrMsg(data.error || "Failed to create deposit");
      }
    } catch { setErrMsg("Network error. Please try again."); }
    setLoading(false);
  };

  const handleVerify = async () => {
    if (!txHash.trim() || !result) return;
    setVerifyLoading(true);
    setVerifyMsg("");
    try {
      const res = await fetch("/api/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_deposit", depositId: result.depositId, txHash: txHash.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setVerifyMsg(data.message);
        if (data.newBalance !== undefined) {
          // Update user balance in store
          const { useStore } = await import("@/store");
          const store = useStore.getState();
          if (store.user) store.setUser({ ...store.user, balance: data.newBalance });
        }
        setStep("done");
      } else {
        setVerifyMsg(data.error || "Verification failed. Please check your transaction details.");
      }
    } catch {
      setVerifyMsg("Network error. Please try again.");
    }
    setVerifyLoading(false);
  };

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f5" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ marginBottom: 12, color: "#666" }}>Please login to deposit.</p>
          <Link href="/?page=login" style={{ color: "#3ea136", fontWeight: 600 }}>Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      {/* Top Bar */}
      <div className="topbar">
        <div className="news-link"><span className="news-dot" /> News</div>
        <Link href="/" style={{ color: "#fff", fontSize: 12, padding: "4px 12px", background: "#3ea136", borderRadius: 3, textDecoration: "none", fontWeight: 600 }}>Store</Link>
        <span style={{ color: "#5fa830", fontSize: 12, fontWeight: 700 }}>${user.balance.toFixed(2)}</span>
        <span style={{ color: "#888", fontSize: 11 }}>{user.name || user.username}</span>
      </div>

      <div className="wrap" style={{ maxWidth: 480, margin: "0 auto", paddingTop: 32, paddingBottom: 60 }}>

        {/* Back link */}
        <Link href="/" style={{ fontSize: 13, color: "#5fa830", textDecoration: "none", display: "inline-block", marginBottom: 20 }}>&larr; Back to Store</Link>

        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Deposit USDT</h1>
        <p style={{ fontSize: 13, color: "#888", marginBottom: 24 }}>Balance: <strong style={{ color: "#3ea136" }}>${user.balance.toFixed(2)}</strong></p>

        {/* STEP 1: Select network + amount */}
        {step === "select" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Network */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#555" }}>Network</label>
              <select
                value={selectedNetwork}
                onChange={e => setSelectedNetwork(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #ddd", fontSize: 14, background: "#fff" }}
              >
                <option value="">Select network...</option>
                {NETWORKS.map(n => (
                  <option key={n.id} value={n.id}>{n.label}</option>
                ))}
              </select>
            </div>

            {/* Amount */}
            {selectedNetwork && (
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#555" }}>Amount (USDT)</label>
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    step="0.01"
                    min={network?.minDeposit}
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder={network ? `${network.minDeposit}.00` : "0.00"}
                    style={{ width: "100%", padding: "10px 60px 10px 12px", borderRadius: 6, border: "1px solid #ddd", fontSize: 16, fontWeight: 600, boxSizing: "border-box" }}
                  />
                  <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#888" }}>USDT</span>
                </div>
                {network && <p style={{ fontSize: 11, color: "#888", marginTop: 4 }}>Minimum: {network.minDeposit} USDT</p>}
              </div>
            )}

            {/* Error */}
            {errMsg && (
              <div style={{ padding: 10, borderRadius: 6, background: "#fce4ec", color: "#c62828", fontSize: 13, marginBottom: 8 }}>{errMsg}</div>
            )}

            {/* Submit */}
            {selectedNetwork && amount && parseFloat(amount) >= (network?.minDeposit || 0) && (
              <button
                onClick={handleCreate}
                disabled={loading}
                style={{ padding: "12px 0", borderRadius: 6, border: "none", background: "#3ea136", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                {loading ? "Creating..." : "Continue"}
              </button>
            )}
          </div>
        )}

        {/* STEP 2: Payment details */}
        {step === "payment" && result && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Exact amount */}
            <div style={{ background: "#111", borderRadius: 8, padding: "20px 16px", textAlign: "center" }}>
              <p style={{ fontSize: 11, color: "#888", marginBottom: 6, textTransform: "uppercase" }}>Send exactly</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: "#00d4aa", fontFamily: "monospace", margin: 0 }}>{result.exactAmount} USDT</p>
              <button
                onClick={() => copy(String(result.exactAmount), "amount")}
                style={{ marginTop: 10, padding: "5px 14px", borderRadius: 4, border: "1px solid #333", background: copied === "amount" ? "#3ea136" : "transparent", color: copied === "amount" ? "#fff" : "#aaa", fontSize: 11, cursor: "pointer" }}
              >
                {copied === "amount" ? "Copied" : "Copy amount"}
              </button>
            </div>

            {/* Warning */}
            <div style={{ fontSize: 12, color: "#d32f2f", fontWeight: 700, background: "#fff3e0", padding: 10, borderRadius: 6, lineHeight: 1.5 }}>
              Send the exact amount shown above
            </div>

            {/* QR */}
            <div style={{ textAlign: "center" }}>
              <div style={{ position: "relative", display: "inline-block", width: 180, height: 180 }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(result.walletAddress)}`}
                  alt="QR Code"
                  style={{ width: 180, height: 180, borderRadius: 6, border: "1px solid #eee", display: "block" }}
                />
                {/* USDT logo overlay in center — purely visual, does not affect QR scanning */}
                <div style={{
                  position: "absolute", top: "50%", left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 36, height: 36, borderRadius: 6,
                  background: "#fff", display: "flex",
                  alignItems: "center", justifyContent: "center",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                }}>
                  <svg width="28" height="28" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="16" cy="16" r="16" fill="#26A17B"/>
                    <path fill="#FFF" d="M17.922 17.383v-.002c-.11.008-.677.042-1.942.042-1.01 0-1.721-.03-1.971-.042v.003c-3.888-.171-6.79-.848-6.79-1.658 0-.809 2.902-1.486 6.79-1.66v2.644c.254.018.982.061 1.988.061 1.207 0 1.812-.05 1.925-.06v-2.643c3.88.173 6.775.85 6.775 1.658 0 .81-2.895 1.485-6.775 1.657m0-3.59v-2.366h5.414V7.819H8.595v3.608h5.414v2.365c-4.4.202-7.709 1.074-7.709 2.118 0 1.044 3.309 1.915 7.709 2.118v7.582h3.913v-7.584c4.393-.202 7.694-1.073 7.694-2.116 0-1.043-3.301-1.914-7.694-2.117"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Wallet address */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "#555" }}>Wallet Address</label>
              <div style={{ display: "flex", gap: 6 }}>
                <div style={{ flex: 1, padding: "8px 10px", background: "#f5f5f5", borderRadius: 4, fontFamily: "monospace", fontSize: 11, wordBreak: "break-all", lineHeight: 1.4, border: "1px solid #e0e0e0" }}>
                  {result.walletAddress}
                </div>
                <button
                  onClick={() => copy(result.walletAddress, "address")}
                  style={{ padding: "8px 12px", borderRadius: 4, border: "1px solid #ddd", background: copied === "address" ? "#3ea136" : "#fff", color: copied === "address" ? "#fff" : "#333", cursor: "pointer", fontSize: 12, fontWeight: 500 }}
                >
                  {copied === "address" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            {/* Confirm button → goes to txHash step */}
            <button
              onClick={() => setStep("verify")}
              style={{ padding: "12px 0", borderRadius: 6, border: "none", background: "#3ea136", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              I sent the payment
            </button>
          </div>
        )}

        {/* STEP 3: Paste transaction ID */}
        {step === "verify" && result && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#555" }}>Transaction ID</label>
              <input
                type="text"
                value={txHash}
                onChange={e => setTxHash(e.target.value)}
                placeholder="Paste your transaction ID here..."
                style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #ddd", fontSize: 13, fontFamily: "monospace", boxSizing: "border-box" }}
              />
              <p style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
                Paste your Transaction id to verify your payment
              </p>
            </div>

            {verifyMsg && (
              <div style={{ fontSize: 13, color: verifyMsg.includes("already been used") || verifyMsg.includes("error") || verifyMsg.includes("Failed") || verifyMsg.includes("did not match") ? "#e53e3e" : "#3ea136", padding: 10, borderRadius: 6, background: verifyMsg.includes("already been used") || verifyMsg.includes("error") || verifyMsg.includes("Failed") || verifyMsg.includes("did not match") ? "#fce4ec" : "#e8f5e9", lineHeight: 1.5 }}>
                {verifyMsg}
              </div>
            )}
            {verifyLoading && (
              <div style={{ fontSize: 12, color: "#1976d2", padding: 10, borderRadius: 6, background: "#e3f2fd", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ display: "inline-block", width: 16, height: 16, border: "2px solid #1976d2", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                Verifying on blockchain... This may take a moment.
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setStep("payment")} style={{ flex: 1, padding: "12px 0", borderRadius: 6, border: "1px solid #ddd", background: "#fff", fontSize: 13, cursor: "pointer" }}>Back</button>
              <button
                onClick={handleVerify}
                disabled={!txHash.trim() || verifyLoading}
                style={{ flex: 2, padding: "12px 0", borderRadius: 6, border: "none", background: !txHash.trim() ? "#ccc" : "#3ea136", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                {verifyLoading ? "Submitting..." : "Confirm Deposit"}
              </button>
            </div>

            <button
              onClick={() => window.location.href = '/?page=support'}
              style={{ width: '100%', padding: '10px 0', borderRadius: 6, border: '1px solid #1976d2', background: '#e3f2fd', color: '#1976d2', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: '#1976d2' }}><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
              Contact Support — Need help with payment?
            </button>
          </div>
        )}

        {/* STEP 4: Done */}
        {step === "done" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 60, height: 60, borderRadius: 30, background: "#e8f5e9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <span style={{ fontSize: 28, color: "#3ea136" }}>&#10003;</span>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "#3ea136" }}>Payment Verified!</h2>
            <p style={{ fontSize: 13, color: "#666", marginBottom: 8, lineHeight: 1.5 }}>{verifyMsg}</p>
            {result && (
              <div style={{ background: "#f9f9f9", borderRadius: 6, padding: 12, marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: "#888" }}>Transaction</div>
                <div style={{ fontSize: 11, fontFamily: "monospace", wordBreak: "break-all", color: "#333" }}>{txHash}</div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 6 }}>Network</div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{result.networkLabel}</div>
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <Link href="/" style={{ flex: 1, display: "block", textAlign: "center", padding: "12px 0", borderRadius: 6, border: "1px solid #ddd", background: "#fff", fontSize: 13, textDecoration: "none", color: "#333" }}>Back to Store</Link>
              <button onClick={() => { setStep("select"); setAmount(""); setTxHash(""); setVerifyMsg(""); setResult(null); }} style={{ flex: 1, padding: "12px 0", borderRadius: 6, border: "none", background: "#3ea136", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Deposit More</button>
            </div>
          </div>
        )}

        {/* Deposit History */}
        {step === "select" && history.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Recent Deposits</h3>
            <div style={{ borderRadius: 6, border: "1px solid #e0e0e0", overflow: "hidden" }}>
              {history.slice(0, 5).map((d: any) => (
                <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderBottom: "1px solid #f0f0f0" }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{d.exactAmount || d.amount} USDT</span>
                    <span style={{ fontSize: 11, color: "#888", marginLeft: 8 }}>{d.network?.toUpperCase() || d.method}</span>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 10, textTransform: "capitalize",
                    background: d.status === "completed" ? "#e8f5e9" : d.status === "verifying" ? "#fff3e0" : d.status === "rejected" ? "#fce4ec" : "#f5f5f5",
                    color: d.status === "completed" ? "#3ea136" : d.status === "verifying" ? "#ff9800" : d.status === "rejected" ? "#e53e3e" : "#888",
                  }}>{d.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
