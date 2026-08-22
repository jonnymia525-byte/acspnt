import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { vendorId, rating, comment } = await req.json();
  if (!vendorId || !rating || rating < 1 || rating > 5) return NextResponse.json({ error: "Valid rating required" }, { status: 400 });
  if (vendorId === userId) return NextResponse.json({ error: "Cannot review yourself" }, { status: 400 });

  // Check if purchased from this vendor
  const purchase = await prisma.purchase.findFirst({
    where: { buyerId: userId, product: { vendorId } },
  });
  if (!purchase) return NextResponse.json({ error: "Must purchase from vendor first" }, { status: 403 });

  // Check if already reviewed
  const existing = await prisma.review.findFirst({ where: { buyerId: userId, vendorId } });
  if (existing) return NextResponse.json({ error: "Already reviewed" }, { status: 409 });

  const review = await prisma.review.create({
    data: { rating, comment: comment || "", buyerId: userId, vendorId },
  });

  return NextResponse.json({ success: true, review });
}
