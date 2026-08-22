import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

async function requireUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

// GET - list reorderable purchases
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const purchases = await prisma.purchase.findMany({
    where: { buyerId: user.id, status: "completed" },
    include: {
      product: {
        select: {
          id: true, title: true, platform: true, storePrice: true, stock: true, status: true,
          vendor: { select: { id: true, username: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Deduplicate by product, keep latest purchase
  const seen = new Map<string, any>();
  for (const p of purchases) {
    if (!seen.has(p.productId)) {
      seen.set(p.productId, {
        product: p.product,
        lastPurchased: p.createdAt,
        lastPrice: p.subtotal / p.quantity,
        lastQuantity: p.quantity,
        inStock: p.product.stock > 0 && p.product.status === "approved",
      });
    }
  }

  return NextResponse.json({ items: Array.from(seen.values()) });
}
