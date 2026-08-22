import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

async function requireUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

// GET - list vendor invoices
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const invoices = await prisma.invoice.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  // Calculate current period earnings
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const currentPeriodPurchases = await prisma.purchase.aggregate({
    where: {
      product: { vendorId: user.id },
      createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
    },
    _sum: { total: true, commissionAmount: true, vendorEarning: true },
    _count: true,
  });

  const totalEarnings = await prisma.purchase.aggregate({
    where: { product: { vendorId: user.id } },
    _sum: { vendorEarning: true, commissionAmount: true, total: true },
    _count: true,
  });

  return NextResponse.json({
    invoices,
    currentPeriod: {
      period: currentMonth,
      revenue: currentPeriodPurchases._sum.total || 0,
      commission: currentPeriodPurchases._sum.commissionAmount || 0,
      netEarnings: currentPeriodPurchases._sum.vendorEarning || 0,
      orderCount: currentPeriodPurchases._count,
    },
    allTime: {
      revenue: totalEarnings._sum.total || 0,
      commission: totalEarnings._sum.commissionAmount || 0,
      netEarnings: totalEarnings._sum.vendorEarning || 0,
      orderCount: totalEarnings._count,
    },
  });
}

// POST - generate invoice for a period
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { period } = await req.json();
  if (!period) return NextResponse.json({ error: "period required (e.g. 2024-01)" }, { status: 400 });

  // Check if invoice already exists
  const existing = await prisma.invoice.findFirst({
    where: { userId: user.id, period },
  });
  if (existing) return NextResponse.json({ error: "Invoice already exists for this period", invoice: existing });

  // Parse period
  const [year, month] = period.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  const purchases = await prisma.purchase.aggregate({
    where: {
      product: { vendorId: user.id },
      createdAt: { gte: start, lte: end },
    },
    _sum: { total: true, commissionAmount: true, vendorEarning: true },
    _count: true,
  });

  if (purchases._count === 0) {
    return NextResponse.json({ error: "No sales in this period" }, { status: 400 });
  }

  const invoiceNo = `INV-${year}${String(month).padStart(2, "0")}-${user.username.substring(0, 4).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNo,
      amount: purchases._sum.total || 0,
      commission: purchases._sum.commissionAmount || 0,
      netAmount: purchases._sum.vendorEarning || 0,
      period,
      userId: user.id,
    },
  });

  return NextResponse.json({ success: true, invoice });
}
