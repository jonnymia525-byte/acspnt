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

  const [purchaseAgg, purchases, disputes, notifications, openDisputes, deposits, loginHistory] = await Promise.all([
    prisma.purchase.aggregate({
      where: { buyerId: userId },
      _count: { _all: true },
      _sum: { quantity: true, total: true },
    }),
    prisma.purchase.findMany({
      where: { buyerId: userId },
      select: { id: true, quantity: true, total: true, accounts: true, status: true, createdAt: true, product: { select: { title: true, platform: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.dispute.findMany({
      where: { buyerId: userId },
      select: { id: true, reason: true, status: true, resolution: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.notification.findMany({
      where: { userId },
      select: { id: true, title: true, message: true, read: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.dispute.count({ where: { buyerId: userId, status: "open" } }),
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

  return NextResponse.json({
    user,
    stats: {
      balance: user.balance,
      orders: purchaseAgg._count._all,
      units: purchaseAgg._sum.quantity ?? 0,
      spent: purchaseAgg._sum.total ?? 0,
      openDisputes,
    },
    purchases,
    disputes,
    notifications,
    deposits,
    loginHistory,
  });
}
