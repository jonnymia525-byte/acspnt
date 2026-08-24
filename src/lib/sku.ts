import { prisma } from "@/lib/prisma";

const SKU_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const SKU_PREFIX = "AP-";
const SKU_LENGTH = 6;
const MAX_ATTEMPTS = 10;

function randomSkuSuffix(length: number): string {
  let suffix = "";
  for (let i = 0; i < length; i++) {
    suffix += SKU_CHARS[Math.floor(Math.random() * SKU_CHARS.length)];
  }
  return suffix;
}

export async function generateUniqueSku(): Promise<string> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const sku = `${SKU_PREFIX}${randomSkuSuffix(SKU_LENGTH)}`;
    const existing = await prisma.product.findUnique({ where: { sku } });
    if (!existing) return sku;
  }
  throw new Error("Failed to generate a unique SKU");
}
