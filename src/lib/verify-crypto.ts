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
  partial?: boolean;
  actualAmount?: number;
  expectedAmount?: number;
}

const RETRY_DELAY_MS = 2000;

// Fetch JSON with retry: up to `retries` retries with a 2s delay between attempts
async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retries = 3
): Promise<Record<string, unknown>> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      const data: Record<string, unknown> = await response.json();
      const message = typeof data.message === "string" ? data.message : "";
      const benign = /no transactions found|no records found|not found/i.test(message);
      if (data.status === "0" && !benign) {
        const detail = String(data.result || data.message || "API returned an error");
        throw new Error(detail);
      }
      if (data.error) {
        const errMsg =
          typeof data.error === "object" && data.error !== null && "message" in data.error
            ? String((data.error as { message: unknown }).message)
            : "API returned an error";
        throw new Error(errMsg);
      }
      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }
  throw lastError;
}

// Lazy loader for Etherscan/BscScan API keys stored in settings
async function getApiKey(network: "bep20" | "erc20"): Promise<string | null> {
  const { prisma } = await import("@/lib/prisma");
  const key = network === "bep20" ? "bscscan_api_key" : "etherscan_api_key";
  const setting = await prisma.setting.findUnique({ where: { key } });
  return setting?.value || null;
}

// ─── TRC-20 (TRON) Verification ───────────────────────────────────────────────
async function verifyTRC20(
  txHash: string,
  expectedAmount: number,
  targetAddress: string
): Promise<VerifyResult> {
  try {
    const url = `https://apilist.tronscanapi.com/api/transaction-info?hash=${txHash}`;
    const tx = await fetchWithRetry(url);

    if (!tx || !tx.confirmed || tx.contractRet !== "SUCCESS") {
      return {
        success: false,
        reason: "Transaction not confirmed or failed on TRON network.",
        confirmed: false,
      };
    }

    const trc20Transfers: Array<{
      to_address?: string;
      contract_address?: string;
      amount_str?: string;
      decimals?: number;
    }> = Array.isArray(tx.trc20TransferInfo) ? tx.trc20TransferInfo : [];
    const candidate = trc20Transfers.find((transfer) => {
      const isRecipient = transfer.to_address?.toLowerCase() === targetAddress.toLowerCase();
      const isContract =
        transfer.contract_address?.toLowerCase() ===
        USDT_CONTRACTS.trc20.toLowerCase();
      return isRecipient && isContract;
    });

    if (candidate) {
      const decimals = candidate.decimals || 6;
      const actualAmount = parseFloat(candidate.amount_str || "") / Math.pow(10, decimals);
      const diff = Math.abs(actualAmount - expectedAmount);
      if (diff < 0.000001) {
        return { success: true, confirmed: true, amount: expectedAmount };
      }
      if (diff <= expectedAmount * 0.05) {
        return {
          success: false,
          reason: "Amount mismatch",
          partial: true,
          actualAmount,
          expectedAmount,
        };
      }
    }
    return {
      success: false,
      reason: "Amount, recipient, or token contract did not match expected values.",
    };
  } catch (error) {
    return {
      success: false,
      reason: `TRON verification error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ─── EVM (BEP-20 & ERC-20) Verification ──────────────────────────────────────
async function verifyEVM({
  apiBaseUrl,
  apiKey,
  txHash,
  expectedAmount,
  targetAddress,
  tokenContract,
  decimals = 18,
}: {
  apiBaseUrl: string;
  apiKey?: string | null;
  txHash: string;
  expectedAmount: number;
  targetAddress: string;
  tokenContract: string;
  decimals: number;
}): Promise<VerifyResult> {
  try {
    const keyParam = apiKey ? `&apikey=${apiKey}` : "";

    // Check transaction receipt (confirms it succeeded on-chain)
    const receiptUrl = `${apiBaseUrl}?module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}${keyParam}`;
    const receiptData = await fetchWithRetry(receiptUrl);
    const receipt = receiptData?.result as { status?: string } | null | undefined;

    if (!receipt) {
      return { success: false, reason: "Transaction not found on this network.", confirmed: false };
    }
    if (receipt.status !== "0x1") {
      return { success: false, reason: "Transaction failed on-chain." };
    }

    // Fetch token transfer logs for the target address
    const logsUrl = `${apiBaseUrl}?module=account&action=tokentx&address=${targetAddress}&startblock=0&endblock=99999999&sort=desc${keyParam}`;
    const logsData = await fetchWithRetry(logsUrl);
    const transfers: Array<{
      hash?: string;
      to?: string;
      contractAddress?: string;
      value?: string;
      tokenDecimal?: string;
    }> = Array.isArray(logsData?.result) ? logsData.result : [];

    if (!Array.isArray(logsData?.result)) {
      return { success: false, reason: "Could not fetch token transfer logs." };
    }

    const candidate = transfers.find((tx) => {
      const isHash = tx.hash?.toLowerCase() === txHash.toLowerCase();
      const isRecipient = tx.to?.toLowerCase() === targetAddress.toLowerCase();
      const isContract =
        tx.contractAddress?.toLowerCase() === tokenContract.toLowerCase();
      return isHash && isRecipient && isContract;
    });

    if (candidate) {
      const actualAmount =
        parseFloat(candidate.value || "") / Math.pow(10, parseInt(candidate.tokenDecimal || String(decimals)));
      const diff = Math.abs(actualAmount - expectedAmount);
      if (diff < 0.000001) {
        return { success: true, confirmed: true, amount: expectedAmount };
      }
      if (diff <= expectedAmount * 0.05) {
        return {
          success: false,
          reason: "Amount mismatch",
          partial: true,
          actualAmount,
          expectedAmount,
        };
      }
    }
    return {
      success: false,
      reason: "Amount, recipient, or token contract did not match expected values.",
    };
  } catch (error) {
    return {
      success: false,
      reason: `EVM verification error: ${error instanceof Error ? error.message : String(error)}`,
    };
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
        apiKey: await getApiKey("bep20"),
        txHash,
        expectedAmount,
        targetAddress,
        tokenContract: contract,
        decimals,
      });

    case "erc20":
      return verifyEVM({
        apiBaseUrl: "https://api.etherscan.io/api",
        apiKey: await getApiKey("erc20"),
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
  const where: Record<string, unknown> = { txHash };
  if (excludeDepositId) where.id = { not: excludeDepositId };
  const existing = await prisma.deposit.findFirst({ where });
  return !!existing;
}
