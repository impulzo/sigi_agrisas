"use client";

import Link from "next/link";
import { Icon } from "../../atoms/Icon/Icon";
import { cn } from "../../../_lib/cn";
import type { RailItem } from "../../organisms/NavigationRail/items";

interface RailFlyoutProps {
  open: boolean;
  anchorTop: number;
  items: RailItem[];
  activeHref: string;
  onItemClick: (href: string) => void;
  onClose: () => void;
}

export function RailFlyout({ open, anchorTop, items, activeHref, onItemClick, onClose }: RailFlyoutProps) {
  if (!open) return null;

  const clampedTop = Math.max(16, Math.min(anchorTop, window.innerHeight - 32));

  return (
    <div
      role="menu"
      style={{ top: clampedTop, left: 80, maxHeight: "calc(100vh - 32px)" }}
      className="fixed z-50 bg-surface-container-low border border-outline-variant rounded-r-xl shadow-lg py-2 min-w-[240px] overflow-y-auto scrollbar-thin"
      onMouseLeave={onClose}
    >
      {items.map((item) => {
        const active = activeHref === item.href || activeHref.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.key}
            href={item.href}
            role="menuitem"
            onClick={() => onItemClick(item.href)}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 text-body-md transition-colors",
              active
                ? "bg-primary-container text-on-primary-container"
                : "text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
            )}
          >
            <Icon name={item.icon} size={20} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
