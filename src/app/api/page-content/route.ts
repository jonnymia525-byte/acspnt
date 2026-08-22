import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

const DEFAULT_CONTENT: Record<string, any> = {
  faq: {
    title: "FAQ",
    items: [
      { q: "How do I buy?", a: "Browse listings, click Buy, confirm your order. Accounts are delivered instantly." },
      { q: "How do I deposit?", a: "Dashboard > Deposit. Select USDT network (TRC20/BEP20/ERC20), send exact amount. Verified automatically." },
      { q: "Return policy?", a: "Open a dispute within 48 hours if the account is invalid. Admin team reviews within 24h." },
      { q: "Payment methods?", a: "USDT (TRC20, BEP20, ERC20). More crypto options coming soon." },
      { q: "How to become a seller?", a: "Click Become a Seller, fill details, describe products. Reviewed within 24-48h." },
      { q: "Commission?", a: "Platform commission on all sales. Check Settings for current rate." },
      { q: "Withdrawal processing?", a: "Crypto 5-60 min. PayPal 24-48h. Bank 3-5 business days." },
      { q: "Account disabled after purchase?", a: "Open a dispute within 48h with evidence. Refund or replacement arranged." },
      { q: "Coupons?", a: "Enter code at checkout. Percentage or fixed amount. Min order may apply." },
      { q: "How does 2FA work?", a: "Enable in dashboard. TOTP authenticator app. 10 backup codes provided." },
      { q: "Supported platforms?", a: "14 platforms: Instagram, Facebook, Telegram, X, TikTok, LinkedIn, Gmail, Outlook, Discord, Reddit, YouTube, Pinterest, Snapchat." },
      { q: "Vendor ratings?", a: "After purchase, leave 1-5 star review. Vendors below 3.0 may be suspended." },
    ],
  },
  terms: {
    title: "Terms of Use",
    items: [
      { t: "Account Authenticity", d: "All accounts must be legitimate. Stolen or hacked accounts are prohibited. Violations result in permanent ban." },
      { t: "Listing Standards", d: "Titles must be accurate. Platform, category, and stock must match reality. Misleading listings will be removed." },
      { t: "Buyer Protection", d: "48-hour dispute window on all purchases. Report issues with evidence. Late disputes may not qualify." },
      { t: "Commission & Fees", d: "Platform commission on all sales. Withdrawal fees vary by method. No hidden charges." },
      { t: "Vendor Responsibilities", d: "Maintain 3.0+ star rating. Consistent quality and timely delivery required." },
      { t: "Prohibited Activities", d: "Stolen accounts, fake reviews, price manipulation are strictly prohibited. Permanent ban on violation." },
      { t: "Withdrawal Policy", d: "Min $5-$100 depending on method. Crypto 5-60 min. PayPal 24-48h. Bank 3-5 days." },
      { t: "Dispute Resolution", d: "Reviewed within 24h. Both parties contacted for evidence. Decision is final." },
    ],
  },
  seller_terms: {
    title: "Seller Terms & Conditions",
    items: [
      { t: "Vendor Eligibility", d: "Must be 18+ with valid identity. Only original accounts allowed." },
      { t: "Product Quality", d: "All accounts must be working and as described. Fake or recycled accounts result in suspension." },
      { t: "Pricing", d: "Vendors set their own prices. Platform commission applies on each sale." },
      { t: "Payouts", d: "Earnings available for withdrawal after order completion. Minimum payout varies." },
      { t: "Ratings", d: "Maintain 3.0+ average rating. Accounts with repeated complaints may be delisted." },
    ],
  },
  about: {
    title: "About AccsPoint",
    content: "AccsPoint is a premium accounts marketplace connecting buyers with verified vendors across 14+ social media and email platforms. We offer buyer protection, instant delivery, and 24/7 support.",
  },
};

// GET - public page content
export async function GET(req: Request) {
  const url = new URL(req.url);
  const page = url.searchParams.get("page") || "faq";

  const setting = await prisma.setting.findUnique({ where: { key: `page_${page}` } });
  if (setting) {
    try {
      const content = JSON.parse(setting.value);
      return NextResponse.json({ page, content, editable: false });
    } catch {}
  }

  const defaultContent = DEFAULT_CONTENT[page];
  if (!defaultContent) return NextResponse.json({ error: "Page not found" }, { status: 404 });

  return NextResponse.json({ page, content: defaultContent, editable: false });
}
