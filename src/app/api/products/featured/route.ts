import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const products = await prisma.product.findMany({
    where: { status: "approved", visible: true, stock: { gt: 0 } },
    include: {
      vendor: { select: { id: true, username: true } },
      listing: { select: { id: true, title: true, platform: true } },
      reviews: { select: { rating: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  const bestByKey = new Map<string, (typeof products)[number]>();
  for (const p of products) {
    const key = p.listing?.title || p.title;
    const existing = bestByKey.get(key);
    if (!existing || p.storePrice < existing.storePrice) {
      bestByKey.set(key, p);
    }
  }

  const unique = Array.from(bestByKey.values()).slice(0, 12);

  const result = unique.map((p) => {
    const ratingCount = p.reviews.length;
    const avgRating = ratingCount > 0
      ? Math.round((p.reviews.reduce((s, r) => s + r.rating, 0) / ratingCount) * 10) / 10
      : 0;

    return {
      id: p.id,
      title: p.title,
      platform: p.platform,
      category: p.category,
      storePrice: p.storePrice,
      stock: p.stock,
      avgRating,
      ratingCount,
      listing: p.listing ? { id: p.listing.id, title: p.listing.title, platform: p.listing.platform } : null,
      vendor: { id: p.vendor.id, username: p.vendor.username },
    };
  });

  return NextResponse.json({ products: result });
}