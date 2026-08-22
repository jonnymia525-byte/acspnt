import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/send-email";
import { cookies } from "next/headers";
import { money } from "@/lib/money";

const USDT_NETWORKS: Record<string, { label: string; explorer: string; explorerApi: string; minDeposit: number }> = {
  trc20: { label: "TRC20 (TRON)", explorer: "TRONSCAN", explorerApi: "https://apilist.tronscanapi.com/api/transaction", minDeposit: 5 },
  bep20: { label: "BEP20 (BNB Smart Chain)", explorer: "BscScan", explorerApi: "https://api.bscscan.com/api", minDeposit: 5 },
  erc20: { label: "ERC20 (Ethereum)", explorer: "Etherscan", explorerApi: "https://api.etherscan.io/api", minDeposit: 10 },
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

// Generate a unique fractional amount to make each deposit trackable
// Uses timestamp-based unique suffix to minimize collision risk
function generateExactAmount(baseAmount: number): number {
  // Use last 5 digits of high-resolution timestamp for uniqueness
  const ts = Date.now();
  const suffix = ((ts % 100000) + Math.floor(Math.random() * 10)) / 1000000; // 0.00001 - 0.10000
  return Math.round((baseAmount + suffix) * 100000) / 100000;
}

// GET - list user's deposits
export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const deposits = await prisma.deposit.findMany({
    where: { userId },
    select: {
      id: true, amount: true, method: true, status: true, txId: true,
      network: true, exactAmount: true, txHash: true,
      createdAt: true, completedAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ deposits });
}

// POST - create a new deposit or verify a deposit
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("accsm_user_id")?.value;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // ACTION: create_deposit - generate exact amount and QR code info
    if (action === "create_deposit") {
      const { amount, network } = body;
      const netConfig = USDT_NETWORKS[network];

      if (!netConfig) {
        return NextResponse.json({ error: "Invalid network. Use trc20, bep20, or erc20" }, { status: 400 });
      }
      if (typeof amount !== "number" || !isFinite(amount) || amount < netConfig.minDeposit) {
        return NextResponse.json({ error: `Minimum deposit is ${netConfig.minDeposit} USDT` }, { status: 400 });
      }

      const wallets = await getWalletAddresses();
      const walletAddress = wallets[network];
      if (!walletAddress) {
        return NextResponse.json({ error: `No wallet configured for ${netConfig.label}. Please contact support.` }, { status: 400 });
      }

      const exactAmount = generateExactAmount(amount);

      // Create pending deposit
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
        minConfirmations: network === "erc20" ? 12 : network === "bep20" ? 15 : 20,
      });
    }

    // ACTION: verify_deposit - user submits txHash after sending USDT
    if (action === "verify_deposit") {
      const { depositId, txHash } = body;

      if (!depositId || !txHash) {
        return NextResponse.json({ error: "depositId and txHash are required" }, { status: 400 });
      }

      // Find the pending deposit
      const deposit = await prisma.deposit.findUnique({ where: { id: depositId } });
      if (!deposit) {
        return NextResponse.json({ error: "Deposit not found" }, { status: 404 });
      }
      if (deposit.userId !== userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
      if (deposit.status !== "pending") {
        return NextResponse.json({ error: "This deposit has already been processed" }, { status: 400 });
      }

      // Check for duplicate txHash across ALL deposits
      const existingTx = await prisma.deposit.findFirst({
        where: { txHash, id: { not: depositId } },
      });
      if (existingTx) {
        return NextResponse.json({
          error: "This transaction ID has already been used for another deposit. Please double-check and use the correct transaction ID from your wallet.",
        }, { status: 400 });
      }

      // Update deposit with txHash and mark as verifying
      await prisma.deposit.update({
        where: { id: depositId },
        data: { txHash, status: "verifying" },
      });

      // TODO: In production, verify against blockchain API here
      // For now, auto-approve after verification request
      // The admin can also manually verify from the dashboard
      await prisma.activityLog.create({
        data: {
          action: "deposit_verification_submitted",
          description: `User submitted txHash ${txHash.substring(0, 16)}... for ${deposit.exactAmount} USDT deposit`,
          userId,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Transaction submitted for verification. Your deposit will be credited once confirmed on the blockchain.",
        depositId,
        status: "verifying",
      });
    }

    return NextResponse.json({ error: "Unknown action. Use create_deposit or verify_deposit." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Deposit failed" }, { status: 500 });
  }
}
