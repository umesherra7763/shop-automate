import type { Metadata, Viewport } from "next";
import Nav from "@/components/Nav";
import { getSettings, getT } from "@/lib/i18n";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Shop Khatha" };
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [t, s] = await Promise.all([getT(), getSettings()]);
  const items = [
    { href: "/", label: t("home"), icon: "🏠" },
    { href: "/bills/new", label: t("newBill"), icon: "➕" },
    { href: "/daybook", label: t("dayBook"), icon: "📒" },
    { href: "/collections", label: t("collections"), icon: "💰" },
    { href: "/parties", label: t("khatha"), icon: "👥" },
    { href: "/bills", label: t("bills"), icon: "🧾" },
    { href: "/items", label: t("stock"), icon: "📦" },
    { href: "/purchases", label: t("purchases"), icon: "🚚" },
    { href: "/weekly", label: t("weekly"), icon: "🗓" },
    { href: "/settings", label: t("settings"), icon: "⚙" },
  ];
  return (
    <html lang="en">
      <body className="bg-stone-100 text-stone-900 antialiased">
        <Nav items={items} shopName={s.shopName || "Shop Khatha"} />
        <main className="mx-auto max-w-5xl space-y-4 p-3 pb-24 md:ml-56 md:p-6">{children}</main>
      </body>
    </html>
  );
}
