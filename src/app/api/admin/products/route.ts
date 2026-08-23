import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

async function requireAdmin() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "admin") return null;
  return user;
}

// GET - fetch products for review
export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "list";

  if (action === "list") {
    const status = url.searchParams.get("status") || undefined;
    const products = await prisma.product.findMany({
      where: status ? { status } : {},
      select: {
        id: true, title: true, description: true, platform: true, category: true,
        vendorPrice: true, storePrice: true, stock: true, status: true,
        deliveryFormat: true, countryRegister: true, originalMail: true,
        country: true, createdAt: true,
        vendor: { select: { id: true, username: true, name: true, vendorStatus: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    // Check for duplicates: same title + vendor
    const titleVendorMap = new Map<string, number>();
    products.forEach(p => {
      const key = `${p.title}::${p.vendor.id}`;
      titleVendorMap.set(key, (titleVendorMap.get(key) || 0) + 1);
    });
    const productsWithMeta = products.map(p => ({
      ...p,
      isDuplicate: (titleVendorMap.get(`${p.title}::${p.vendor.id}`) || 0) > 1,
    }));
    return NextResponse.json({ products: productsWithMeta });
  }

  if (action === "detail") {
    const productId = url.searchParams.get("productId");
    if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        vendor: { select: { id: true, username: true, name: true, email: true, vendorStatus: true, balance: true } },
        listing: { select: { id: true, title: true, platform: true } },
        purchases: { select: { id: true, quantity: true, total: true, status: true, createdAt: true, buyer: { select: { id: true, username: true } } }, orderBy: { createdAt: "desc" }, take: 20 },
        reviews: { select: { id: true, rating: true, comment: true, createdAt: true, buyer: { select: { id: true, username: true } } }, orderBy: { createdAt: "desc" }, take: 10 },
      },
    });
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ product });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// POST - admin product actions
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { action, productId, ...data } = body;

  if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });

  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true, title: true, vendorId: true, vendorPrice: true, stock: true, status: true } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  switch (action) {
    case "approve": {
      await prisma.product.update({ where: { id: productId }, data: { status: "approved", visible: true } });
      await prisma.activityLog.create({ data: { action: "product_approved", description: `Admin approved "${product.title}"`, userId: admin.id } });
      await prisma.notification.create({ data: { userId: product.vendorId, title: "Product Approved", message: `Your product "${product.title}" has been approved and is now live.`, section: 'products' } });
      return NextResponse.json({ success: true });
    }

    case "reject": {
      if (!data.reason) return NextResponse.json({ error: "reason required" }, { status: 400 });
      await prisma.product.update({ where: { id: productId }, data: { status: "rejected", visible: false } });
      await prisma.activityLog.create({ data: { action: "product_rejected", description: `Admin rejected "${product.title}": ${data.reason}`, userId: admin.id } });
      await prisma.notification.create({ data: { userId: product.vendorId, title: "Product Rejected", message: `Your product "${product.title}" was rejected. Reason: ${data.reason}`, section: 'products' } });
      return NextResponse.json({ success: true });
    }

    case "delete": {
      // Soft delete
      await prisma.notification.create({ data: { userId: product.vendorId, title: "Product Removed", message: `Your product "${product.title}" has been removed by admin.`, section: 'products' } });
      await prisma.activityLog.create({ data: { action: "product_deleted", description: `Admin deleted "${product.title}"`, userId: admin.id } });
      await prisma.product.update({ where: { id: productId }, data: { deletedAt: new Date(), visible: false, status: "deleted" } });
      return NextResponse.json({ success: true });
    }

    case "edit": {
      const updates: Record<string, unknown> = {};
      if (data.title !== undefined) updates.title = data.title;
      if (data.description !== undefined) updates.description = data.description;
      if (data.vendorPrice !== undefined) {
        const newVp = parseFloat(data.vendorPrice);
        updates.vendorPrice = newVp;
        updates.storePrice = Math.round(newVp * 1.4 * 100) / 100;
      }
      if (data.stock !== undefined) updates.stock = parseInt(data.stock);
      if (data.category !== undefined) updates.category = data.category;
      if (data.platform !== undefined) updates.platform = data.platform;
      const updated = await prisma.product.update({ where: { id: productId }, data: updates });
      await prisma.activityLog.create({ data: { action: "product_edited", description: `Admin edited "${product.title}"`, userId: admin.id } });
      return NextResponse.json({ success: true, product: updated });
    }

    case "hold": {
      const newStatus = product.status === "hold" ? "approved" : "hold";
      await prisma.product.update({ where: { id: productId }, data: { status: newStatus, visible: newStatus === "approved" } });
      await prisma.activityLog.create({ data: { action: newStatus === "hold" ? "product_held" : "product_unheld", description: `Admin ${newStatus === "hold" ? "held" : "unheld"} "${product.title}"`, userId: admin.id } });
      if (newStatus === "hold") {
        await prisma.notification.create({ data: { userId: product.vendorId, title: "Product On Hold", message: `Your product "${product.title}" has been placed on hold by admin.` } }).catch(() => {});
      }
      return NextResponse.json({ success: true, status: newStatus });
    }

    case "delete_account_line": {
      // Delete a specific account line from accountsData
      const lineIndex = parseInt(data.lineIndex);
      if (isNaN(lineIndex)) return NextResponse.json({ error: "lineIndex required" }, { status: 400 });
      const fullProduct = await prisma.product.findUnique({ where: { id: productId }, select: { accountsData: true } });
      if (!fullProduct) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const lines = fullProduct.accountsData.split(/\r?\n/).filter(Boolean);
      if (lineIndex < 0 || lineIndex >= lines.length) return NextResponse.json({ error: "Invalid line index" }, { status: 400 });
      lines.splice(lineIndex, 1);
      await prisma.product.update({ where: { id: productId }, data: { accountsData: lines.join("\n"), stock: lines.length } });
      await prisma.activityLog.create({ data: { action: "account_line_deleted", description: `Admin deleted account line ${lineIndex + 1} from "${product.title}"`, userId: admin.id } });
      return NextResponse.json({ success: true, stock: lines.length });
    }

    case "edit_account_line": {
      // Edit a specific account line
      const lineIndex2 = parseInt(data.lineIndex);
      const newLine = data.newLine;
      if (isNaN(lineIndex2) || !newLine) return NextResponse.json({ error: "lineIndex and newLine required" }, { status: 400 });
      const fullProduct2 = await prisma.product.findUnique({ where: { id: productId }, select: { accountsData: true } });
      if (!fullProduct2) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const lines2 = fullProduct2.accountsData.split(/\r?\n/).filter(Boolean);
      if (lineIndex2 < 0 || lineIndex2 >= lines2.length) return NextResponse.json({ error: "Invalid line index" }, { status: 400 });
      lines2[lineIndex2] = newLine.trim();
      await prisma.product.update({ where: { id: productId }, data: { accountsData: lines2.join("\n") } });
      await prisma.activityLog.create({ data: { action: "account_line_edited", description: `Admin edited account line ${lineIndex2 + 1} in "${product.title}"`, userId: admin.id } });
      return NextResponse.json({ success: true });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
