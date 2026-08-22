import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

async function requireAdmin() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "admin") return null;
  return user;
}

// GET - list all listings with bestSeller status
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const listings = await prisma.listing.findMany({
    select: {
      id: true,
      title: true,
      platform: true,
      category: true,
      bestSeller: true,
      visible: true,
      createdAt: true,
      products: {
        select: { id: true, stock: true, storePrice: true, status: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Calculate total sales per listing via products -> purchases
  const allProductIds = listings.flatMap(l => l.products.map(p => p.id));
  const salesData = await prisma.purchase.groupBy({
    by: ["productId"],
    where: { productId: { in: allProductIds } },
    _sum: { quantity: true },
  });
  const productSalesMap = new Map(salesData.map(s => [s.productId, s._sum.quantity ?? 0]));

  const listingsWithSales = listings.map((l) => {
    const totalSales = l.products.reduce((sum: number, p: { id: string }) => sum + (productSalesMap.get(p.id) || 0), 0);
    return {
      ...l,
      totalSales,
      totalStock: l.products.reduce((sum: number, p: { stock: number }) => sum + p.stock, 0),
    };
  });

  return NextResponse.json({ listings: listingsWithSales });
}

// POST - toggle bestSeller on a listing
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { action, listingId } = body;

  if (!listingId) return NextResponse.json({ error: "listingId required" }, { status: 400 });

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, title: true, platform: true, bestSeller: true, visible: true },
  });
  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

  if (action === "toggle_best_seller") {
    const newBestSeller = !listing.bestSeller;

    // If enabling bestSeller, disable other best sellers in the same platform
    if (newBestSeller) {
      await prisma.listing.updateMany({
        where: { platform: listing.platform, bestSeller: true, id: { not: listingId } },
        data: { bestSeller: false },
      });
    }

    await prisma.listing.update({
      where: { id: listingId },
      data: { bestSeller: newBestSeller },
    });

    await prisma.activityLog.create({
      data: {
        action: newBestSeller ? "best_seller_set" : "best_seller_removed",
        description: `Admin ${newBestSeller ? "set" : "removed"} "${listing.title}" as best seller for ${listing.platform}`,
        userId: admin.id,
      },
    });

    return NextResponse.json({ success: true, bestSeller: newBestSeller });
  }

  if (action === "toggle_visible") {
    const newVisible = !listing.visible;
    await prisma.listing.update({
      where: { id: listingId },
      data: { visible: newVisible },
    });
    await prisma.activityLog.create({
      data: {
        action: newVisible ? "listing_unhidden" : "listing_hidden",
        description: `Admin ${newVisible ? "showed" : "hid"} listing "${listing.title}" ${newVisible ? "for users" : "from users"}`,
        userId: admin.id,
      },
    });
    return NextResponse.json({ success: true, visible: newVisible });
  }

  if (action === "delete_listing") {
    // Soft delete: hide listing and all its products
    await prisma.product.updateMany({ where: { listingId }, data: { deletedAt: new Date(), visible: false, status: "deleted" } });
    await prisma.listing.update({ where: { id: listingId }, data: { deletedAt: new Date(), visible: false } });
    await prisma.activityLog.create({
      data: {
        action: "listing_deleted",
        description: `Admin deleted listing "${listing.title}"`,
        userId: admin.id,
      },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
