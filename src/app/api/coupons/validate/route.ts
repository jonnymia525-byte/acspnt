import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { code, subtotal } = await req.json();
  if (!code) return NextResponse.json({ valid: false, error: "Invalid or expired coupon" });

  const coupon = await prisma.coupon.findUnique({ where: { code: String(code).toUpperCase() } });
  if (!coupon) return NextResponse.json({ valid: false, error: "Invalid or expired coupon" });
  if (!coupon.active) return NextResponse.json({ valid: false, error: "Invalid or expired coupon" });
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return NextResponse.json({ valid: false, error: "Invalid or expired coupon" });
  if (coupon.maxUses !== -1 && coupon.usedCount >= coupon.maxUses) return NextResponse.json({ valid: false, error: "Invalid or expired coupon" });
  if (typeof subtotal !== "number" || subtotal < coupon.minOrder) return NextResponse.json({ valid: false, error: "Invalid or expired coupon" });

  const discount =
    coupon.type === "percentage"
      ? Math.round(subtotal * (coupon.value / 100) * 100) / 100
      : Math.min(coupon.value, subtotal);

  return NextResponse.json({ valid: true, code: coupon.code, type: coupon.type, value: coupon.value, discount });
}