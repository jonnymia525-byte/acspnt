import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

async function requireUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

// GET - get receipt data for a purchase
export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const purchaseId = url.searchParams.get("purchaseId");

  if (purchaseId) {
    const purchase = await prisma.purchase.findFirst({
      where: { id: purchaseId, buyerId: user.id },
      include: {
        product: {
          include: {
            vendor: { select: { username: true, name: true } },
            listing: { select: { title: true, platform: true } },
          },
        },
      },
    });

    if (!purchase) return NextResponse.json({ error: "Purchase not found" }, { status: 404 });

    return NextResponse.json({
      receipt: {
        id: purchase.id,
        date: purchase.createdAt,
        product: purchase.product.title,
        platform: purchase.product.listing?.platform || purchase.product.platform,
        listing: purchase.product.listing?.title || "",
        vendor: purchase.product.vendor.username,
        quantity: purchase.quantity,
        subtotal: purchase.subtotal,
        discount: purchase.discount,
        couponCode: purchase.couponCode,
        total: purchase.total,
        status: purchase.status,
        accounts: purchase.accounts,
      },
      buyer: {
        name: user.name || user.username,
        email: user.email,
        username: user.username,
      },
    });
  }

  // List all receipts
  const purchases = await prisma.purchase.findMany({
    where: { buyerId: user.id },
    include: {
      product: {
        select: {
          title: true, platform: true,
          vendor: { select: { username: true } },
          listing: { select: { title: true, platform: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    receipts: purchases.map(p => ({
      id: p.id,
      date: p.createdAt,
      product: p.product.title,
      platform: p.product.listing?.platform || p.product.platform,
      vendor: p.product.vendor.username,
      quantity: p.quantity,
      total: p.total,
      status: p.status,
    })),
  });
}
