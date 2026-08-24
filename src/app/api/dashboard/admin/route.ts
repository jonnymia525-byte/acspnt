import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const [
    purchaseAgg,
    totalUsers,
    totalVendors,
    totalProducts,
    approvedProducts,
    pendingProducts,
    pendingVendorRequestsCount,
    pendingWithdrawalsCount,
    openDisputesCount,
    recentOrders,
    activityLog,
    vendors,
    coupons,
    allProducts,
    pendingWithdrawals,
    otherWithdrawals,
    allDeposits,
    pendingVendorRequests,
    disputes,
  ] = await Promise.all([
    prisma.purchase.aggregate({ _count: { _all: true }, _sum: { total: true } }),
    prisma.user.count(),
    prisma.user.count({ where: { role: "vendor" } }),
    prisma.product.count(),
    prisma.product.count({ where: { status: "approved" } }),
    prisma.product.count({ where: { status: "pending" } }),
    prisma.vendorRequest.count({ where: { status: "pending" } }),
    prisma.withdrawal.count({ where: { status: "pending" } }),
    prisma.dispute.count({ where: { status: "open" } }),
    prisma.purchase.findMany({
      select: { id: true, total: true, quantity: true, status: true, createdAt: true, product: { select: { title: true, platform: true, vendor: { select: { username: true } } } }, buyer: { select: { username: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.activityLog.findMany({
      select: { id: true, action: true, description: true, createdAt: true, user: { select: { username: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.user.findMany({
      where: { role: "vendor" },
      select: { id: true, username: true, email: true, vendorStatus: true, balance: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.coupon.findMany({
      select: { id: true, code: true, type: true, value: true, usedCount: true, maxUses: true, active: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.product.findMany({
      select: { id: true, title: true, platform: true, vendorPrice: true, storePrice: true, stock: true, status: true, vendor: { select: { username: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.withdrawal.findMany({
      where: { status: "pending" },
      select: { id: true, amount: true, netAmount: true, fee: true, method: true, status: true, createdAt: true, user: { select: { username: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.withdrawal.findMany({
      where: { status: { not: "pending" } },
      select: { id: true, amount: true, netAmount: true, fee: true, method: true, status: true, createdAt: true, user: { select: { username: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.deposit.findMany({
      select: { id: true, amount: true, method: true, status: true, createdAt: true, user: { select: { username: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.vendorRequest.findMany({
      where: { status: "pending" },
      select: { id: true, firstName: true, lastName: true, email: true, productDetails: true, userId: true, user: { select: { username: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.dispute.findMany({
      select: {
        id: true,
        reason: true,
        status: true,
        resolution: true,
        createdAt: true,
        purchaseId: true,
        refundAmount: true,
        vendorCharge: true,
        buyer: { select: { id: true, username: true, email: true } },
        purchase: {
          select: {
            id: true,
            quantity: true,
            subtotal: true,
            total: true,
            accounts: true,
            status: true,
            createdAt: true,
            product: {
              select: { id: true, title: true, platform: true, storePrice: true, category: true, vendorId: true, vendor: { select: { id: true, username: true, email: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return NextResponse.json({
    stats: {
      totalUsers,
      totalVendors,
      totalProducts,
      approvedProducts,
      pendingProducts,
      totalPurchases: purchaseAgg._count._all,
      pendingVendorRequests: pendingVendorRequestsCount,
      pendingWithdrawals: pendingWithdrawalsCount,
      openDisputes: openDisputesCount,
      totalRevenue: purchaseAgg._sum.total ?? 0,
    },
    recentOrders,
    recentActivity: activityLog.map((log) => ({ ...log, user: { username: log.user?.username ?? "system" } })),
    vendors,
    coupons,
    allProducts,
    allWithdrawals: [...pendingWithdrawals, ...otherWithdrawals],
    allDeposits,
    pendingVendorRequests,
    allDisputes: disputes,
  });
}
