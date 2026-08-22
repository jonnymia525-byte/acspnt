import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url = new URL(req.url);
  const period = url.searchParams.get("period") || "7d";
  const scope = url.searchParams.get("scope") || "self"; // self (vendor) or all (admin)

  // Calculate date range
  const now = new Date();
  let startDate: Date;
  switch (period) {
    case "24h": startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
    case "7d": startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
    case "30d": startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
    case "90d": startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
    case "1y": startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); break;
    case "all": startDate = new Date(0); break;
    default: startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  const isAdmin = scope === "all" && user.role === "admin";
  const isVendor = user.role === "vendor";
  const vendorFilter = isAdmin ? {} : { product: { vendorId: userId } };

  // Get purchases in range
  const purchases = await prisma.purchase.findMany({
    where: { createdAt: { gte: startDate }, ...vendorFilter },
    select: {
      id: true, quantity: true, total: true, createdAt: true, status: true,
      product: { select: { id: true, title: true, platform: true, category: true, vendorPrice: true, storePrice: true, vendor: { select: { id: true, username: true } } } },
      buyer: { select: { username: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  // Summary stats
  const totalSales = purchases.reduce((sum, p) => sum + p.quantity, 0);
  const totalRevenue = purchases.reduce((sum, p) => sum + p.total, 0);
  const totalOrders = purchases.length;
  const uniqueBuyers = new Set(purchases.map(p => p.buyer.username)).size;

  // Daily breakdown
  const dailyMap = new Map<string, { orders: number; revenue: number; units: number }>();
  purchases.forEach(p => {
    const day = p.createdAt.toISOString().split("T")[0];
    const existing = dailyMap.get(day) || { orders: 0, revenue: 0, units: 0 };
    existing.orders += 1;
    existing.revenue += p.total;
    existing.units += p.quantity;
    dailyMap.set(day, existing);
  });
  const daily = Array.from(dailyMap.entries()).map(([date, data]) => ({ date, ...data })).sort((a, b) => a.date.localeCompare(b.date));

  // Product ranking
  const productMap = new Map<string, { title: string; platform: string; category: string; sales: number; revenue: number; orders: number }>();
  purchases.forEach(p => {
    const key = p.product.id;
    const existing = productMap.get(key) || { title: p.product.title, platform: p.product.platform, category: p.product.category, sales: 0, revenue: 0, orders: 0 };
    existing.sales += p.quantity;
    existing.revenue += p.total;
    existing.orders += 1;
    productMap.set(key, existing);
  });
  const productRanking = Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 20);

  // Vendor ranking (admin only)
  let vendorRanking: Array<{ username: string; sales: number; revenue: number; orders: number }> = [];
  if (isAdmin) {
    const vendorMap = new Map<string, { username: string; sales: number; revenue: number; orders: number }>();
    purchases.forEach(p => {
      const key = p.product.vendor.id;
      const existing = vendorMap.get(key) || { username: p.product.vendor.username, sales: 0, revenue: 0, orders: 0 };
      existing.sales += p.quantity;
      existing.revenue += p.total;
      existing.orders += 1;
      vendorMap.set(key, existing);
    });
    vendorRanking = Array.from(vendorMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 20);
  }

  // Category ranking
  const catMap = new Map<string, { sales: number; revenue: number; orders: number }>();
  purchases.forEach(p => {
    const key = p.product.category;
    const existing = catMap.get(key) || { sales: 0, revenue: 0, orders: 0 };
    existing.sales += p.quantity;
    existing.revenue += p.total;
    existing.orders += 1;
    catMap.set(key, existing);
  });
  const categoryRanking = Array.from(catMap.entries()).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.revenue - a.revenue);

  // Platform ranking
  const platMap = new Map<string, { sales: number; revenue: number; orders: number }>();
  purchases.forEach(p => {
    const key = p.product.platform;
    const existing = platMap.get(key) || { sales: 0, revenue: 0, orders: 0 };
    existing.sales += p.quantity;
    existing.revenue += p.total;
    existing.orders += 1;
    platMap.set(key, existing);
  });
  const platformRanking = Array.from(platMap.entries()).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.revenue - a.revenue);

  return NextResponse.json({
    period,
    summary: { totalSales, totalRevenue, totalOrders, uniqueBuyers },
    daily,
    productRanking,
    vendorRanking,
    categoryRanking,
    platformRanking,
    recentOrders: purchases.slice(0, 20),
  });
}
