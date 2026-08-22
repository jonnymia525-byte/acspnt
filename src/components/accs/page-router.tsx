"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/store";

// Lazy load page components
import { AuthPage } from "./pages/auth-page";
import { BuyerDashboard } from "./pages/buyer-dashboard";
import { VendorDashboard } from "./pages/vendor-dashboard";
import { AdminDashboard } from "./pages/admin-dashboard";
import { FAQPage } from "./pages/faq-page";
import { RulesPage } from "./pages/rules-page";
import { SupportPage } from "./pages/support-page";
import { SellerTermsPage } from "./pages/seller-terms-page";
import { USDTDeposit } from "./widgets/usdt-deposit";

export function PageRouter({ children }: { children: React.ReactNode }) {
  const [page, setPage] = useState<string | null>(null);
  const { user } = useStore();

  useEffect(() => {
    const sync = () => {
      const params = new URLSearchParams(window.location.search);
      setPage(params.get("page"));
    };
    const frame = requestAnimationFrame(sync);
    window.addEventListener("popstate", sync);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  // Listen for link clicks
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a[href]");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href) return;

      // Handle store link (href="/")
      if (href === "/" || href === window.location.origin + "/") {
        e.preventDefault();
        window.history.pushState({}, "", "/");
        setPage(null);
        return;
      }

      // Handle page links (href="/?page=xxx")
      if (href.startsWith("/?page=")) {
        e.preventDefault();
        const page = new URL(href, window.location.origin).searchParams.get("page");
        window.history.pushState({}, "", href);
        setPage(page);
        return;
      }
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, []);

  if (!page) return <>{children}</>;

  switch (page) {
    case "login": return <AuthPage initialTab="login" />;
    case "register": return <AuthPage initialTab="signup" />;
    case "seller-login": return <AuthPage initialTab="login" sellerMode />;
    case "seller-register": return <AuthPage initialTab="seller" />;
    case "user-dashboard": return <BuyerDashboard />;
    case "vendor-dashboard": return <VendorDashboard />;
    case "admin-dashboard": return <AdminDashboard />;
    case "faq": return <FAQPage />;
    case "rules": return <RulesPage />;
    case "support": return <SupportPage />;
    case "seller-terms": return <SellerTermsPage />;
    case "deposit": return <USDTDeposit />;
    default: return <>{children}</>;
  }
}
