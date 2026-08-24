import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, username: true, name: true, role: true, balance: true, vendorStatus: true, twoFaEnabled: true, contactMethod: true, contactDetail: true, blocked: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.blocked) return NextResponse.json({ error: "Account blocked" }, { status: 403 });
  if (user.role !== "vendor" || user.vendorStatus === "none") return NextResponse.json({ error: "Vendor access required" }, { status: 403 });

  const [salesData, reviewAgg, productStatusCounts, withdrawalStatusCounts, lowStock, outOfStock, products, sales, withdrawals, deposits, loginHistory] = await Promise.all([
    prisma.purchase.findMany({
      where: { product: { vendorId: userId } },
      select: { quantity: true, product: { select: { vendorPrice: true } } },
    }),
    prisma.review.aggregate({
      where: { vendorId: userId },
      _avg: { rating: true },
    }),
    prisma.product.groupBy({
      by: ["status"],
      where: { vendorId: userId },
      _count: { _all: true },
    }),
    prisma.withdrawal.groupBy({
      by: ["status"],
      where: { userId },
      _count: { _all: true },
    }),
    prisma.product.findMany({
      where: { vendorId: userId, stock: { gt: 0, lte: 5 } },
      select: { id: true, title: true, stock: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.findMany({
      where: { vendorId: userId, stock: 0 },
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.findMany({
      where: { vendorId: userId },
      select: { id: true, title: true, platform: true, vendorPrice: true, storePrice: true, stock: true, status: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.purchase.findMany({
      where: { product: { vendorId: userId } },
      select: { id: true, quantity: true, total: true, createdAt: true, product: { select: { title: true } }, buyer: { select: { username: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.withdrawal.findMany({
      where: { userId },
      select: { id: true, amount: true, netAmount: true, fee: true, method: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.deposit.findMany({
      where: { userId },
      select: { id: true, amount: true, method: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.activityLog.findMany({
      where: { userId, action: { in: ["login", "security"] } },
      select: { id: true, action: true, description: true, ip: true, country: true, city: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  const productStatusCountsMap = new Map(productStatusCounts.map((g) => [g.status, g._count._all]));
  const withdrawalStatusCountsMap = new Map(withdrawalStatusCounts.map((g) => [g.status, g._count._all]));

  const totalRevenue = salesData.reduce((sum, p) => sum + p.product.vendorPrice * p.quantity, 0);
  const totalUnits = salesData.reduce((sum, p) => sum + p.quantity, 0);
  const avgRating = reviewAgg._avg.rating ? Math.round(reviewAgg._avg.rating * 10) / 10 : 0;

  // Account inventory stats: total accounts across all products
  const allProducts = await prisma.product.findMany({
    where: { vendorId: userId },
    select: { stock: true, status: true },
  });
  const totalAccountsInStock = allProducts.reduce((sum, p) => sum + p.stock, 0);
  const accountsSold = totalUnits; // each unit = 1 account sold
  const pendingApprovalAccounts = allProducts
    .filter(p => p.status === "pending")
    .reduce((sum, p) => sum + p.stock, 0);
  const liveAccounts = allProducts
    .filter(p => p.status === "approved")
    .reduce((sum, p) => sum + p.stock, 0);

  return NextResponse.json({
    user,
    stats: {
      balance: user.balance,
      totalRevenue,
      totalUnits,
      totalProducts: productStatusCounts.reduce((sum, g) => sum + g._count._all, 0),
      activeProducts: productStatusCountsMap.get("approved") ?? 0,
      avgRating,
      pendingProducts: productStatusCountsMap.get("pending") ?? 0,
      pendingWithdrawals: withdrawalStatusCountsMap.get("pending") ?? 0,
      lowStockCount: lowStock.length,
      // Account inventory stats
      totalAccountsInStock,
      accountsSold,
      pendingApprovalAccounts,
      liveAccounts,
    },
    stockAlerts: { lowStock, outOfStock },
    products,
    sales,
    withdrawals,
    deposits,
    loginHistory,
  });
}
