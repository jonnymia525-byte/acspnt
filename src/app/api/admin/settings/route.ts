import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

async function requireAdmin() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "admin") return null;
  return user;
}

// Default settings with their types
const DEFAULT_SETTINGS: Record<string, string> = {
  site_name: "AccsPoint",
  site_description: "Premium accounts marketplace",
  promotion_notice: "News, promotions, coupons, announcements are published on our news site - accspoint.news",
  support_email: "support@accspoint.com",
  support_telegram: "@accspoint_support",
  min_deposit: "5",
  maintenance_mode: "false",
  registration_enabled: "true",
  vendor_auto_approve: "false",
  order_warranty_hours: "48",
  max_upload_size_mb: "5",
  footer_text: "© 2026 AccsPoint. All rights reserved.",
  primary_color: "#3ea136",
  currency_symbol: "$",
  default_language: "en",
  // Commission settings
  platform_commission_pct: "15",
  vendor_payout_threshold: "50",
  vendor_payout_schedule: "weekly",
  // Rate limiting
  rate_limit_purchase_per_hour: "10",
  rate_limit_deposit_per_day: "20",
  rate_limit_signup_per_ip: "5",
  // SEO
  seo_title: "AccsPoint - Premium Accounts Marketplace",
  seo_description: "Buy and sell premium social media, streaming, and email accounts",
  seo_og_image: "",
  // Referral
  referral_bonus_amount: "1",
  referral_enabled: "true",
};

// GET - fetch all site settings (admin only)
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const settings = await prisma.setting.findMany();
  const settingsMap: Record<string, string> = { ...DEFAULT_SETTINGS };
  for (const s of settings) {
    settingsMap[s.key] = s.value;
  }

  return NextResponse.json({ settings: settingsMap });
}

// POST - update site settings (admin only)
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { settings } = body;

  if (!settings || typeof settings !== "object") {
    return NextResponse.json({ error: "Settings object required" }, { status: 400 });
  }

  // Upsert each setting
  const updates = Object.entries(settings).map(([key, value]) =>
    prisma.setting.upsert({
      where: { key },
      create: { key, value: String(value) },
      update: { value: String(value) },
    })
  );

  await Promise.all(updates);

  await prisma.activityLog.create({
    data: {
      action: "settings_updated",
      description: `Admin updated site settings: ${Object.keys(settings).join(", ")}`,
      userId: admin.id,
    },
  });

  return NextResponse.json({ success: true });
}
