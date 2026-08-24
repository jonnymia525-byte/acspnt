import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { generateUniqueSku } from "@/lib/sku";

async function requireVendor() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("accsm_user_id")?.value;
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "vendor" || user.vendorStatus !== "approved") return null;
  return user;
}

// POST - duplicate a product
export async function POST(req: Request) {
  const vendor = await requireVendor();
  if (!vendor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { productId } = await req.json();
  if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.vendorId !== vendor.id) {
    return NextResponse.json({ error: "Product not found or not yours" }, { status: 404 });
  }

  const duplicate = await prisma.product.create({
data: {
        sku: await generateUniqueSku(),
        title: `${product.title} (Copy)`,
      description: product.description,
      platform: product.platform,
      category: product.category,
      vendorPrice: product.vendorPrice,
      storePrice: product.storePrice,
      stock: 0, // Start with 0 stock
      status: "pending", // Needs re-approval
      deliveryFormat: product.deliveryFormat,
      countryRegister: product.countryRegister,
      originalMail: product.originalMail,
      country: product.country,
      proxy: product.proxy,
      listingId: product.listingId,
      vendorId: vendor.id,
    },
  });

  return NextResponse.json({ success: true, product: duplicate });
}
