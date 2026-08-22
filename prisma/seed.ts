import { PrismaClient } from "@prisma/client";
import bcryptjs from "bcryptjs";

const prisma = new PrismaClient();

const PLATFORMS = [
  "instagram", "facebook", "telegram", "x", "twitter", "tiktok", "linkedin",
  "gmail", "outlook", "discord", "reddit", "youtube", "pinterest", "snapchat",
];
const CATEGORIES = ["aged", "follower", "storage", "fresh", "verified", "bulk"];

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram", facebook: "Facebook", telegram: "Telegram",
  x: "X (Twitter)", twitter: "Twitter", tiktok: "TikTok", linkedin: "LinkedIn",
  gmail: "Gmail", outlook: "Outlook", discord: "Discord", reddit: "Reddit",
  youtube: "YouTube", pinterest: "Pinterest", snapchat: "Snapchat",
};

const CATEGORY_LABELS: Record<string, string> = {
  aged: "Aged", follower: "Followers", storage: "Storage",
  fresh: "Fresh", verified: "Verified", bulk: "Bulk",
};

async function main() {
  console.log("Seeding AccsPoint database...");

  const hash = (pw: string) => bcryptjs.hashSync(pw, 10);

  // Create Admin
  const admin = await prisma.user.upsert({
    where: { email: "admin@accspoint.test" },
    update: {},
    create: {
      email: "admin@accspoint.test",
      username: "admin",
      password: hash("admin123"),
      name: "Admin User",
      role: "admin",
      balance: 0,
      vendorStatus: "approved",
    },
  });

  // Create Vendors
  const vendorOne = await prisma.user.upsert({
    where: { email: "vendor@accspoint.test" },
    update: {},
    create: {
      email: "vendor@accspoint.test",
      username: "vendor_one",
      password: hash("vendor123"),
      name: "Vendor One",
      role: "vendor",
      balance: 150.0,
      vendorStatus: "approved",
      vendorCountry: "US",
      contactMethod: "telegram",
      contactDetail: "@vendor_one",
    },
  });

  const vendorTwo = await prisma.user.upsert({
    where: { email: "bulk_market@test.com" },
    update: {},
    create: {
      email: "bulk_market@test.com",
      username: "bulk_market",
      password: hash("vendor123"),
      name: "Bulk Market Co",
      role: "vendor",
      balance: 320.0,
      vendorStatus: "approved",
      vendorCountry: "UK",
      contactMethod: "whatsapp",
      contactDetail: "+447700900000",
    },
  });

  // Create Buyer
  const buyer = await prisma.user.upsert({
    where: { email: "buyer@accspoint.test" },
    update: {},
    create: {
      email: "buyer@accspoint.test",
      username: "buyer",
      password: hash("buyer123"),
      name: "Test Buyer",
      role: "buyer",
      balance: 100.0,
      vendorStatus: "none",
    },
  });

  // Create Coupons
  await prisma.coupon.upsert({
    where: { code: "SAVE10" },
    update: {},
    create: {
      code: "SAVE10",
      type: "percentage",
      value: 10,
      minOrder: 5,
      maxUses: 100,
      active: true,
    },
  });
  await prisma.coupon.upsert({
    where: { code: "WELCOME5" },
    update: {},
    create: {
      code: "WELCOME5",
      type: "fixed",
      value: 5,
      minOrder: 10,
      maxUses: 50,
      active: true,
    },
  });

  // Check if products already seeded
  const existingProducts = await prisma.product.count();
  if (existingProducts > 0) {
    console.log(`Already ${existingProducts} products — skipping product seed.`);
    console.log("Seed complete!");
    return;
  }

  // Create Listings + Products for each platform
  const vendors = [vendorOne, vendorTwo];
  let totalProducts = 0;

  for (const platform of PLATFORMS) {
    const listingCount = randInt(3, 5);
    for (let i = 0; i < listingCount; i++) {
      const category = pick(CATEGORIES);
      const catLabel = CATEGORY_LABELS[category];
      const platLabel = PLATFORM_LABELS[platform];

      const suffixes = ["Pro", "Premium", "Enterprise", "Starter", "Classic", "Elite"];
      const suffix = pick(suffixes);
      const title = `${platLabel} ${catLabel} ${suffix} #${randInt(100, 999)}`;

      const listing = await prisma.listing.create({
        data: {
          title,
          platform,
          category,
          description: `High-quality ${category} ${platform} account. ${pick(["Fully verified", "Phone verified", "Email verified", "Original owner", "Clean history"])}.`,
          deliveryFormat: "email:pass",
          countryRegister: pick(["US", "UK", "CA", "AU", "DE", "FR", "Global"]),
          originalMail: Math.random() > 0.5,
          country: pick(["US", "UK", "CA", "AU", "DE", "FR", "IN", "BR", "Global"]),
          proxy: Math.random() > 0.6 ? "Included" : "None",
          visible: true,
          vendorId: pick(vendors).id,
        },
      });

      // Create 1-3 vendor products per listing (multi-vendor)
      const vendorCount = Math.random() > 0.6 ? 2 : 1;
      const selectedVendors = vendorCount === 2 ? vendors : [pick(vendors)];

      for (const v of selectedVendors) {
        const vendorPrice = parseFloat((Math.random() * 30 + 2).toFixed(2));
        const storePrice = parseFloat((vendorPrice * 1.4).toFixed(2));
        const stock = randInt(5, 40);

        // Generate accounts data
        const accounts: string[] = [];
        for (let a = 0; a < stock; a++) {
          accounts.push(
            `${platform}${randInt(1000, 9999)}${randInt(100, 999)}:pass${randInt(1000, 9999)}:user${randInt(100, 999)}@${pick(["gmail.com", "outlook.com", "protonmail.com", "yahoo.com"])}:emailpass${randInt(100, 999)}`
          );
        }

        await prisma.product.create({
          data: {
            title: listing.title,
            description: listing.description,
            platform,
            category,
            vendorPrice,
            storePrice,
            stock,
            status: "approved",
            visible: true,
            accountsData: accounts.join("\n"),
            deliveryFormat: listing.deliveryFormat,
            countryRegister: listing.countryRegister,
            originalMail: listing.originalMail,
            country: listing.country,
            proxy: listing.proxy,
            listingId: listing.id,
            vendorId: v.id,
          },
        });
        totalProducts++;
      }
    }
  }

  // Add some pending/rejected products for admin review
  for (const category of ["aged", "fresh", "verified"]) {
    await prisma.product.create({
      data: {
        title: `Instagram ${CATEGORY_LABELS[category]} New #${randInt(1000, 9999)}`,
        platform: "instagram",
        category,
        vendorPrice: 5.0,
        storePrice: 7.0,
        stock: 10,
        status: "pending",
        visible: false,
        accountsData: "test@test.com:pass123",
        vendorId: vendorOne.id,
      },
    });
    totalProducts++;
  }

  // Create a deposit for the buyer
  await prisma.deposit.create({
    data: {
      amount: 100,
      method: "manual",
      status: "completed",
      userId: buyer.id,
      completedAt: new Date(),
    },
  });

  // Create a purchase
  const sampleProduct = await prisma.product.findFirst({
    where: { status: "approved" },
  });
  if (sampleProduct) {
    await prisma.purchase.create({
      data: {
        quantity: 1,
        subtotal: sampleProduct.storePrice,
        total: sampleProduct.storePrice,
        accounts: sampleProduct.accountsData.split("\n")[0],
        buyerId: buyer.id,
        productId: sampleProduct.id,
      },
    });

    // Credit vendor
    await prisma.user.update({
      where: { id: sampleProduct.vendorId },
      data: { balance: { increment: sampleProduct.vendorPrice } },
    });
  }

  console.log(`Seed complete! ${totalProducts} products created across ${PLATFORMS.length} platforms.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
