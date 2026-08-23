import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyDeposit, isTxHashUsed } from "@/lib/verify-crypto";

const USDT_NETWORKS: Record<
  string,
  { label: string; explorer: string; minDeposit: number; confirmations: number }
> = {
  trc20: {
    label: "TRC20 (TRON)",
    explorer: "TRONSCAN",
    minDeposit: 5,
    confirmations: 20,
  },
  bep20: {
    label: "BEP20 (BNB Smart Chain)",
    explorer: "BscScan",
    minDeposit: 5,
    confirmations: 15,
  },
  erc20: {
    label: "ERC20 (Ethereum)",
    explorer: "Etherscan",
    minDeposit: 10,
    confirmations: 12,
  },
};

// Fetch wallet addresses from settings
async function getWalletAddresses(): Promise<Record<string, string>> {
  const settings = await prisma.setting.findMany({
    where: { key: { in: ["wallet_trc20", "wallet_bep20", "wallet_erc20"] } },
  });
  const map: Record<string, string> = {};
  for (const s of settings) {
    const network = s.key.replace("wallet_", "");
    map[network] = s.value;
  }
  return map;
}

// Generate unique fractional amount for tracking
function generateExactAmount(baseAmount: number): number {
  const ts = Date.now();
  const suffix = ((ts % 100000) + Math.floor(Math.random() * 10)) / 1000000;
  return Math.round((baseAmount + suffix) * 100000) / 100000;
}

