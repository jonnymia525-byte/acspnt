import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcryptjs from "bcryptjs";
import { sendEmail } from "@/lib/send-email";

// Rate limit: max 3 signups per IP per hour
const signupAttempts = new Map<string, { count: number; resetAt: number }>();
function checkSignupRate(ip: string): boolean {
  const now = Date.now();
  const entry = signupAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    signupAttempts.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 3) return false;
  entry.count++;
  return true;
}

async function getSetting(key: string, fallback: string): Promise<string> {
  const setting = await prisma.setting.findUnique({ where: { key } });
  return setting?.value ?? fallback;
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
    if (!checkSignupRate(ip)) {
      return NextResponse.json({ error: "Too many registration attempts. Please try again later." }, { status: 429 });
    }

    const { username, email, password, confirmPassword, contactMethod, contactDetail, country, terms, captchaAnswer, captchaA, captchaB } = await req.json();

    if (!username || !email || !password) {
      return NextResponse.json({ error: "Username, email, and password required" }, { status: 400 });
    }
    if (!terms) return NextResponse.json({ error: "You must accept the terms" }, { status: 400 });

    // Server-side captcha check
    if (captchaAnswer == null || captchaA == null || captchaB == null || Number(captchaAnswer) !== Number(captchaA) + Number(captchaB)) {
      return NextResponse.json({ error: "Invalid captcha" }, { status: 400 });
    }

    if (password.length > 128) return NextResponse.json({ error: "Password too long" }, { status: 400 });
    if (password !== confirmPassword) return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });

    // Server-side password strength (from settings)
    const minLength = parseInt(await getSetting("min_password_length", "8"), 10) || 8;
    const requireSpecial = (await getSetting("require_special_char", "false")) === "true";
    if (password.length < minLength) {
      return NextResponse.json({ error: `Password must be at least ${minLength} characters` }, { status: 400 });
    }
    if (!/[0-9]/.test(password)) {
      return NextResponse.json({ error: "Password must contain at least one number" }, { status: 400 });
    }
    if (!/[A-Z]/.test(password)) {
      return NextResponse.json({ error: "Password must contain at least one uppercase letter" }, { status: 400 });
    }
    if (requireSpecial && !/[^A-Za-z0-9]/.test(password)) {
      return NextResponse.json({ error: "Password must contain at least one special character" }, { status: 400 });
    }

    if (/\s/.test(username) || /@/.test(username)) return NextResponse.json({ error: "Username cannot contain spaces or @" }, { status: 400 });
    if (username.length < 3 || username.length > 30) return NextResponse.json({ error: "Username must be 3-30 characters" }, { status: 400 });
    if (email.length > 254) return NextResponse.json({ error: "Email too long" }, { status: 400 });

    // Check duplicates
    const existing = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] } });
    if (existing) return NextResponse.json({ error: existing.username === username ? "Username taken" : "Email already registered" }, { status: 409 });

    const hashed = await bcryptjs.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username, email, password: hashed, name: username,
        role: "buyer", balance: 0, vendorStatus: "none",
        contactMethod: contactMethod || "email", contactDetail: contactDetail || email,
        country: country || null,
        registeredAt: new Date(), registrationIp: req.headers.get("x-forwarded-for") || "unknown",
      },
    });

    await prisma.activityLog.create({ data: { action: "signup", description: `User ${user.username} registered`, userId: user.id } });

    // Email verification toggle
    const emailVerificationRequired = (await getSetting("email_verification_required", "false")) === "true";
    if (emailVerificationRequired) {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await prisma.passwordReset.upsert({
        where: { userId: user.id },
        update: { token: code, expiresAt, used: false },
        create: { userId: user.id, token: code, expiresAt, used: false },
      });
      try {
        await sendEmail({ to: user.email, templateKey: "email_verification", vars: { user_name: user.username, code }, userId: user.id });
      } catch {}
      return NextResponse.json({ success: true, needsVerification: true, emailCode: code });
    }

    // Auto-login (existing behavior)
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    cookieStore.set("accsm_user_id", user.id, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 30 * 24 * 60 * 60 });

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, username: user.username, name: user.name, role: user.role, balance: 0 },
    });
  } catch (err) {
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
