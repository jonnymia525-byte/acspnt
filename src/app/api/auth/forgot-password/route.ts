import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase().trim() },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ success: true, message: "If an account with that email exists, a reset link has been sent." });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store token (upsert in case they request multiple times)
    await prisma.passwordReset.upsert({
      where: { userId: user.id },
      update: { token, expiresAt: expires, used: false },
      create: { userId: user.id, token, expiresAt: expires },
    });

    // In production, send email here. For now, log the reset URL
    const resetUrl = `/?page=reset-password&token=${token}`;
    console.log(`[PASSWORD RESET] ${user.email}: ${resetUrl}`);

    return NextResponse.json({
      success: true,
      message: "If an account with that email exists, a reset link has been sent.",
      // Dev-only: include the URL so admin can test
      ...(process.env.NODE_ENV !== "production" && { resetUrl }),
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
