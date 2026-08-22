import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const vendorId = searchParams.get("vendorId");

  if (vendorId) {
    // Detail view
    const vendor = await prisma.user.findUnique({
      where: { id: vendorId },
      select: { id: true, username: true, name: true, vendorCountry: true, vendorStatus: true },
    });
    if (!vendor) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const reviews = await prisma.review.findMany({
      where: { vendorId },
      include: { buyer: { select: { username: true } }, product: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
    });

    const productCount = await prisma.product.count({ where: { vendorId, status: "approved" } });
    const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
    const distribution = [0, 0, 0, 0, 0];
    reviews.forEach((r) => { distribution[r.rating - 1]++; });

    return NextResponse.json({ vendor, reviews, productCount, avgRating, ratingCount: reviews.length, distribution });
  }

  // List view
  const vendors = await prisma.user.findMany({
    where: { role: "vendor", vendorStatus: "approved" },
    select: { id: true, username: true, name: true, vendorCountry: true },
  });

  const vendorData = await Promise.all(
    vendors.map(async (v) => {
      const reviews = await prisma.review.findMany({ where: { vendorId: v.id } });
      const productCount = await prisma.product.count({ where: { vendorId: v.id, status: "approved" } });
      const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
      return { ...v, avgRating, ratingCount: reviews.length, productCount };
    })
  );

  return NextResponse.json(vendorData.sort((a, b) => b.avgRating - a.avgRating));
}
