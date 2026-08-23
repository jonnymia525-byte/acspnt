import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

const USDT_NETWORKS: Record<string, { label: string; min: number; fee: number; walletRegex: string }> = {
  bep20: { label: "USDT (BEP20)", min: 10, fee: 1, walletRegex: "^0x[0-9a-fA-F]{40}$" },
  trc20: { label: "USDT (TRC20)", min: 10, fee: 1, walletRegex: "^T[0-9a-zA-Z]{33}$" },
  erc20: { label: "USDT (ERC20)", min: 10, fee: 2, walletRegex: "^0x[0-9a-fA-F]{40}$" },
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// GET - Vendor's withdrawals
export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Admin can see all withdrawals
  if (user.role === "admin") {
    const withdrawals = await prisma.withdrawal.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true, amount: true, netAmount: true, fee: true, method: true,
        wallet: true, status: true, rejectReason: true, createdAt: true,
        user: { select: { id: true, username: true, email: true } },
      },
    });
    const networks = Object.entries(USDT_NETWORKS).map(([k, v]) => ({ id: k, label: v.label, min: v.min, fee: v.fee }));
    return NextResponse.json({ withdrawals, networks });
  }

  if (user.role !== "vendor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const withdrawals = await prisma.withdrawal.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, amount: true, netAmount: true, fee: true, method: true, wallet: true, status: true, rejectReason: true, createdAt: true },
  });

  const networks = Object.entries(USDT_NETWORKS).map(([k, v]) => ({ id: k, label: v.label, min: v.min, fee: v.fee }));

  return NextResponse.json({ withdrawals, networks });
}

// POST - Create withdrawal or admin actions
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("accsm_user_id")?.value;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body: Record<string, unknown> = await req.json();
    const action = body.action as string;

    // Admin: approve withdrawal
    if (action === "admin_approve") {
      if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const { withdrawalId } = body;
      if (!withdrawalId) return NextResponse.json({ error: "withdrawalId required" }, { status: 400 });
      const withdrawal = await prisma.withdrawal.findUnique({ where: { id: withdrawalId as string } });
      if (!withdrawal) return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (withdrawal.status !== "pending") return NextResponse.json({ error: "Only pending withdrawals can be approved" }, { status: 400 });
      await prisma.withdrawal.update({ where: { id: withdrawalId as string }, data: { status: "approved" } });
      await prisma.activityLog.create({ data: { action: "withdrawal_approved", description: `Admin approved ${withdrawal.amount} USDT withdrawal for ${withdrawal.userId}`, userId } });
      return NextResponse.json({ success: true });
    }

    // Admin: reject withdrawal
    if (action === "admin_reject") {
      if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const { withdrawalId, reason } = body;
      if (!withdrawalId) return NextResponse.json({ error: "withdrawalId required" }, { status: 400 });
      const withdrawal = await prisma.withdrawal.findUnique({ where: { id: withdrawalId as string } });
      if (!withdrawal) return NextResponse.json({ error: "Not found" }, { status: 404 });
      // Refund balance
      await prisma.$transaction([
        prisma.withdrawal.update({ where: { id: withdrawalId as string }, data: { status: "rejected", rejectReason: (reason as string) || "Rejected by admin" } }),
        prisma.user.update({ where: { id: withdrawal.userId }, data: { balance: { increment: withdrawal.amount } } }),
      ]);
      await prisma.activityLog.create({ data: { action: "withdrawal_rejected", description: `Admin rejected ${withdrawal.amount} USDT withdrawal for ${withdrawal.userId}`, userId } });
      return NextResponse.json({ success: true });
    }

    // Vendor: create withdrawal
    if (user.role !== "vendor") return NextResponse.json({ error: "Only vendors can request withdrawals" }, { status: 403 });

    const network = String(body.network ?? "").toLowerCase();
    const amount = Number(body.amount);
    const wallet = String(body.wallet ?? "").trim();

    if (!USDT_NETWORKS[network]) return NextResponse.json({ error: "Invalid network. Use bep20, trc20, or erc20" }, { status: 400 });
    if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

    const net = USDT_NETWORKS[network];
    if (amount < net.min) return NextResponse.json({ error: `Minimum withdrawal is $${net.min}` }, { status: 400 });
    if (amount > 1000000) return NextResponse.json({ error: "Amount too large" }, { status: 400 });
    if (!wallet) return NextResponse.json({ error: "Wallet address is required" }, { status: 400 });
    if (wallet.length > 200) return NextResponse.json({ error: "Wallet address too long" }, { status: 400 });

    // Validate wallet format
    if (!new RegExp(net.walletRegex).test(wallet)) {
      return NextResponse.json({ error: `Invalid ${net.label} wallet address format` }, { status: 400 });
    }

    if (user.balance < amount) return NextResponse.json({ error: `Insufficient balance. Available: $${user.balance.toFixed(2)}` }, { status: 400 });

    const fee = net.fee;
    const netAmount = round2(amount - fee);

    await prisma.user.update({ where: { id: user.id }, data: { balance: { decrement: amount } } });
    const withdrawal = await prisma.withdrawal.create({
      data: { amount, netAmount, fee, method: network, wallet, status: "pending", userId: user.id },
    });
    await prisma.transaction.create({
      data: { type: "withdrawal", amount: -amount, description: `Withdrawal via ${net.label}`, userId: user.id },
    });
    await prisma.activityLog.create({
      data: { action: "withdrawal_requested", description: `${user.username} requested $${amount} USDT withdrawal via ${net.label}`, userId: user.id },
    });

    return NextResponse.json({
      success: true,
      withdrawal: { id: withdrawal.id, amount, netAmount, fee, method: network, networkLabel: net.label, wallet, status: "pending" },
      newBalance: user.balance - amount,
    });
  } catch (err) {
    console.error("Withdrawal error:", err);
    return NextResponse.json({ error: "Withdrawal failed" }, { status: 500 });
  }
}
