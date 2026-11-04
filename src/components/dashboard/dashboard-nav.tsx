"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navIcons, type NavIconKey } from "./nav-icons";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; icon: NavIconKey; exact?: boolean };

export function SideNav({ items, label }: { items: NavItem[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
      <ul className="flex gap-1 lg:flex-col">
        {items.map(({ href, label: text, icon, exact }) => {
          const Icon = navIcons[icon];
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap text-charcoal/80 transition-colors hover:bg-secondary hover:text-forest",
                  active && "bg-forest text-cream hover:bg-forest hover:text-cream",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {text}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
