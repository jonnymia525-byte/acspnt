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

    const body = await req.json();
    const { action, productId, index, newValue } = body;
    if (!productId || index === undefined || index === null) {
      return NextResponse.json({ error: "productId and index required" }, { status: 400 });
    }
    if (action !== "edit" && action !== "delete") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.vendorId !== userId) {
      return NextResponse.json({ error: "Product not found or not yours" }, { status: 404 });
    }

    const lines = (product.accountsData || "")
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);

    if (index < 0 || index >= lines.length) {
      return NextResponse.json({ error: "Account index out of range" }, { status: 400 });
    }

    if (action === "edit") {
      const val = String(newValue ?? "").trim();
      if (!val) return NextResponse.json({ error: "Account value cannot be empty" }, { status: 400 });
      // Prevent duplicates against this product's other lines
      const lower = val.toLowerCase();
      if (lines.some((l, i) => i !== index && l.toLowerCase() === lower)) {
        return NextResponse.json({ error: "This account already exists in this product" }, { status: 400 });
      }
      lines[index] = val;
    } else {
      lines.splice(index, 1);
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        accountsData: lines.join("\n"),
        stock: lines.length,
        status: product.status === "approved" ? "pending" : product.status,
      },
    });

    const actionWord = action === "edit" ? "edited" : "deleted";
    await prisma.activityLog.create({
      data: {
        action: `vendor_account_${action}`,
        description: `Vendor ${user.username} ${actionWord} an account in "${product.title}" (remaining: ${lines.length})`,
        userId: user.id,
      },
    });

    // Notify all admins for re-approval
    const admins = await prisma.user.findMany({ where: { role: "admin" }, select: { id: true } });
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          title: "Account " + (action === "edit" ? "Edited" : "Deleted"),
          message: `Vendor @${user.username} ${actionWord} an account in "${product.title}". Requires re-approval.`,
          type: "warning",
          section: "products",
          userId: admin.id,
        },
      });
    }

    return NextResponse.json({ success: true, stock: updatedProduct.stock, status: updatedProduct.status });
  } catch (err) {
    console.error("Account update failed:", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}