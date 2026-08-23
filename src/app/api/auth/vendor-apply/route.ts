import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcryptjs from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { firstName, lastName, username, email, password, contactMethod, contactDetail, productDetails, bulk, terms } = await req.json();

    if (!firstName || !lastName || !email || !password || !contactDetail || !productDetails) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    if (productDetails.length < 20 || productDetails.length > 500) {
      return NextResponse.json({ error: "Product details must be 20-500 characters" }, { status: 400 });
    }
    if (!terms) return NextResponse.json({ error: "You must agree to the seller terms" }, { status: 400 });

    // Check existing
    const existing = await prisma.user.findFirst({ where: { OR: [{ username: username || email.split("@")[0] }, { email }] } });
    if (existing) {
      if (existing.vendorStatus === "pending") return NextResponse.json({ error: "Application already pending" }, { status: 409 });
      return NextResponse.json({ error: "Account already exists" }, { status: 409 });
    }

    const hashed = await bcryptjs.hash(password, 10);
    const uname = username || email.split("@")[0];

    const user = await prisma.user.create({
      data: {
        username: uname, email, password: hashed, name: `${firstName} ${lastName}`,
        role: "vendor", balance: 0, vendorStatus: "pending",
        contactMethod: contactMethod || "telegram", contactDetail,
        vendorCountry: "Global", registeredAt: new Date(),
        registrationIp: req.headers.get("x-forwarded-for") || "unknown",
      },
    });

    await prisma.vendorRequest.create({
      data: {
        firstName, lastName, email, productDetails,
        bulk: bulk || false, status: "pending",
        userId: user.id,
      },
    });

    // Set cookie
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    cookieStore.set("accsm_user_id", user.id, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 30 * 24 * 60 * 60 });

    await prisma.activityLog.create({ data: { action: "vendor_request", description: `Vendor application from ${firstName} ${lastName}`, userId: user.id } });

    const { password: _, ...safeUser } = user;
    return NextResponse.json({ success: true, user: safeUser, redirect: "/?page=vendor-dashboard" });
  } catch (err) {
    return NextResponse.json({ error: "Application failed" }, { status: 500 });
  }
}
