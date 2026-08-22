import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

function generateReferralCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "REF-";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function requireUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

// GET - get referral code and stats
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Auto-generate referral code if not set
  if (!user.referralCode) {
    const code = generateReferralCode();
    await prisma.user.update({ where: { id: user.id }, data: { referralCode: code } });
    return NextResponse.json({ code, totalReferrals: 0, totalEarnings: 0 });
  }

  const referralCount = await prisma.user.count({ where: { referredById: user.id } });

  return NextResponse.json({
    code: user.referralCode,
    totalReferrals: referralCount,
    totalEarnings: user.referralEarnings,
  });
}

// POST - apply a referral code
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await req.json();
  if (!code) return NextResponse.json({ error: "Referral code required" }, { status: 400 });

  // Can't refer yourself
  if (user.referredById) {
    return NextResponse.json({ error: "You already have a referral assigned" }, { status: 400 });
  }

  const referrer = await prisma.user.findFirst({ where: { referralCode: code } });
  if (!referrer) return NextResponse.json({ error: "Invalid referral code" }, { status: 404 });
  if (referrer.id === user.id) return NextResponse.json({ error: "Cannot use your own referral code" }, { status: 400 });

  await prisma.user.update({
    where: { id: user.id },
    data: { referredById: referrer.id },
  });

  // Give referrer a signup bonus (read from settings)
  const bonusSetting = await prisma.setting.findUnique({ where: { key: "referral_bonus_amount" } });
  const referralEnabled = await prisma.setting.findUnique({ where: { key: "referral_enabled" } });
  if (referralEnabled && referralEnabled.value === "false") {
    return NextResponse.json({ error: "Referral program is currently disabled" }, { status: 400 });
  }
  const bonusAmount = parseFloat(bonusSetting?.value || "1");
  await prisma.user.update({
    where: { id: referrer.id },
    data: { referralEarnings: { increment: bonusAmount }, balance: { increment: bonusAmount } },
  });

  await prisma.transaction.create({
    data: { type: "referral_bonus", amount: bonusAmount, description: `Referral bonus for referring @${user.username}`, userId: referrer.id },
  });

  await prisma.notification.create({
    data: { title: "Referral Bonus!", message: `$${bonusAmount} earned for referring @${user.username}`, type: "success", userId: referrer.id },
  });

  return NextResponse.json({ success: true, message: "Referral applied!" });
}
