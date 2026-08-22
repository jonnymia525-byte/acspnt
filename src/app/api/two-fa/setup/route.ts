import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateTotpSecret, qrCodeUrl } from "@/lib/totp";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (user.twoFaEnabled) {
    return NextResponse.json({ error: "2FA already enabled" }, { status: 400 });
  }

  const secret = generateTotpSecret();
  const qr = qrCodeUrl(secret, user.username);

  // Store secret temporarily (will be confirmed on enable)
  await prisma.setting.upsert({
    where: { key: `2fa_pending_${userId}` },
    update: { value: secret },
    create: { key: `2fa_pending_${userId}`, value: secret },
  });

  return NextResponse.json({ secret, qrUrl: qr });
}
