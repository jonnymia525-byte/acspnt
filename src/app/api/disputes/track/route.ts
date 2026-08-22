import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

async function requireUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

// GET - list user's disputes with status
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const disputes = await prisma.dispute.findMany({
    where: { buyerId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ disputes });
}

// POST - file a dispute with evidence
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reason, purchaseId, vendorId, productId, evidenceUrls } = await req.json();
  if (!reason) return NextResponse.json({ error: "reason required" }, { status: 400 });

  // Check if already has open dispute for this purchase
  if (purchaseId) {
    const existing = await prisma.dispute.findFirst({
      where: { buyerId: user.id, purchaseId, status: { in: ["open", "under_review"] } },
    });
    if (existing) return NextResponse.json({ error: "You already have an open dispute for this order" }, { status: 400 });
  }

  // Auto-escalate: disputes older than 48 hours without resolution
  const slaDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000);

  const dispute = await prisma.dispute.create({
    data: {
      reason,
      purchaseId: purchaseId || null,
      vendorId: vendorId || null,
      productId: productId || null,
      buyerId: user.id,
      evidenceUrls: evidenceUrls ? JSON.stringify(evidenceUrls) : null,
      slaDeadline,
    },
  });

  await prisma.activityLog.create({
    data: { action: "dispute_filed", description: `User filed dispute: ${reason.substring(0, 100)}`, userId: user.id },
  });

  // Notify admin
  const admins = await prisma.user.findMany({ where: { role: "admin" }, select: { id: true } });
  for (const admin of admins) {
    await prisma.notification.create({
      data: { title: "New Dispute", message: `User @${user.username} filed a dispute: ${reason.substring(0, 80)}`, type: "urgent", userId: admin.id },
    });
  }

  return NextResponse.json({ success: true, dispute });
}
