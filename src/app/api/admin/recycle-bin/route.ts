import { NextRequest, NextResponse } from "next/server";
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

// GET: List all soft-deleted items
export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const url = new URL(req.url);
    const type = url.searchParams.get("type"); // products, listings, coupons, banners, announcements

    const results: Record<string, unknown[]> = {};

    if (!type || type === "products") {
      results.products = await prisma.product.findMany({
        where: { deletedAt: { not: null } },
        include: { listing: { select: { title: true, platform: true } }, vendor: { select: { username: true } } },
        orderBy: { deletedAt: "desc" },
        take: 100,
      });
    }
    if (!type || type === "listings") {
      results.listings = await prisma.listing.findMany({
        where: { deletedAt: { not: null } },
        include: { vendor: { select: { username: true } }, _count: { select: { products: true } } },
        orderBy: { deletedAt: "desc" },
        take: 100,
      });
    }
    if (!type || type === "coupons") {
      results.coupons = await prisma.coupon.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" },
        take: 100,
      });
    }
    if (!type || type === "banners") {
      results.banners = await prisma.banner.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" },
        take: 100,
      });
    }
    if (!type || type === "announcements") {
      results.announcements = await prisma.scheduledAnnouncement.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" },
        take: 100,
      });
    }

    return NextResponse.json({ items: results });
  } catch (err) {
    console.error("Recycle bin GET error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST: Restore or permanently delete items
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const body = await req.json();
    const { action, type, id } = body;

    if (!action || !type || !id) {
      return NextResponse.json({ error: "Missing action, type, or id" }, { status: 400 });
    }

    if (action === "restore") {
      switch (type) {
        case "products":
          await prisma.product.update({
            where: { id },
            data: { deletedAt: null, visible: true, status: "in_stock" },
          });
          break;
        case "listings":
          await prisma.listing.update({
            where: { id },
            data: { deletedAt: null, visible: true },
          });
          // Also restore products in this listing
          await prisma.product.updateMany({
            where: { listingId: id, deletedAt: { not: null } },
            data: { deletedAt: null, visible: true, status: "in_stock" },
          });
          break;
        case "coupons":
          await prisma.coupon.update({
            where: { id },
            data: { deletedAt: null },
          });
          break;
        case "banners":
          await prisma.banner.update({
            where: { id },
            data: { deletedAt: null },
          });
          break;
        case "announcements":
          await prisma.scheduledAnnouncement.update({
            where: { id },
            data: { deletedAt: null },
          });
          break;
        default:
          return NextResponse.json({ error: "Unknown type" }, { status: 400 });
      }

      await prisma.activityLog.create({
        data: {
          userId: admin.id,
          action: "item_restored",
          description: `Admin restored ${type.slice(0, -1)}: ${id}`,
        },
      });

      return NextResponse.json({ success: true, restored: true });
    }

    if (action === "permanent_delete") {
      switch (type) {
        case "products":
          await prisma.product.delete({ where: { id } });
          break;
        case "listings":
          await prisma.product.deleteMany({ where: { listingId: id } });
          await prisma.listing.delete({ where: { id } });
          break;
        case "coupons":
          await prisma.coupon.delete({ where: { id } });
          break;
        case "banners":
          await prisma.banner.delete({ where: { id } });
          break;
        case "announcements":
          await prisma.scheduledAnnouncement.delete({ where: { id } });
          break;
        default:
          return NextResponse.json({ error: "Unknown type" }, { status: 400 });
      }

      await prisma.activityLog.create({
        data: {
          userId: admin.id,
          action: "item_permanently_deleted",
          description: `Admin permanently deleted ${type.slice(0, -1)}: ${id}`,
        },
      });

      return NextResponse.json({ success: true, deleted: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("Recycle bin POST error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
