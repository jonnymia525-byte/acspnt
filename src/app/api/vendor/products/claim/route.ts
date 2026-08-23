import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

// POST - vendor claims an existing product (adds to their store)
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("accsm_user_id")?.value;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== "vendor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (user.vendorStatus !== "approved") return NextResponse.json({ error: "Vendor not approved" }, { status: 403 });

    const body = await req.json();
    const { productId, vendorPrice } = body;

    if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });

    // Find the existing product
    const existingProduct = await prisma.product.findUnique({ where: { id: productId } });
    if (!existingProduct) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    if (existingProduct.status !== "approved") return NextResponse.json({ error: "Product not approved" }, { status: 400 });

    // Check vendor doesn't already have this exact product (same parent or same title+platform+category)
    const existingClaim = await prisma.product.findFirst({
      where: {
        vendorId: userId,
        platform: existingProduct.platform,
        category: existingProduct.category,
        title: existingProduct.title,
        deletedAt: null,
      },
    });
    if (existingClaim) {
      return NextResponse.json({ error: "You already have this product in your store" }, { status: 400 });
    }

    const vp = parseFloat(vendorPrice);
    if (!vp || vp <= 0) return NextResponse.json({ error: "Invalid vendor price" }, { status: 400 });

    const calcStorePrice = (price: number) => Math.round(price * 1.4 * 100) / 100;

    // Create a new product listing for this vendor, linked to the parent
    const newProduct = await prisma.product.create({
      data: {
        title: existingProduct.title,
        description: existingProduct.description,
        platform: existingProduct.platform,
        category: existingProduct.category,
        vendorPrice: vp,
        storePrice: calcStorePrice(vp),
        stock: 0, // Vendor needs to upload their own accounts
        status: "pending", // Needs admin approval
        visible: false,
        deliveryFormat: existingProduct.deliveryFormat,
        countryRegister: existingProduct.countryRegister,
        originalMail: existingProduct.originalMail,
        country: existingProduct.country,
        proxy: existingProduct.proxy,
        parentProductId: existingProduct.id,
        vendorId: userId,
      },
    });

    // Create a listing too
    const listing = await prisma.listing.create({
      data: {
        title: existingProduct.title,
        platform: existingProduct.platform,
        category: existingProduct.category,
        description: existingProduct.description,
        deliveryFormat: existingProduct.deliveryFormat,
        countryRegister: existingProduct.countryRegister,
        originalMail: existingProduct.originalMail,
        country: existingProduct.country,
        proxy: existingProduct.proxy,
        visible: false,
        vendorId: userId,
      },
    });

    // Link listing
    await prisma.product.update({ where: { id: newProduct.id }, data: { listingId: listing.id } });

    await prisma.activityLog.create({
      data: {
        action: "product_claimed",
        description: `Vendor ${user.username} claimed existing product "${existingProduct.title}" (linked to original)`,
        userId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Product added to your store! Upload your accounts and wait for admin approval.",
      product: { id: newProduct.id, title: newProduct.title, status: newProduct.status },
    });
  } catch (err) {
    console.error("Claim product error:", err);
    return NextResponse.json({ error: "Failed to claim product" }, { status: 500 });
  }
}
