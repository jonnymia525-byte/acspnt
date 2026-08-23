// USDT contract addresses on each network
const USDT_CONTRACTS: Record<string, string> = {
  trc20: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", // TRON TRC-20
  bep20: "0x55d398326f99059fF775485246999027B3197955", // BNB Smart Chain (BSC-USD)
  erc20: "0xdAC17F958D2ee523a2206206994597C13D831ec7", // Ethereum USDT
};

// Token decimals per network
const TOKEN_DECIMALS: Record<string, number> = {
  trc20: 6,
  bep20: 18,
  erc20: 6,
};

interface VerifyResult {
  success: boolean;
  reason?: string;
  confirmed?: boolean;
  amount?: number;
  to?: string;
}

// ─── TRC-20 (TRON) Verification ───────────────────────────────────────────────
async function verifyTRC20(
  txHash: string,
  expectedAmount: number,
  targetAddress: string
): Promise<VerifyResult> {
  try {
    const url = `https://apilist.tronscanapi.com/api/transaction-info?hash=${txHash}`;
    const response = await fetch(url);
    const tx = await response.json();

    if (!tx || !tx.confirmed || tx.contractRet !== "SUCCESS") {
      return {
        success: false,
        reason: "Transaction not confirmed or failed on TRON network.",
        confirmed: false,
      };
    }

    const trc20Transfers = tx.trc20TransferInfo || [];
    const matched = trc20Transfers.find((transfer: any) => {
      const decimals = transfer.decimals || 6;
      const actualAmount = parseFloat(transfer.amount_str) / Math.pow(10, decimals);
      const isRecipient = transfer.to_address?.toLowerCase() === targetAddress.toLowerCase();
      const isContract =
        transfer.contract_address?.toLowerCase() ===
        USDT_CONTRACTS.trc20.toLowerCase();
      const isAmount = Math.abs(actualAmount - expectedAmount) < 0.000001;
      return isRecipient && isContract && isAmount;
    });

    if (matched) {
      return { success: true, confirmed: true, amount: expectedAmount };
    }
    return {
      success: false,
      reason: "Amount, recipient, or token contract did not match expected values.",
    };
  } catch (error: any) {
    return { success: false, reason: `TRON verification error: ${error.message}` };
  }
}

// ─── EVM (BEP-20 & ERC-20) Verification ──────────────────────────────────────
async function verifyEVM({
  apiBaseUrl,
  txHash,
  expectedAmount,
  targetAddress,
  tokenContract,
  decimals = 18,
}: {
  apiBaseUrl: string;
  txHash: string;
  expectedAmount: number;
  targetAddress: string;
  tokenContract: string;
  decimals: number;
}): Promise<VerifyResult> {
  try {
    // Check transaction receipt (confirms it succeeded on-chain)
    const receiptUrl = `${apiBaseUrl}?module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}`;
    const receiptRes = await fetch(receiptUrl);
    const receiptData = await receiptRes.json();
    const receipt = receiptData?.result;

    if (!receipt) {
      return { success: false, reason: "Transaction not found on this network.", confirmed: false };
    }
    if (receipt.status !== "0x1") {
      return { success: false, reason: "Transaction failed on-chain." };
    }

    // Fetch token transfer logs for the target address
    const logsUrl = `${apiBaseUrl}?module=account&action=tokentx&address=${targetAddress}&startblock=0&endblock=99999999&sort=desc`;
    const logsRes = await fetch(logsUrl);
    const logsData = await logsRes.json();
    const transfers = logsData?.result;

    if (!Array.isArray(transfers)) {
      return { success: false, reason: "Could not fetch token transfer logs." };
    }

    const matched = transfers.find((tx: any) => {
      const actualAmount =
        parseFloat(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal || String(decimals)));
      const isHash = tx.hash?.toLowerCase() === txHash.toLowerCase();
      const isRecipient = tx.to?.toLowerCase() === targetAddress.toLowerCase();
      const isContract =
        tx.contractAddress?.toLowerCase() === tokenContract.toLowerCase();
      const isAmount = Math.abs(actualAmount - expectedAmount) < 0.000001;
      return isHash && isRecipient && isContract && isAmount;
    });

    if (matched) {
      return { success: true, confirmed: true, amount: expectedAmount };
    }
    return {
      success: false,
      reason: "Amount, recipient, or token contract did not match expected values.",
    };
  } catch (error: any) {
    return { success: false, reason: `EVM verification error: ${error.message}` };
  }
}

// ─── Main verification entry point ────────────────────────────────────────────
export async function verifyDeposit(
  network: string,
  txHash: string,
  expectedAmount: number,
  targetAddress: string
): Promise<VerifyResult> {
  const contract = USDT_CONTRACTS[network];
  const decimals = TOKEN_DECIMALS[network] || 18;

  switch (network) {
    case "trc20":
      return verifyTRC20(txHash, expectedAmount, targetAddress);

    case "bep20":
      return verifyEVM({
        apiBaseUrl: "https://api.bscscan.com/api",
        txHash,
        expectedAmount,
        targetAddress,
        tokenContract: contract,
        decimals,
      });

    case "erc20":
      return verifyEVM({
        apiBaseUrl: "https://api.etherscan.io/api",
        txHash,
        expectedAmount,
        targetAddress,
        tokenContract: contract,
        decimals,
      });

    default:
      return { success: false, reason: "Unsupported network." };
  }
}

// Check if a txHash has already been used (replay protection)
export async function isTxHashUsed(txHash: string, excludeDepositId?: string): Promise<boolean> {
  const { prisma } = await import("@/lib/prisma");
  const where: any = { txHash };
  if (excludeDepositId) where.id = { not: excludeDepositId };
  const existing = await prisma.deposit.findFirst({ where });
  return !!existing;
}
