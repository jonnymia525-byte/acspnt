import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcryptjs from "bcryptjs";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { username, password, captchaAnswer, captchaHash } = await req.json();
    if (!username || !password) return NextResponse.json({ error: "Username and password required" }, { status: 400 });

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
    cookieStore.set("accsm_user_id", user.id, { httpOnly: true, path: "/", maxAge: 30 * 24 * 60 * 60 });

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
