import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { platformLabel } from "@/lib/totp";

export async function GET() {
  const purchases = await prisma.purchase.findMany({
    where: { status: "completed" },
    include: {
      product: { select: { platform: true, title: true, storePrice: true } },
      buyer: { select: { username: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const sales = purchases.map((p) => ({
    id: p.id,
    qty: p.quantity,
    platform: p.product.platform,
    platformLabel: platformLabel(p.product.platform),
    title: p.product.title,
    total: p.total,
    buyerInitial: (p.buyer.username.charAt(0) || "?").toUpperCase(),
    createdAt: p.createdAt,
  }));

  return NextResponse.json({ sales });
}