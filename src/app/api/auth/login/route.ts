import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcryptjs from "bcryptjs";
import { cookies } from "next/headers";

// Simple in-memory rate limiter: max 5 attempts per IP per 15 minutes
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "Too many login attempts. Please try again in 15 minutes." }, { status: 429 });
    }

    const { username, password, captchaAnswer, captchaHash } = await req.json();
    if (!username || !password) return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    // Enforce max length to prevent DoS via huge payloads
    if (username.length > 100 || password.length > 200) {
      return NextResponse.json({ error: "Input too long" }, { status: 400 });
    }

    // Find user by username or email
    const user = await prisma.user.findFirst({
      where: { OR: [{ username }, { email: username }] },
    });
    if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    // Check password
    const valid = await bcryptjs.compare(password, user.password);
    if (!valid) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    // Check blocked
    if (user.blocked) return NextResponse.json({ error: "Account is blocked" }, { status: 403 });

    // 2FA check
    if (user.twoFaEnabled) {
      return NextResponse.json({ twoFaRequired: true, userId: user.id, username: user.username });
    }

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set("accsm_user_id", user.id, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 30 * 24 * 60 * 60 });

    // Update last login
    await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

    // Log activity
    await prisma.activityLog.create({ data: { action: "login", description: `User ${user.username} logged in`, userId: user.id } });

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, username: user.username, name: user.name, role: user.role, balance: user.balance, vendorStatus: user.vendorStatus },
    });
  } catch (err) {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
