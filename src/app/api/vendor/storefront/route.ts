import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

async function requireUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

// GET - public vendor storefront
export async function GET(req: Request) {
  const url = new URL(req.url);
  const vendorId = url.searchParams.get("vendorId");
  const username = url.searchParams.get("username");

  let vendor;
  if (vendorId) {
    vendor = await prisma.user.findUnique({ where: { id: vendorId } });
  } else if (username) {
    vendor = await prisma.user.findFirst({ where: { username } });
  }

  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  const products = await prisma.product.findMany({
    where: { vendorId: vendor.id, status: "approved", visible: true },
    include: {
      listing: { select: { id: true, title: true, platform: true } },
      reviews: { select: { rating: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const purchases = await prisma.purchase.aggregate({
    where: { product: { vendorId: vendor.id }, status: "completed" },
    _count: true,
    _sum: { total: true },
  });

  const avgRating = products.length > 0
    ? products.reduce((sum, p) => {
        const productAvg = p.reviews.length > 0 ? p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length : 0;
        return sum + productAvg;
      }, 0) / products.length
    : 0;

  return NextResponse.json({
    vendor: {
      id: vendor.id,
      username: vendor.username,
      name: vendor.name,
      bio: vendor.vendorBio,
      logo: vendor.vendorLogo,
      country: vendor.vendorCountry,
      joinedAt: vendor.registeredAt,
      totalSales: purchases._count,
      totalRevenue: purchases._sum.total || 0,
      avgRating: Math.round(avgRating * 10) / 10,
      fulfillmentRate: vendor.vendorFulfillmentRate,
      responseTime: vendor.vendorResponseTime,
    },
    products: products.map(p => ({
      id: p.id,
      title: p.title,
      platform: p.platform,
      storePrice: p.storePrice,
      stock: p.stock,
      listing: p.listing,
      avgRating: p.reviews.length > 0 ? p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length : 0,
      reviewCount: p.reviews.length,
    })),
  });
}

// POST - update vendor storefront profile
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "vendor" && user.vendorStatus !== "approved") {
    return NextResponse.json({ error: "Vendor account required" }, { status: 403 });
  }

  const { bio, logo, country, contactMethod, contactDetail } = await req.json();

  const data: any = {};
  if (bio !== undefined) data.vendorBio = bio;
  if (logo !== undefined) data.vendorLogo = logo;
  if (country !== undefined) data.vendorCountry = country;
  if (contactMethod !== undefined) data.contactMethod = contactMethod;
  if (contactDetail !== undefined) data.contactDetail = contactDetail;

  const updated = await prisma.user.update({ where: { id: user.id }, data });
  return NextResponse.json({ success: true, vendor: { bio: updated.vendorBio, logo: updated.vendorLogo } });
}
