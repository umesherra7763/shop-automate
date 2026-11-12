"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; icon: string };

export default function Nav({ items, shopName }: { items: NavItem[]; shopName: string }) {
  const path = usePathname();
  if (path === "/login") return null;
  const active = (href: string) =>
    href === "/" ? path === "/" : path === href || (path.startsWith(href + "/") && !items.some((i) => i.href === path));

  return (
    <>
      {/* Computer: side menu */}
      <aside className="no-print fixed inset-y-0 left-0 hidden w-56 flex-col border-r border-stone-200 bg-white p-3 md:flex">
        <div className="mb-4 px-2 text-lg font-bold text-emerald-800">{shopName}</div>
        {items.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className={`mb-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
              active(i.href) ? "bg-emerald-700 font-semibold text-white" : "text-stone-700 hover:bg-stone-100"
            }`}
          >
            <span aria-hidden>{i.icon}</span>
            {i.label}
          </Link>
        ))}
      </aside>

      {/* Phone: bottom bar, swipe sideways for more */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-10 flex overflow-x-auto border-t border-stone-200 bg-white md:hidden">
        {items.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className={`flex min-w-[76px] flex-1 flex-col items-center px-2 py-2 text-[11px] leading-tight ${
              active(i.href) ? "bg-emerald-50 font-semibold text-emerald-800" : "text-stone-600"
            }`}
          >
            <span className="text-lg" aria-hidden>
              {i.icon}
            </span>
            <span className="whitespace-nowrap">{i.label.split(" / ")[0]}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
