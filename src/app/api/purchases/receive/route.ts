import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const purchaseId = String(body.purchaseId ?? "");
  if (!purchaseId) return NextResponse.json({ error: "purchaseId required" }, { status: 400 });

  const purchase = await prisma.purchase.findFirst({ where: { id: purchaseId, buyerId: userId } });
  if (!purchase) return NextResponse.json({ error: "Purchase not found" }, { status: 404 });

  if (purchase.status === "completed") {
    const updated = await prisma.purchase.update({ where: { id: purchaseId }, data: { status: "delivered" } });
    await prisma.activityLog.create({ data: { action: "purchase_delivered", description: `Buyer @${user.username} confirmed delivery of purchase ${purchaseId}`, userId } });
    return NextResponse.json({ success: true, status: updated.status });
  }
  return NextResponse.json({ success: true, status: purchase.status });
}
