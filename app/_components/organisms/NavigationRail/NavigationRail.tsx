"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "../../../_lib/cn";
import { Icon } from "../../atoms/Icon/Icon";
import { primaryItems, secondaryItems, type RailItem } from "./items";

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function RailLink({ item, active }: { item: RailItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      title={item.label}
      className={cn(
        "flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-colors duration-150 ease-in-out",
        active
          ? "bg-primary-container text-on-primary-container scale-90"
          : "text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface",
      )}
    >
      <Icon name={item.icon} />
      <span className="text-label-sm">{item.label}</span>
    </Link>
  );
}

export function NavigationRail() {
  const pathname = usePathname() ?? "";

  return (
    <aside className="fixed left-0 top-0 h-screen w-[80px] bg-surface-container-low border-r border-outline-variant flex flex-col items-center py-6 gap-y-6 z-50 shadow-sm">
      <div className="mb-md" aria-hidden="true">
        <span className="text-headline-lg font-black text-primary">A</span>
      </div>
      <nav className="flex flex-col gap-md" aria-label="Primary">
        {primaryItems.map((item) => (
          <RailLink key={item.key} item={item} active={isActive(pathname, item.href)} />
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-md">
        {secondaryItems.map((item) => (
          <RailLink key={item.key} item={item} active={isActive(pathname, item.href)} />
        ))}
      </div>
    </aside>
  );
}
