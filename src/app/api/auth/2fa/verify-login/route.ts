import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyTotp, hashBackupCode } from "@/lib/totp";
import { cookies } from "next/headers";

// Rate limit (in-memory + Setting table)
const rateLimits = new Map<string, { count: number; firstAt: number }>();

async function checkRateLimit(userId: string): Promise<{ allowed: boolean; retryAfter?: number }> {
  const key = userId;
  const now = Date.now();
  const window = 5 * 60 * 1000; // 5 min
  const maxAttempts = 5;

  // Check in-memory first
  let rl = rateLimits.get(key);

  // If not in memory, try DB
  if (!rl) {
    const setting = await prisma.setting.findUnique({ where: { key: `accsm_2fa_rl_${key}` } });
    if (setting) {
      try {
        rl = JSON.parse(setting.value);
        rateLimits.set(key, rl!);
      } catch {}
    }
  }

  if (rl && now - rl.firstAt < window) {
    if (rl.count >= maxAttempts) {
      const retryAfter = Math.ceil((rl.firstAt + window - now) / 60000);
      return { allowed: false, retryAfter };
    }
    rl.count++;
  } else {
    rl = { count: 1, firstAt: now };
    rateLimits.set(key, rl);
  }

  // Persist
  try {
    await prisma.setting.upsert({
      where: { key: `accsm_2fa_rl_${key}` },
      update: { value: JSON.stringify(rl) },
      create: { key: `accsm_2fa_rl_${key}`, value: JSON.stringify(rl) },
    });
  } catch {}

  return { allowed: true };
}

export async function POST(req: Request) {
  try {
    const { userId, code, backupCode } = await req.json();
    if (!userId || (!code && !backupCode)) {
      return NextResponse.json({ error: "Code required" }, { status: 400 });
    }

    // Rate limit
    const rl = await checkRateLimit(userId);
    if (!rl.allowed) {
      return NextResponse.json({ error: `Too many attempts. Try again in ${rl.retryAfter} minute(s).`, retryAfter: rl.retryAfter }, { status: 429 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFaEnabled || !user.twoFaSecret) {
      return NextResponse.json({ error: "2FA not enabled" }, { status: 400 });
    }

    let verified = false;

    if (backupCode && user.backupCodes) {
      // Check backup codes
      const hashedInput = await hashBackupCode(backupCode);
      try {
        const codes: string[] = JSON.parse(user.backupCodes);
        if (codes.includes(hashedInput)) {
          verified = true;
          // Remove used backup code
          const updatedCodes = codes.filter((c) => c !== hashedInput);
          await prisma.user.update({ where: { id: userId }, data: { backupCodes: JSON.stringify(updatedCodes) } });
        }
      } catch {}
    } else if (code) {
      verified = await verifyTotp(user.twoFaSecret, code);
    }

    if (!verified) return NextResponse.json({ error: "Invalid code" }, { status: 401 });

    // Clear rate limit
    rateLimits.delete(userId);
    try { await prisma.setting.delete({ where: { key: `accsm_2fa_rl_${userId}` } }); } catch {}

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set("accsm_user_id", user.id, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 30 * 24 * 60 * 60 });

    await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
    await prisma.activityLog.create({ data: { action: "login_2fa", description: `User ${user.username} logged in with 2FA`, userId: user.id } });

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, username: user.username, name: user.name, role: user.role, balance: user.balance, vendorStatus: user.vendorStatus },
    });
  } catch (err) {
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
