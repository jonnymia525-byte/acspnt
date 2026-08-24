import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcryptjs from "bcryptjs";
import { sendEmail } from "@/lib/send-email";

function makeCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function getSetting(key: string, fallback: string): Promise<string> {
  const setting = await prisma.setting.findUnique({ where: { key } });
  return setting?.value ?? fallback;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body.action;

    if (action === "request") {
      const { email } = body;
      if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        const code = makeCode();
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
        await prisma.passwordReset.upsert({
          where: { userId: user.id },
          update: { token: code, expiresAt, used: false },
          create: { userId: user.id, token: code, expiresAt, used: false },
        });
        try {
          await sendEmail({
            to: user.email,
            templateKey: "password_reset",
            vars: { user_name: user.username, reset_link: "", code },
            userId: user.id,
          });
        } catch {}
      }
      // Always succeed so we don't reveal whether the email exists
      return NextResponse.json({ success: true });
    }

    if (action === "verify") {
      const { email, code } = body;
      if (!email || !code) return NextResponse.json({ error: "Email and code required" }, { status: 400 });

      const reset = await prisma.passwordReset.findFirst({
        where: { token: String(code), used: false, expiresAt: { gt: new Date() }, user: { email } },
        include: { user: true },
      });
      if (!reset) {
        // Don't reveal the userId on a bad code
        return NextResponse.json({ success: false, error: "Invalid or expired code" }, { status: 400 });
      }
      return NextResponse.json({ success: true, userId: reset.userId });
    }

    if (action === "reset") {
      const { userId, code, newPassword } = body;
      if (!userId || !code || !newPassword) {
        return NextResponse.json({ error: "userId, code, and newPassword required" }, { status: 400 });
      }
      if (newPassword.length > 128) return NextResponse.json({ error: "Password too long" }, { status: 400 });

      // Server-side password strength (from settings)
      const minLength = parseInt(await getSetting("min_password_length", "8"), 10) || 8;
      const requireSpecial = (await getSetting("require_special_char", "false")) === "true";
      if (newPassword.length < minLength) {
        return NextResponse.json({ error: `Password must be at least ${minLength} characters` }, { status: 400 });
      }
      if (!/[0-9]/.test(newPassword)) {
        return NextResponse.json({ error: "Password must contain at least one number" }, { status: 400 });
      }
      if (!/[A-Z]/.test(newPassword)) {
        return NextResponse.json({ error: "Password must contain at least one uppercase letter" }, { status: 400 });
      }
      if (requireSpecial && !/[^A-Za-z0-9]/.test(newPassword)) {
        return NextResponse.json({ error: "Password must contain at least one special character" }, { status: 400 });
      }

      const reset = await prisma.passwordReset.findFirst({
        where: { userId, token: String(code), used: false, expiresAt: { gt: new Date() } },
      });
      if (!reset) return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });

      const hashed = await bcryptjs.hash(newPassword, 10);
      await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
      await prisma.passwordReset.update({ where: { id: reset.id }, data: { used: true } });

      const user = await prisma.user.findUnique({ where: { id: userId } });
      try {
        if (user) {
          await sendEmail({ to: user.email, templateKey: "password_changed", vars: { user_name: user.username }, userId: user.id });
        }
      } catch {}

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
