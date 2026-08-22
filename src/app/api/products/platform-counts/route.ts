import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const grouped = await prisma.product.groupBy({
    by: ["platform"],
    where: { status: "approved", visible: true },
    _count: true,
    _sum: { stock: true },
  });

  const counts = grouped
    .map((g) => ({
      platform: g.platform,
      count: g._count,
      stock: g._sum.stock || 0,
    }))
    .sort((a, b) => b.count - a.count);

  const totalListings = await prisma.listing.count({ where: { visible: true } });
  const totalStock = counts.reduce((s, c) => s + c.stock, 0);

  return NextResponse.json({ counts, totalListings, totalStock });
}