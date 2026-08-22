import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyTotp, generateBackupCodes, hashBackupCode } from "@/lib/totp";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await req.json();
  if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.twoFaEnabled) return NextResponse.json({ error: "Already enabled" }, { status: 400 });

  // Get pending secret
  const pending = await prisma.setting.findUnique({ where: { key: `2fa_pending_${userId}` } });
  if (!pending) return NextResponse.json({ error: "No pending 2FA setup. Run setup first." }, { status: 400 });

  const secret = pending.value;

  // Verify the code against the pending secret
  const valid = await verifyTotp(secret, code);
  if (!valid) return NextResponse.json({ error: "Invalid code" }, { status: 401 });

  // Generate backup codes
  const rawCodes = generateBackupCodes();
  const hashedCodes = await Promise.all(rawCodes.map(hashBackupCode));

  // Enable 2FA
  await prisma.user.update({
    where: { id: userId },
    data: { twoFaEnabled: true, twoFaSecret: secret, backupCodes: JSON.stringify(hashedCodes) },
  });

  // Clean up pending
  await prisma.setting.delete({ where: { key: `2fa_pending_${userId}` } }).catch(() => {});

  // Return raw codes once (they won't be shown again)
  return NextResponse.json({ success: true, backupCodes: rawCodes });
}
