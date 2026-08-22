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

    const accounts = accountsData
      .split(/\r?\n/)
      .map((line: string) => line.trim())
      .filter(Boolean);

    if (accounts.length === 0) {
      return NextResponse.json({ error: "At least one account is required" }, { status: 400 });
    }

    // Append new accounts to existing accountsData
    const existingAccounts = (product.accountsData || "").split(/\r?\n/).filter(Boolean);
    const allAccounts = [...existingAccounts, ...accounts];

    // Update product with new stock and accounts data
    // Status stays "pending" until admin approves the new batch
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        accountsData: allAccounts.join("\n"),
        stock: allAccounts.length,
        // If product was approved, set back to pending for re-review of new accounts
        status: product.status === "approved" ? "pending" : product.status,
      },
    });

    // Log the activity
    await prisma.activityLog.create({
      data: {
        action: "vendor_upload_more",
        description: `Vendor ${user.username} uploaded ${accounts.length} more accounts to "${product.title}" (total: ${allAccounts.length})`,
        userId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      added: accounts.length,
      totalStock: allAccounts.length,
      status: updatedProduct.status,
    });
  } catch (err) {
    console.error("Upload more failed:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
