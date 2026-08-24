import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcryptjs from "bcryptjs";
import { cookies } from "next/headers";
import { geoLookup } from "@/lib/geo";

// Rate limiter: max 5 attempts per key per 15 minutes (both IP and username)
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(key: string, maxAttempts = 5): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  if (entry.count >= maxAttempts) return false;
  entry.count++;
  return true;
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "Too many login attempts. Please try again in 15 minutes." }, { status: 429 });
    }

    const { username, password, captchaAnswer, captchaA, captchaB, remember } = await req.json();
    if (!username || !password) return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    // Enforce max length to prevent DoS via huge payloads
    if (username.length > 100 || password.length > 200) {
      return NextResponse.json({ error: "Input too long" }, { status: 400 });
    }

    // Server-side captcha check
    if (captchaAnswer == null || captchaA == null || captchaB == null || Number(captchaAnswer) !== Number(captchaA) + Number(captchaB)) {
      return NextResponse.json({ error: "Invalid captcha" }, { status: 400 });
    }

    // Find user by username or email
    const user = await prisma.user.findFirst({
      where: { OR: [{ username }, { email: username }] },
    });
    if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    // Per-username rate limit (prevents brute-force even with IP rotation)
    if (!checkRateLimit(`user:${user.id}`, 5)) {
      return NextResponse.json({ error: "Too many attempts for this account. Please try again in 15 minutes." }, { status: 429 });
    }

    // Check password
    const valid = await bcryptjs.compare(password, user.password);
    if (!valid) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    // Check blocked
    if (user.blocked) return NextResponse.json({ error: "Account suspended. Contact support." }, { status: 403 });

    // 2FA check
    if (user.twoFaEnabled) {
      return NextResponse.json({ twoFaRequired: true, userId: user.id, username: user.username });
    }

    // Set cookie (30 days if "remember me", otherwise session cookie)
    const cookieStore = await cookies();
    if (remember) {
      cookieStore.set("accsm_user_id", user.id, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 30 * 24 * 60 * 60 });
    } else {
      cookieStore.set("accsm_user_id", user.id, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" });
    }

    // Update last login
    await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

    // Log activity with IP/geo/userAgent
    const userAgent = req.headers.get("user-agent") || "";
    const geo = await geoLookup(ip);
    await prisma.activityLog.create({
      data: {
        action: "login",
        description: `User ${user.username} logged in`,
        userId: user.id,
        ip,
        country: geo?.country || null,
        city: geo?.city || null,
        userAgent,
      },
    });

    // Detect unusual activity: flag if login from new country
    const recentLogins = await prisma.activityLog.findMany({
      where: { userId: user.id, action: "login" },
      select: { country: true, ip: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    const knownCountries = new Set(recentLogins.map(l => l.country).filter(Boolean));
    const isNewCountry = geo?.country && !knownCountries.has(geo.country);
    const knownIps = new Set(recentLogins.map(l => l.ip).filter(Boolean));
    const isNewIp = ip && !knownIps.has(ip);
    const flags: string[] = [];
    if (isNewCountry) flags.push(`New country: ${geo!.country}`);
    if (isNewIp) flags.push(`New IP: ${ip}`);
    if (flags.length > 0) {
      await prisma.activityLog.create({
        data: {
          action: "security",
          description: flags.join(" | "),
          userId: user.id,
          ip,
          country: geo?.country || null,
          city: geo?.city || null,
          userAgent,
        },
      });
    }

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, username: user.username, name: user.name, role: user.role, balance: user.balance, vendorStatus: user.vendorStatus },
    });
  } catch (err) {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
