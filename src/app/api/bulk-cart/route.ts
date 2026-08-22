import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

async function requireUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

// GET - list bulk cart items
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.bulkCart.findMany({
    where: { userId: user.id },
    include: {
      product: {
        include: {
          vendor: { select: { id: true, username: true } },
          listing: { select: { id: true, title: true, platform: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const total = items.reduce((sum, item) => sum + item.product.storePrice * item.quantity, 0);

  return NextResponse.json({ items, total });
}

// POST - add/update/remove from bulk cart
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { productId, quantity, action } = await req.json();

  if (action === "clear") {
    await prisma.bulkCart.deleteMany({ where: { userId: user.id } });
    return NextResponse.json({ success: true });
  }

  if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  if (action === "remove") {
    await prisma.bulkCart.deleteMany({ where: { userId: user.id, productId } });
    return NextResponse.json({ success: true });
  }

  const qty = Math.max(1, Math.min(quantity || 1, product.stock));

  const existing = await prisma.bulkCart.findUnique({
    where: { userId_productId: { userId: user.id, productId } },
  });

  if (existing) {
    await prisma.bulkCart.update({ where: { id: existing.id }, data: { quantity: qty } });
  } else {
    await prisma.bulkCart.create({ data: { userId: user.id, productId, quantity: qty } });
  }

  return NextResponse.json({ success: true });
}
