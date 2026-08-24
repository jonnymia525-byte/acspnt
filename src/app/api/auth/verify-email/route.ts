import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();
    if (!email || !code) {
      return NextResponse.json({ error: "Email and code required" }, { status: 400 });
    }

    const reset = await prisma.passwordReset.findFirst({
      where: { token: String(code), used: false, expiresAt: { gt: new Date() }, user: { email } },
      include: { user: true },
    });

    if (!reset) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
    }

    await prisma.user.update({ where: { id: reset.userId }, data: { emailVerified: true } });
    await prisma.passwordReset.update({ where: { id: reset.id }, data: { used: true } });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
