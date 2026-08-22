import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyTotp, hashBackupCode } from "@/lib/totp";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code, backupCode } = await req.json();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.twoFaEnabled || !user.twoFaSecret) {
    return NextResponse.json({ error: "2FA not enabled" }, { status: 400 });
  }

  let verified = false;
  if (backupCode && user.backupCodes) {
    const hashed = await hashBackupCode(backupCode);
    try {
      const codes: string[] = JSON.parse(user.backupCodes);
      if (codes.includes(hashed)) {
        verified = true;
        await prisma.user.update({ where: { id: userId }, data: { backupCodes: JSON.stringify(codes.filter((c) => c !== hashed)) } });
      }
    } catch {}
  } else if (code) {
    verified = await verifyTotp(user.twoFaSecret, code);
  }

  if (!verified) return NextResponse.json({ error: "Invalid code" }, { status: 401 });

  await prisma.user.update({ where: { id: userId }, data: { twoFaEnabled: false, twoFaSecret: null, backupCodes: null } });
  return NextResponse.json({ success: true });
}
