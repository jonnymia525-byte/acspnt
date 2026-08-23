import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { calcStorePrice } from "@/lib/money";

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "vendor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const products = await prisma.product.findMany({
    where: { vendorId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      title: true,
      platform: true,
      category: true,
      vendorPrice: true,
      storePrice: true,
      stock: true,
      status: true,
      visible: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ products });
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("accsm_user_id")?.value;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== "vendor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (user.vendorStatus !== "approved") return NextResponse.json({ error: "Vendor not approved" }, { status: 403 });

    const body: Record<string, unknown> = await req.json();
    const title = String(body.title ?? "").trim();
    const platform = String(body.platform ?? "").trim();
    const category = String(body.category ?? "").trim();
    const description = String(body.description ?? "");
    const deliveryFormat = String(body.deliveryFormat ?? "email:pass");
    const countryRegister = String(body.countryRegister ?? "");
    const originalMail = body.originalMail === true;
    const country = String(body.country ?? "");
    const proxy = String(body.proxy ?? "");
    const vendorPrice = Number(body.vendorPrice);
    const accountsData = String(body.accountsData ?? "");

    if (title.length < 3 || title.length > 200) return NextResponse.json({ error: "Title must be 3-200 characters" }, { status: 400 });
    if (!platform) return NextResponse.json({ error: "Platform is required" }, { status: 400 });
    if (description.length > 2000) return NextResponse.json({ error: "Description too long (max 2000)" }, { status: 400 });
    if (!Number.isFinite(vendorPrice) || vendorPrice <= 0) {
      return NextResponse.json({ error: "Vendor price must be greater than 0" }, { status: 400 });
    }
    if (vendorPrice > 100000) return NextResponse.json({ error: "Price too high" }, { status: 400 });
    // Limit accounts payload to prevent DoS (~100KB max)
    if (accountsData.length > 100000) return NextResponse.json({ error: "Accounts data too large" }, { status: 400 });

    const accounts = accountsData
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const stock = accounts.length;

    const listing = await prisma.listing.create({
      data: {
        title,
        platform,
        category,
        description,
        deliveryFormat,
        countryRegister,
        originalMail,
        country,
        proxy,
        visible: true,
        vendorId: user.id,
      },
    });

    const product = await prisma.product.create({
      data: {
        title,
        description,
        platform,
        category,
        vendorPrice,
        storePrice: calcStorePrice(vendorPrice),
        stock,
        status: "pending",
        visible: false,
        accountsData: accounts.join("\n"),
        deliveryFormat,
        countryRegister,
        originalMail,
        country,
        proxy,
        listingId: listing.id,
        vendorId: user.id,
      },
    });

    await prisma.activityLog.create({
      data: { action: "product_submitted", description: "Vendor " + user.username + " submitted " + title, userId: user.id },
    });

    return NextResponse.json({
      success: true,
      product: { id: product.id, title: product.title, storePrice: product.storePrice, stock: product.stock, status: product.status },
    });
  } catch (err) {
    console.error("Product creation failed:", err);
    return NextResponse.json({ error: "Product creation failed" }, { status: 500 });
  }
}

// PATCH - update product price
export async function PATCH(req: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("accsm_user_id")?.value;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== "vendor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (user.vendorStatus !== "approved") return NextResponse.json({ error: "Vendor not approved" }, { status: 403 });

    const body = await req.json();
    const { productId, vendorPrice } = body;

    if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });
    const vp = parseFloat(vendorPrice);
    if (!vp || vp <= 0) return NextResponse.json({ error: "Invalid price" }, { status: 400 });

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.vendorId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.product.update({
      where: { id: productId },
      data: { vendorPrice: vp, storePrice: Math.round(vp * 1.4 * 100) / 100 },
    });

    await prisma.activityLog.create({
      data: { action: "price_updated", description: `Vendor ${user.username} updated price of "${product.title}" to $${vp}`, userId: user.id },
    });

    return NextResponse.json({ success: true, product: { id: updated.id, vendorPrice: updated.vendorPrice, storePrice: updated.storePrice } });
  } catch (err) {
    console.error("Price update failed:", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
