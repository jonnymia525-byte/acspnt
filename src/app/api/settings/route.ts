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

// GET - public site settings (no auth required)
export async function GET() {
  const settings = await prisma.setting.findMany();
  const settingsMap: Record<string, string> = { ...DEFAULT_SETTINGS };
  for (const s of settings) {
    settingsMap[s.key] = s.value;
  }

  return NextResponse.json({ settings: settingsMap });
}
