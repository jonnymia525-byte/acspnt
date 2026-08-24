import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

async function requireVendor() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "vendor" || user.vendorStatus !== "approved") return null;
  return user;
}

// GET - list low stock products
export async function GET() {
  const vendor = await requireVendor();
  if (!vendor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const products = await prisma.product.findMany({
    where: {
      vendorId: vendor.id,
      status: "approved",
      stock: { gt: 0 },
    },
    select: {
      id: true, title: true, platform: true, stock: true,
      lowStockThreshold: true, storePrice: true,
      listing: { select: { title: true } },
    },
    orderBy: { stock: "asc" },
  });

  const lowStock = products.filter(p => p.stock <= p.lowStockThreshold);
  const outOfStock = await prisma.product.findMany({
    where: { vendorId: vendor.id, status: "approved", stock: 0 },
    select: {
      id: true, title: true, platform: true, stock: true,
      listing: { select: { title: true } },
    },
  });

  return NextResponse.json({
    lowStock,
    outOfStock,
    totalProducts: products.length + outOfStock.length,
  });
}

// POST - update low stock threshold
export async function POST(req: Request) {
  const vendor = await requireVendor();
  if (!vendor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { productId, threshold } = await req.json();
  if (!productId || threshold === undefined) {
    return NextResponse.json({ error: "productId and threshold required" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.vendorId !== vendor.id) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  await prisma.product.update({
    where: { id: productId },
    data: { lowStockThreshold: Math.max(0, threshold) },
  });

  return NextResponse.json({ success: true });
}
