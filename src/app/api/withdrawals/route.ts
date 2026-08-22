import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/send-email";
import { cookies } from "next/headers";
import { money } from "@/lib/money";

interface WithdrawalMethod {
  id: string;
  label: string;
  min: number;
  fee: number;
}

const METHODS: WithdrawalMethod[] = [
  { id: "usdt_trc20", label: "USDT (TRC20)", min: 10, fee: 1 },
  { id: "btc", label: "Bitcoin (BTC)", min: 20, fee: 2 },
  { id: "eth", label: "Ethereum (ETH)", min: 20, fee: 5 },
  { id: "paypal", label: "PayPal", min: 20, fee: 0 },
  { id: "bank", label: "Bank Transfer", min: 100, fee: 0 },
];

const METHOD_IDS = METHODS.map((m) => m.id);
const METHOD_FEE: Record<string, number> = Object.fromEntries(METHODS.map((m) => [m.id, m.fee]));
const METHOD_MIN: Record<string, number> = Object.fromEntries(METHODS.map((m) => [m.id, m.min]));

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "vendor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const withdrawals = await prisma.withdrawal.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, amount: true, netAmount: true, fee: true, method: true, wallet: true, status: true, rejectReason: true, createdAt: true },
  });

  const methods = METHODS.map((m) => ({ id: m.id, label: m.label, min: m.min, fee: m.fee }));

  return NextResponse.json({ withdrawals, methods });
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("accsm_user_id")?.value;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== "vendor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body: Record<string, unknown> = await req.json();
    const amount = Number(body.amount);
    const method = String(body.method ?? "");
    const wallet = String(body.wallet ?? "").trim();

    if (!METHOD_IDS.includes(method)) {
      return NextResponse.json({ error: "Invalid method" }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    const minAmount = METHOD_MIN[method];
    if (amount < minAmount) {
      return NextResponse.json({ error: "Minimum withdrawal is $" + minAmount }, { status: 400 });
    }
    if (!wallet) return NextResponse.json({ error: "Wallet is required" }, { status: 400 });
    if (user.balance < amount) {
      return NextResponse.json({ error: "Insufficient balance", balance: user.balance }, { status: 400 });
    }

    const fee = METHOD_FEE[method];
    const netAmount = round2(amount - fee);

    await prisma.user.update({ where: { id: user.id }, data: { balance: { decrement: amount } } });
    const withdrawal = await prisma.withdrawal.create({
      data: { amount, netAmount, fee, method, wallet, status: "pending", userId: user.id },
    });
    await prisma.transaction.create({
      data: { type: "withdrawal", amount: -amount, description: "Withdrawal via " + method, userId: user.id },
    });
    await prisma.activityLog.create({
      data: { action: "withdrawal_requested", description: user.username + " requested withdrawal of " + money(amount), userId: user.id },
    });
    await prisma.notification.create({
      data: { title: "Withdrawal requested", message: "$" + amount + " pending approval", type: "info", userId: user.id },
    });
    try {
      await sendEmail({
        to: user.email,
        templateKey: "withdrawal_requested",
        vars: { username: user.username, amount: money(amount), method, wallet },
        userId: user.id,
      });
    } catch (err) {
      console.error("Withdrawal email failed:", err);
    }

    return NextResponse.json({
      success: true,
      withdrawal: { id: withdrawal.id, amount: withdrawal.amount, netAmount: withdrawal.netAmount, fee: withdrawal.fee, method: withdrawal.method, wallet: withdrawal.wallet, status: withdrawal.status },
      newBalance: user.balance - amount,
    });
  } catch (err) {
    console.error("Withdrawal creation failed:", err);
    return NextResponse.json({ error: "Withdrawal failed" }, { status: 500 });
  }
}

