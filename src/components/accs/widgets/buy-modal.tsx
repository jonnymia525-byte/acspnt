"use client";

import Link from "next/link";

import { useState } from "react";
import { User } from "@/store";
import { money } from "@/lib/money";

interface Vendor {
  id: string; username: string; vendorCountry?: string; vendorStatus?: string;
}

interface Product {
  id: string; title: string; platform: string; category: string;
  vendorPrice: number; storePrice: number; stock: number; status: string;
  deliveryFormat: string; countryRegister: string; originalMail: boolean;
  country: string; vendor: Vendor;
}

interface Listing {
  id: string; title: string; platform: string; category: string;
  deliveryFormat: string; countryRegister: string; originalMail: boolean;
  country: string; products: Product[];
}

export function BuyModal({ listing, user, onClose }: { listing: Listing; user: User | null; onClose: () => void }) {
  const [step, setStep] = useState<"login" | "select" | "form" | "processing" | "done">(!user ? "login" : "select");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState<{ code: string; discount: number; type: string; value: number } | null>(null);
  const [accounts, setAccounts] = useState("");
  const [newBalance, setNewBalance] = useState(0);
  const [error, setError] = useState("");

  // Sort products by price (lowest first), only show approved with stock > 0
  const availableProducts = listing.products
    .filter(p => p.status === "approved" && p.stock > 0)
    .sort((a, b) => a.storePrice - b.storePrice);

  const product = selectedProduct;
  const subtotal = product ? product.storePrice * quantity : 0;
  const discount = couponApplied
    ? couponApplied.type === "percentage" ? subtotal * (couponApplied.value / 100) : Math.min(couponApplied.value, subtotal)
    : 0;
  const total = subtotal - discount;

  const applyCoupon = async () => {
    if (!coupon.trim()) return;
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: coupon, subtotal }),
      });
      const data = await res.json();
      if (data.valid) setCouponApplied({ code: data.code, discount: data.discount, type: data.type, value: data.value });
      else { setError(data.error || "Invalid coupon"); setCouponApplied(null); }
    } catch { setError("Failed to validate coupon"); }
  };

  const confirmPurchase = async () => {
    if (!product) return;
    setStep("processing"); setError("");
    try {
      const res = await fetch("/api/products/buy", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, quantity, couponCode: couponApplied?.code || null }),
      });
      const data = await res.json();
      if (data.success) { setAccounts(data.accounts || ""); setNewBalance(data.newBalance || 0); setStep("done"); }
      else if (data.code === "deposit_required") { setError(`Insufficient balance. You need ${money(total)} but have ${money(data.balance || 0)}.`); setStep("form"); }
      else { setError(data.error || "Purchase failed"); setStep("form"); }
    } catch { setError("Network error"); setStep("form"); }
  };

  const selectVendor = (p: Product) => {
    setSelectedProduct(p);
    setQuantity(1);
    setStep("form");
  };

  return (
    <div className="modal-bg" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        {step === "login" && (
          <div style={{ textAlign: "center", padding: "32px 16px" }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>Login Required</div>
            <p style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>You need to log in to purchase products.</p>
            <Link href="/?page=login" className="btn btn-primary" style={{ padding: "8px 24px" }}>Go to Login</Link>
          </div>
        )}

        {/* VENDOR SELECTION */}
        {step === "select" && (
          <>
            <div className="modal-head">
              <span style={{ fontWeight: 600 }}>Select Vendor</span>
              <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#888" }}>x</button>
            </div>
            <div className="modal-body">
              <div style={{ padding: 10, background: "#f9f9f9", borderRadius: 6, marginBottom: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{listing.title}</div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                  {listing.category} · {listing.countryRegister || "Global"} · {listing.deliveryFormat}
                  {listing.originalMail && " · Email included"}
                </div>
              </div>

              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "#555" }}>
                {availableProducts.length} vendor{availableProducts.length !== 1 ? "s" : ""} available:
              </div>

              {availableProducts.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", color: "#888", fontSize: 13 }}>No vendors currently have stock for this product.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {availableProducts.map(p => (
                    <div key={p.id} onClick={() => selectVendor(p)}
                      style={{
                        padding: "10px 12px", border: "1px solid #e0e0e0", borderRadius: 6,
                        cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                        transition: "border-color 0.15s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = "#3ea136")}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = "#e0e0e0")}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{p.vendor.username}</div>
                        <div style={{ fontSize: 11, color: "#888" }}>
                          {p.stock} in stock
                          {p.vendor.vendorCountry && p.vendor.vendorCountry !== "Global" && ` · ${p.vendor.vendorCountry}`}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#3ea136" }}>{money(p.storePrice)}</div>
                        <div style={{ fontSize: 10, color: "#888" }}>per account</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* PURCHASE FORM */}
        {step === "form" && product && (
          <>
            <div className="modal-head">
              <span style={{ fontWeight: 600 }}>Buy from {product.vendor.username}</span>
              <button onClick={() => setStep("select")} style={{ background: "none", border: "none", fontSize: 12, cursor: "pointer", color: "#3ea136" }}>&larr; Change vendor</button>
              <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#888", marginLeft: 8 }}>x</button>
            </div>
            <div className="modal-body">
              <div style={{ padding: 10, background: "#f9f9f9", borderRadius: 6, marginBottom: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{listing.title}</div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
                  Vendor: {product.vendor.username} · Stock: {product.stock} · Price: {money(product.storePrice)} each
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label className="label">Quantity</label>
                <input type="number" min={1} max={product.stock} value={quantity}
                  onChange={e => setQuantity(Math.max(1, Math.min(product.stock, parseInt(e.target.value) || 1)))} className="input" />
                <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>Max: {product.stock} accounts</div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label className="label">Coupon Code</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="text" value={coupon} onChange={e => setCoupon(e.target.value.toUpperCase())} placeholder="SAVE10" className="input" style={{ flex: 1 }} />
                  <button onClick={applyCoupon} className="btn btn-secondary btn-sm">Apply</button>
                </div>
                {couponApplied && (
                  <div style={{ fontSize: 11, color: "#3ea136", marginTop: 4 }}>
                    Applied: {couponApplied.code} (-{couponApplied.type === "percentage" ? `${couponApplied.value}%` : money(couponApplied.value)})
                  </div>
                )}
              </div>

              {error && <div style={{ fontSize: 12, color: "#e53e3e", background: "#fee2e2", padding: 8, borderRadius: 6, marginBottom: 12 }}>{error}</div>}

              <div style={{ borderTop: "1px solid #eee", paddingTop: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: "#888" }}>Subtotal ({quantity}x)</span><span>{money(subtotal)}</span>
                </div>
                {couponApplied && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#3ea136", marginBottom: 4 }}>
                    <span>Discount</span><span>-{money(discount)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 15, borderTop: "1px solid #eee", paddingTop: 8 }}>
                  <span>Total</span><span style={{ color: "#3ea136" }}>{money(total)}</span>
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button onClick={confirmPurchase} className="btn btn-primary" style={{ width: "100%" }}>
                Confirm Purchase — {money(total)}
              </button>
            </div>
          </>
        )}

        {step === "processing" && (
          <div style={{ textAlign: "center", padding: "32px 16px" }}>
            <div style={{ fontSize: 14, color: "#888" }}>Processing...</div>
          </div>
        )}

        {step === "done" && (
          <>
            <div className="modal-head">
              <span style={{ fontWeight: 600 }}>Order Complete</span>
              <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#888" }}>x</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>Delivered Accounts:</div>
                <pre style={{ fontSize: 12, background: "#111", color: "#3ea136", padding: 12, borderRadius: 6, overflowX: "auto", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
                  {accounts}
                </pre>
                <button className="btn btn-secondary btn-sm" style={{ width: "100%", marginTop: 8 }}
                  onClick={() => navigator.clipboard.writeText(accounts)}>
                  Copy Accounts
                </button>
              </div>
              <div style={{ fontSize: 13, marginBottom: 12 }}>
                New balance: <strong style={{ color: "#3ea136" }}>{money(newBalance)}</strong>
              </div>
              <Link href={`/?page=${user?.role === "vendor" ? "vendor-dashboard" : "user-dashboard"}`} className="btn btn-primary" style={{ width: "100%", textAlign: "center" }}>
                View in Dashboard
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
