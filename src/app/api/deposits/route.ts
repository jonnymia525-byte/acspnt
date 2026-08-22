import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/send-email";
import { cookies } from "next/headers";
import { money } from "@/lib/money";

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const deposits = await prisma.deposit.findMany({
    where: { userId },
    select: { id: true, amount: true, method: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ deposits });
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("accsm_user_id")?.value;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { amount, method } = await req.json();
    const METHODS = ["crypto", "paypal", "stripe", "manual"];
    if (typeof amount !== "number" || !isFinite(amount) || amount < 5) {
      return NextResponse.json({ error: "Minimum deposit is $5" }, { status: 400 });
    }
    if (!METHODS.includes(method)) {
      return NextResponse.json({ error: "Invalid deposit method" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const deposit = await prisma.deposit.create({
      data: { amount, method, status: "completed", completedAt: new Date(), userId },
    });

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { balance: { increment: amount } },
    });

    await prisma.transaction.create({
      data: { type: "deposit", amount, description: `Deposit via ${method}`, userId },
    });

    await prisma.notification.create({
      data: { title: "Deposit confirmed", message: `${money(amount)} added to your balance`, type: "success", userId },
    });

    await prisma.activityLog.create({
      data: { action: "deposit", description: `User deposited ${money(amount)} via ${method}`, userId },
    });

    try {
      await sendEmail({
        to: user.email,
        templateKey: "deposit_confirmation",
        vars: { username: user.username, amount: money(amount), method, new_balance: money(updatedUser.balance) },
        userId,
      });
    } catch {
      console.error("Failed to send deposit confirmation email");
    }

    return NextResponse.json({ success: true, deposit, balance: updatedUser.balance });
  } catch {
    return NextResponse.json({ error: "Deposit failed" }, { status: 500 });
  }
}