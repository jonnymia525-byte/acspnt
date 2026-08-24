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

// GET - vendor analytics
export async function GET() {
  const vendor = await requireVendor();
  if (!vendor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Total stats
  const totalStats = await prisma.purchase.aggregate({
    where: { product: { vendorId: vendor.id }, status: "completed" },
    _sum: { total: true, vendorEarning: true, commissionAmount: true, quantity: true },
    _count: true,
  });

  // Last 30 days
  const last30 = await prisma.purchase.aggregate({
    where: {
      product: { vendorId: vendor.id },
      status: "completed",
      createdAt: { gte: thirtyDaysAgo },
    },
    _sum: { total: true, vendorEarning: true },
    _count: true,
  });

  // Last 7 days
  const last7 = await prisma.purchase.aggregate({
    where: {
      product: { vendorId: vendor.id },
      status: "completed",
      createdAt: { gte: sevenDaysAgo },
    },
    _sum: { total: true, vendorEarning: true },
    _count: true,
  });

  // Daily revenue for last 14 days
  const dailyData: { date: string; revenue: number; orders: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59);

    const dayStats = await prisma.purchase.aggregate({
      where: {
        product: { vendorId: vendor.id },
        status: "completed",
        createdAt: { gte: dayStart, lte: dayEnd },
      },
      _sum: { total: true },
      _count: true,
    });

    dailyData.push({
      date: day.toISOString().split("T")[0],
      revenue: dayStats._sum.total || 0,
      orders: dayStats._count,
    });
  }

  // Top products by revenue
  const topProducts = await prisma.product.findMany({
    where: { vendorId: vendor.id },
    include: {
      purchases: { select: { total: true, vendorEarning: true, quantity: true, createdAt: true } },
      reviews: { select: { rating: true } },
      _count: { select: { purchases: true } },
    },
    orderBy: { purchases: { _count: "desc" } },
    take: 10,
  });

  const productRanking = topProducts.map(p => ({
    id: p.id,
    title: p.title,
    platform: p.platform,
    stock: p.stock,
    totalRevenue: p.purchases.reduce((sum, pur) => sum + pur.total, 0),
    totalEarning: p.purchases.reduce((sum, pur) => sum + pur.vendorEarning, 0),
    totalOrders: p._count.purchases,
    avgRating: p.reviews.length > 0 ? p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length : 0,
  })).sort((a, b) => b.totalRevenue - a.totalRevenue);

  // Unique buyers
  const uniqueBuyers = await prisma.purchase.findMany({
    where: { product: { vendorId: vendor.id }, status: "completed" },
    select: { buyerId: true },
    distinct: ["buyerId"],
  });

  return NextResponse.json({
    total: {
      revenue: totalStats._sum.total || 0,
      earnings: totalStats._sum.vendorEarning || 0,
      commission: totalStats._sum.commissionAmount || 0,
      orders: totalStats._count,
      units: totalStats._sum.quantity || 0,
      uniqueBuyers: uniqueBuyers.length,
    },
    last30Days: {
      revenue: last30._sum.total || 0,
      earnings: last30._sum.vendorEarning || 0,
      orders: last30._count,
    },
    last7Days: {
      revenue: last7._sum.total || 0,
      earnings: last7._sum.vendorEarning || 0,
      orders: last7._count,
    },
    daily: dailyData,
    topProducts: productRanking,
  });
}
