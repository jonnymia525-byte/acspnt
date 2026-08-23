import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("accsm_user_id")?.value;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== "vendor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { productId, accountsData } = await req.json();

    if (!productId || !accountsData) {
      return NextResponse.json({ error: "Product ID and accounts data required" }, { status: 400 });
    }

    // Verify the product belongs to this vendor
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.vendorId !== userId) {
      return NextResponse.json({ error: "Product not found or not yours" }, { status: 404 });
    }

    // Limit payload size
    if (accountsData.length > 100000) return NextResponse.json({ error: "Accounts data too large" }, { status: 400 });

    const accounts = accountsData
      .split(/\r?\n/)
      .map((line: string) => line.trim())
      .filter(Boolean);

    if (accounts.length === 0) {
      return NextResponse.json({ error: "At least one account is required" }, { status: 400 });
    }
    if (accounts.length > 10000) {
      return NextResponse.json({ error: "Too many accounts at once (max 10,000)" }, { status: 400 });
    }

    // Server-side duplicate check across all vendor products
    const vendorProducts = await prisma.product.findMany({
      where: { vendorId: userId },
      select: { id: true, title: true, accountsData: true },
    });
    const existingLines = new Set<string>();
    for (const p of vendorProducts) {
      if (p.id === productId) continue;
      if (p.accountsData) {
        p.accountsData.split(/\r?\n/).forEach((line: string) => {
          const trimmed = line.trim();
          if (trimmed) existingLines.add(trimmed.toLowerCase());
        });
      }
    }
    // Filter out duplicates from new accounts
    const uniqueAccounts: string[] = [];
    const duplicateCount = { value: 0 };
    for (const account of accounts) {
      if (existingLines.has(account.toLowerCase())) {
        duplicateCount.value++;
      } else {
        uniqueAccounts.push(account);
        existingLines.add(account.toLowerCase());
      }
    }

    if (uniqueAccounts.length === 0) {
      return NextResponse.json({ error: `All ${accounts.length} accounts are duplicates of existing products` }, { status: 400 });
    }

    // Append new accounts to existing accountsData
    const existingAccounts = (product.accountsData || "").split(/\r?\n/).filter(Boolean);
    const allAccounts = [...existingAccounts, ...uniqueAccounts];

    // Update product with new stock and accounts data
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        accountsData: allAccounts.join("\n"),
        stock: allAccounts.length,
        status: product.status === "approved" ? "pending" : product.status,
      },
    });

    await prisma.activityLog.create({
      data: {
        action: "vendor_upload_more",
        description: `Vendor ${user.username} uploaded ${uniqueAccounts.length} accounts to "${product.title}" (total: ${allAccounts.length}${duplicateCount.value > 0 ? `, ${duplicateCount.value} duplicates removed` : ''})`,
        userId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      added: uniqueAccounts.length,
      duplicatesRemoved: duplicateCount.value,
      totalStock: allAccounts.length,
      status: updatedProduct.status,
    });
  } catch (err) {
    console.error("Upload more failed:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

// GET - Check for duplicates across all vendor products
export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("accsm_user_id")?.value;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== "vendor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const url = new URL(req.url);
    const productId = url.searchParams.get("productId");
    const accountsData = url.searchParams.get("accounts");

    if (!accountsData) return NextResponse.json({ error: "No accounts data provided" }, { status: 400 });

    const newAccounts = accountsData.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
    if (newAccounts.length === 0) return NextResponse.json({ duplicates: [], total: 0 });

    // Get all products owned by this vendor
    const vendorProducts = await prisma.product.findMany({
      where: { vendorId: userId },
      select: { id: true, title: true, accountsData: true },
    });

    // Build a set of all existing account lines (excluding the target product if specified)
    const existingLines = new Set<string>();
    for (const p of vendorProducts) {
      if (productId && p.id === productId) continue; // Skip current product
      if (p.accountsData) {
        p.accountsData.split(/\r?\n/).forEach((line: string) => {
          const trimmed = line.trim();
          if (trimmed) existingLines.add(trimmed.toLowerCase());
        });
      }
    }

    // Find duplicates
    const duplicates: Array<{ line: string; index: number; productId?: string; productTitle?: string }> = [];
    for (let i = 0; i < newAccounts.length; i++) {
      const normalized = newAccounts[i].toLowerCase();
      if (existingLines.has(normalized)) {
        // Find which product it belongs to
        let foundIn: { id: string; title: string } | null = null;
        for (const p of vendorProducts) {
          if (productId && p.id === productId) continue;
          if (p.accountsData) {
            const lines = p.accountsData.split(/\r?\n/).map((l: string) => l.trim().toLowerCase());
            if (lines.includes(normalized)) {
              foundIn = { id: p.id, title: p.title };
              break;
            }
          }
        }
        duplicates.push({
          line: newAccounts[i],
          index: i,
          productId: foundIn?.id,
          productTitle: foundIn?.title,
        });
      }
    }

    return NextResponse.json({ duplicates, total: newAccounts.length, duplicateCount: duplicates.length });
  } catch (err) {
    console.error("Duplicate check failed:", err);
    return NextResponse.json({ error: "Check failed" }, { status: 500 });
  }
}
