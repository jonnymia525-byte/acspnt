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

// GET - find similar products that can be merged
export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "find-similar";

  if (action === "find-similar") {
    const platform = url.searchParams.get("platform") || "";
    const category = url.searchParams.get("category") || "";

    // Find all approved products matching platform+category from different vendors
    const products = await prisma.product.findMany({
      where: {
        platform: platform || undefined,
        category: category || undefined,
        status: "approved",
        visible: true,
        deletedAt: null,
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
        mergeGroup: true,
        isMerged: true,
        vendor: {
          select: { id: true, username: true, vendorRating: true },
        },
        _count: { select: { reviews: true, purchases: true } },
      },
      orderBy: { totalSales: "desc" },
      take: 50,
    });

    // Group by title similarity
    const titleGroups = new Map<string, typeof products>();
    for (const p of products) {
      const key = p.title.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!titleGroups.has(key)) titleGroups.set(key, []);
      titleGroups.get(key)!.push(p);
    }

    // Return groups with 2+ products (candidates for merge)
    const mergeCandidates = Array.from(titleGroups.entries())
      .filter(([, prods]) => prods.length >= 2)
      .map(([key, prods]) => ({
        title: prods[0].title,
        platform: prods[0].platform,
        category: prods[0].category,
        products: prods,
        totalStock: prods.reduce((s, p) => s + p.stock, 0),
        totalSales: prods.reduce((s, p) => s + p.totalSales, 0),
      }));

    return NextResponse.json({ mergeCandidates });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// POST - merge selected products
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const { action, productIds, masterTitle } = body;

    if (action === "merge") {
      if (!productIds || !Array.isArray(productIds) || productIds.length < 2) {
        return NextResponse.json({ error: "Select at least 2 products to merge" }, { status: 400 });
      }

      // Fetch all products
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, title: true, vendorId: true, platform: true, category: true },
      });

      if (products.length !== productIds.length) {
        return NextResponse.json({ error: "Some products not found" }, { status: 400 });
      }

      // Generate a merge group ID
      const mergeGroupId = `merge-${Date.now()}`;

      // Use the first product as the master, mark all as merged
      const masterId = productIds[0];
      const title = masterTitle || products[0].title;

      await prisma.product.updateMany({
        where: { id: { in: productIds } },
        data: { isMerged: true, mergeGroup: mergeGroupId },
      });

      await prisma.activityLog.create({
        data: {
          action: "products_merged",
          description: `Admin merged ${products.length} products into "${title}" (group: ${mergeGroupId})`,
          userId: admin.id,
        },
      });

      return NextResponse.json({
        success: true,
        message: `${products.length} products merged under "${title}"`,
        mergeGroupId,
      });
    }

    if (action === "unmerge") {
      const { mergeGroup } = body;
      if (!mergeGroup) return NextResponse.json({ error: "mergeGroup required" }, { status: 400 });

      await prisma.product.updateMany({
        where: { mergeGroup },
        data: { isMerged: false, mergeGroup: null },
      });

      await prisma.activityLog.create({
        data: {
          action: "products_unmerged",
          description: `Admin unmerged product group ${mergeGroup}`,
          userId: admin.id,
        },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("Merge error:", err);
    return NextResponse.json({ error: "Merge failed" }, { status: 500 });
  }
}
