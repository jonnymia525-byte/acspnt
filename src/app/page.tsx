import { prisma } from "@/lib/prisma";
import { platformColor, platformIcon, platformLabel } from "@/lib/totp";
import { StorefrontClient } from "@/components/accs/storefront-client";
import { PageRouter } from "@/components/accs/page-router";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [listings] = await Promise.all([
    prisma.listing.findMany({
      where: { visible: true },
      include: {
        products: {
          where: { status: "approved", visible: true },
          include: { vendor: { select: { id: true, username: true, vendorCountry: true, vendorStatus: true } } },
          orderBy: { storePrice: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const platformMap = new Map<string, typeof listings>();
  for (const l of listings) {
    if (l.products.length === 0) continue;
    const arr = platformMap.get(l.platform) || [];
    arr.push(l);
    platformMap.set(l.platform, arr);
  }

  const PLATFORM_ORDER = [
    "instagram", "facebook", "outlook",
    "gmail", "telegram", "x", "twitter", "tiktok", "linkedin",
    "discord", "reddit", "youtube", "pinterest", "snapchat",
  ];

  const platforms = Array.from(platformMap.entries())
    .map(([platform, items]) => ({
      platform,
      label: platformLabel(platform),
      icon: platformIcon(platform),
      color: platformColor(platform),
      listings: items,
      totalStock: items.reduce((sum, l) => sum + l.products.reduce((s, p) => s + p.stock, 0), 0),
      totalListings: items.length,
    }))
    .sort((a, b) => {
      const ai = PLATFORM_ORDER.indexOf(a.platform);
      const bi = PLATFORM_ORDER.indexOf(b.platform);
      return (ai === -1 ? 100 : ai) - (bi === -1 ? 100 : bi);
    });

  const featured = await prisma.product.findMany({
    where: { status: "approved", visible: true, stock: { gt: 0 } },
    include: {
      vendor: { select: { id: true, username: true } },
      listing: { select: { id: true, title: true, platform: true } },
      reviews: { select: { rating: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  const seen = new Map<string, typeof featured[0]>();
  for (const p of featured) {
    const key = p.listing?.title || p.title;
    const existing = seen.get(key);
    if (!existing || p.storePrice < existing.storePrice) seen.set(key, p);
  }
  const trending = Array.from(seen.values()).slice(0, 12).map((p) => {
    const avgRating = p.reviews.length > 0 ? p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length : 0;
    return { ...p, avgRating, ratingCount: p.reviews.length };
  });

  const totalListings = platforms.reduce((s, p) => s + p.totalListings, 0);
  const totalStock = platforms.reduce((s, p) => s + p.totalStock, 0);

  return (
    <PageRouter>
      <StorefrontClient
        platforms={platforms}
        trending={trending}
        totalListings={totalListings}
        totalPlatforms={platforms.length}
        totalStock={totalStock}
      />
    </PageRouter>
  );
}
