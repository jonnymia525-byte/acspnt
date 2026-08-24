import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_SETTINGS: Record<string, string> = {
  site_name: "AccsPoint",
  site_description: "Premium accounts marketplace",
  promotion_notice: "News, promotions, coupons, announcements are published on our news site - accspoint.news",
  support_email: "support@accspoint.com",
  support_telegram: "@accspoint_support",
  maintenance_mode: "false",
  registration_enabled: "true",
  order_warranty_hours: "48",
  footer_text: "© 2026 AccsPoint. All rights reserved.",
  primary_color: "#3ea136",
  currency_symbol: "$",
};

// Only expose safe, non-sensitive settings to the public
const PUBLIC_KEYS = new Set([
  "site_name", "site_description", "promotion_notice",
  "support_email", "support_telegram", "seller_support_telegram",
  "min_deposit", "order_warranty_hours", "max_upload_size_mb",
  "footer_text", "primary_color", "currency_symbol",
  "default_language", "referral_bonus_amount", "referral_enabled",
  "registration_enabled", "maintenance_mode", "dispute_window_hours",
  "site_logo_url", "cookie_consent_enabled", "search_placeholder",
]);

const PUBLIC_PREFIXES = ["social_", "wallet_", "seo_"];

function isPublicKey(key: string): boolean {
  if (/api_key|smtp|secret|password/i.test(key)) return false;
  if (PUBLIC_KEYS.has(key)) return true;
  return PUBLIC_PREFIXES.some((prefix) => key.startsWith(prefix));
}

// GET - public site settings (no auth required)
export async function GET() {
  const settings = await prisma.setting.findMany();
  const settingsMap: Record<string, string> = { ...DEFAULT_SETTINGS };
  for (const s of settings) {
    if (isPublicKey(s.key)) {
      settingsMap[s.key] = s.value;
    }
  }

  return NextResponse.json({ settings: settingsMap });
}
