import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("accsm_user_id")?.value;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const url = new URL(req.url);
    const platform = url.searchParams.get("platform") || "";
    const category = url.searchParams.get("category") || "";

    if (!platform || !category) {
      return NextResponse.json({ error: "platform and category are required" }, { status: 400 });
    }

    // Find similar products from OTHER vendors (not the current user)
    const products = await prisma.product.findMany({
      where: {
        platform,
        category,
        status: "approved",
        visible: true,
        deletedAt: null,
        vendorId: { not: userId },
      },
      select: {
        id: true,
        title: true,
        platform: true,
        category: true,
        storePrice: true,
        vendorPrice: true,
        stock: true,
        totalSales: true,
        description: true,
        vendor: {
          select: {
            id: true,
            username: true,
            vendorRating: true,
            vendorSalesCount: true,
          },
        },
        reviews: {
          select: { rating: true },
        },
      },
      orderBy: { totalSales: "desc" },
      take: 10,
    });

    // Calculate average rating for each product
    const productsWithRating = products.map((p) => {
      const avgRating =
        p.reviews.length > 0
          ? p.reviews.reduce((sum, r) => sum + r.rating, 0) / p.reviews.length
          : 0;
      const { reviews, ...rest } = p;
      return { ...rest, avgRating: Math.round(avgRating * 10) / 10, reviewCount: reviews.length };
    });

    return NextResponse.json({ products: productsWithRating });
  } catch (err) {
    console.error("Similar products error:", err);
    return NextResponse.json({ error: "Failed to search" }, { status: 500 });
  }
}
