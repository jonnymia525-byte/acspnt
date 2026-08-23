import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const disputes = await prisma.dispute.findMany({
    where: { buyerId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, reason: true, status: true, resolution: true, createdAt: true, purchaseId: true },
  });

  return NextResponse.json({ disputes });
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("accsm_user_id")?.value;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body: Record<string, unknown> = await req.json();
    const purchaseId = String(body.purchaseId ?? "");
    const reason = String(body.reason ?? "").trim();
    const productId = body.productId ? String(body.productId) : null;
    const vendorId = body.vendorId ? String(body.vendorId) : null;

    if (reason.length < 10) return NextResponse.json({ error: "Reason must be at least 10 characters" }, { status: 400 });
    if (reason.length > 5000) return NextResponse.json({ error: "Reason too long" }, { status: 400 });
    // Rate limit: max 5 disputes per user per day
    const recentDisputes = await prisma.dispute.count({
      where: { buyerId: user.id, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });
    if (recentDisputes >= 5) {
      return NextResponse.json({ error: "Too many disputes. Please wait 24 hours." }, { status: 429 });
    }

    const dispute = await prisma.dispute.create({
      data: { reason, status: "open", buyerId: user.id, purchaseId: purchaseId || null, productId, vendorId },
    });

    if (purchaseId) {
      await prisma.purchase.updateMany({ where: { id: purchaseId, buyerId: user.id }, data: { status: "disputed" } });
    }

    await prisma.activityLog.create({
      data: { action: "dispute_opened", description: `Dispute by ${user.username}: ${reason.slice(0, 60)}`, userId: user.id },
    });
    await prisma.notification.create({
      data: { title: "Dispute opened", message: "Your dispute is being reviewed.", type: "info", userId: user.id },
    });

    return NextResponse.json({ success: true, dispute });
  } catch (err) {
    console.error("Dispute creation failed:", err);
    return NextResponse.json({ error: "Dispute creation failed" }, { status: 500 });
  }
}