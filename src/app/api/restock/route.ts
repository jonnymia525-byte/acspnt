import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

async function requireUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

// POST - subscribe to restock notification
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { productId } = await req.json();
  if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });

  // Check if already subscribed
  const existing = await prisma.restockNotification.findUnique({
    where: { userId_productId: { userId: user.id, productId } },
  });

  if (existing) {
    return NextResponse.json({ success: true, message: "Already subscribed" });
  }

  await prisma.restockNotification.create({
    data: { userId: user.id, productId },
  });

  return NextResponse.json({ success: true, message: "You will be notified when this product is restocked" });
}

// GET - check if subscribed to a product
export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ subscribed: false });

  const url = new URL(req.url);
  const productId = url.searchParams.get("productId");
  if (!productId) return NextResponse.json({ subscribed: false });

  const existing = await prisma.restockNotification.findUnique({
    where: { userId_productId: { userId: user.id, productId } },
  });

  return NextResponse.json({ subscribed: !!existing });
}