// GET - list user's deposits (or admin list all deposits)
export async function GET(req: Request) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  // Admin can list all deposits
  if (action === "admin_list") {
    const admin = await prisma.user.findUnique({ where: { id: userId } });
    if (!admin || admin.role !== "admin")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const deposits = await prisma.deposit.findMany({
      select: {
        id: true,
        amount: true,
        exactAmount: true,
        method: true,
        status: true,
        txId: true,
        network: true,
        txHash: true,
        createdAt: true,
        completedAt: true,
        user: { select: { id: true, username: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json({ deposits });
  }

  const deposits = await prisma.deposit.findMany({
    where: { userId },
    select: {
      id: true,
      amount: true,
      method: true,
      status: true,
      txId: true,
      network: true,
      exactAmount: true,
      txHash: true,
      createdAt: true,
      completedAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ deposits });
}

// POST - create deposit or verify deposit
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("accsm_user_id")?.value;
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    // ─── CREATE DEPOSIT ─────────────────────────────────────────────
    if (action === "create_deposit") {
      const { amount, network } = body;
      const netConfig = USDT_NETWORKS[network];

      if (!netConfig) {
        return NextResponse.json(
          { error: "Invalid network. Use trc20, bep20, or erc20" },
          { status: 400 }
        );
      }
      if (
        typeof amount !== "number" ||
        !isFinite(amount) ||
        amount < netConfig.minDeposit
      ) {
        return NextResponse.json(
          { error: `Minimum deposit is ${netConfig.minDeposit} USDT` },
          { status: 400 }
        );
      }

      const wallets = await getWalletAddresses();
      const walletAddress = wallets[network];
      if (!walletAddress) {
        return NextResponse.json(
          {
            error: `No wallet configured for ${netConfig.label}. Please contact support.`,
          },
          { status: 400 }
        );
      }

      const exactAmount = generateExactAmount(amount);

      const deposit = await prisma.deposit.create({
        data: {
          amount,
          exactAmount,
          method: "usdt",
          network,
          status: "pending",
          userId,
        },
      });

      await prisma.activityLog.create({
        data: {
          action: "deposit_initiated",
          description: `User initiated ${exactAmount} USDT deposit via ${netConfig.label}`,
          userId,
        },
      });

      return NextResponse.json({
        success: true,
        depositId: deposit.id,
        exactAmount,
        network,
        networkLabel: netConfig.label,
        walletAddress,
        explorer: netConfig.explorer,
        minConfirmations: netConfig.confirmations,
      });
    }

    // ─── VERIFY DEPOSIT (with real blockchain check) ────────────────
    if (action === "verify_deposit") {
      const { depositId, txHash } = body;

      if (!depositId || !txHash?.trim()) {
        return NextResponse.json(
          { error: "depositId and txHash are required" },
          { status: 400 }
        );
      }

      const trimmedTxHash = txHash.trim();

      // Find pending deposit
      const deposit = await prisma.deposit.findUnique({
        where: { id: depositId },
      });
      if (!deposit) {
        return NextResponse.json(
          { error: "Deposit not found" },
          { status: 404 }
        );
      }
      if (deposit.userId !== userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
      if (deposit.status !== "pending") {
        return NextResponse.json(
          { error: "This deposit has already been processed" },
          { status: 400 }
        );
      }

      // Check for duplicate txHash
      const used = await isTxHashUsed(trimmedTxHash, depositId);
      if (used) {
        return NextResponse.json(
          {
            error:
              "This transaction ID has already been used. Please double-check your transaction ID.",
          },
          { status: 400 }
        );
      }

      // Get wallet address for this network
      const wallets = await getWalletAddresses();
      const walletAddress = wallets[deposit.network || "trc20"];
      if (!walletAddress) {
        return NextResponse.json(
          { error: "Wallet not configured" },
          { status: 500 }
        );
      }

      // ─── REAL BLOCKCHAIN VERIFICATION ─────────────────────────────
      const verifyResult = await verifyDeposit(
        deposit.network || "trc20",
        trimmedTxHash,
        deposit.exactAmount || deposit.amount,
        walletAddress
      );

      if (!verifyResult.success) {
        // Still save the txHash but keep as pending — user might have wrong network
        await prisma.deposit.update({
          where: { id: depositId },
          data: { txHash: trimmedTxHash, status: "pending" },
        });
        await prisma.activityLog.create({
          data: {
            action: "deposit_verification_failed",
            description: `Verification failed for txHash ${trimmedTxHash.substring(0, 16)}... — ${verifyResult.reason}`,
            userId,
          },
        });
        return NextResponse.json(
          { success: false, error: verifyResult.reason },
          { status: 400 }
        );
      }

      // ─── VERIFIED — credit user balance ───────────────────────────
      const creditedAmount = deposit.exactAmount || deposit.amount;
      await prisma.user.update({
        where: { id: userId },
        data: { balance: { increment: creditedAmount } },
      });
      await prisma.deposit.update({
        where: { id: depositId },
        data: {
          txHash: trimmedTxHash,
          status: "completed",
          completedAt: new Date(),
        },
      });

      await prisma.activityLog.create({
        data: {
          action: "deposit_verified",
          description: `Deposit of $${creditedAmount.toFixed(2)} USDT verified and credited via ${deposit.network?.toUpperCase()}`,
          userId,
        },
      });

      // Notify user
      await prisma.notification
        .create({
          data: {
            userId,
            title: "Deposit Confirmed",
            message: `Your deposit of ${creditedAmount.toFixed(2)} USDT has been verified and credited to your balance.`,
          },
        })
        .catch(() => {});

      const updatedUser = await prisma.user.findUnique({ where: { id: userId } });

      return NextResponse.json({
        success: true,
        message: `Payment verified! ${creditedAmount.toFixed(2)} USDT has been credited to your balance.`,
        newBalance: updatedUser?.balance,
        status: "completed",
      });
    }

    // ─── CHECK DEPOSIT STATUS ───────────────────────────────────────
    if (action === "check_status") {
      const { depositId } = body;
      const deposit = await prisma.deposit.findUnique({ where: { id: depositId } });
      if (!deposit) {
        return NextResponse.json({ error: "Deposit not found" }, { status: 404 });
      }
      return NextResponse.json({
        status: deposit.status,
        amount: deposit.amount,
        exactAmount: deposit.exactAmount,
        txHash: deposit.txHash,
        completedAt: deposit.completedAt,
      });
    }

    return NextResponse.json(
      { error: "Unknown action. Use create_deposit, verify_deposit, or check_status." },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("Deposit error:", err);
    return NextResponse.json({ error: "Deposit failed" }, { status: 500 });
  }
}
