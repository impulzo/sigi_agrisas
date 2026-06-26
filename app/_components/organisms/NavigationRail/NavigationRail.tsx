"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "../../../_lib/cn";
import { Icon } from "../../atoms/Icon/Icon";
import { RailFlyout } from "../../molecules/RailFlyout/RailFlyout";
import { primaryItems, secondaryItems, type RailItem } from "./items";
import { useCurrentUser } from "../../../_hooks/useCurrentUser";
import { useLogout } from "../../../(public)/auth/_logic/hooks/useLogout";

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

interface RailParentItemProps {
  item: RailItem;
  active: boolean;
  pathname: string;
  can: (permission: string) => boolean | "loading";
}

function RailParentItem({ item, active, pathname, can }: RailParentItemProps) {
  const router = useRouter();
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [anchorTop, setAnchorTop] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const visibleChildren = (item.children ?? []).filter((child) => {
    if (!child.requires) return true;
    const allowed = can(child.requires);
    return allowed === "loading" || allowed === true;
  });

  const measureAnchor = useCallback(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setAnchorTop(rect.top);
    }
  }, []);

  const handleOpen = useCallback(() => {
    measureAnchor();
    setFlyoutOpen(true);
  }, [measureAnchor]);

  useEffect(() => {
    if (!flyoutOpen) return;
    window.addEventListener("resize", measureAnchor);
    return () => window.removeEventListener("resize", measureAnchor);
  }, [flyoutOpen, measureAnchor]);

  useEffect(() => {
    if (!flyoutOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFlyoutOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [flyoutOpen]);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={handleOpen}
      onMouseLeave={() => setFlyoutOpen(false)}
    >
      <button
        type="button"
        title={item.label}
        onClick={() => router.push(item.href)}
        className={cn(
          "flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-colors duration-150 ease-in-out",
          active
            ? "bg-primary-container text-on-primary-container scale-90"
            : "text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface",
        )}
      >
        <Icon name={item.icon} />
        <span className="text-label-sm">{item.label}</span>
      </button>

      <RailFlyout
        open={flyoutOpen}
        anchorTop={anchorTop}
        items={visibleChildren}
        activeHref={pathname}
        onItemClick={() => setFlyoutOpen(false)}
        onClose={() => setFlyoutOpen(false)}
      />
    </div>
  );
}

export function NavigationRail() {
  const pathname = usePathname() ?? "";
  const { can } = useCurrentUser();
  const { logout, isLoading: isLoggingOut } = useLogout();

  const visiblePrimaryItems = primaryItems.filter((item) => {
    if (item.children) {
      const anyVisible = item.children.some((child) => {
        if (!child.requires) return true;
        const allowed = can(child.requires);
        return allowed === "loading" || allowed === true;
      });
      return anyVisible;
    }
    if (!item.requires) return true;
    const allowed = can(item.requires);
    if (allowed === "loading") return true;
    return allowed === true;
  });

  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!navRef.current) return;
    const activeEl = navRef.current.querySelector<HTMLElement>('[data-active="true"]');
    if (!activeEl) return;
    const nav = navRef.current;
    const navRect = nav.getBoundingClientRect();
    const elRect = activeEl.getBoundingClientRect();
    if (elRect.bottom > navRect.bottom || elRect.top < navRect.top) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }, [pathname]);

  return (
    <aside className="fixed left-0 top-0 h-screen w-[80px] bg-surface-container-low border-r border-outline-variant flex flex-col items-center z-50 shadow-sm">
      {/* Header: logo, fixed */}
      <div className="flex-shrink-0 py-6" aria-hidden="true">
        <span className="text-headline-lg font-black text-primary">A</span>
      </div>

      {/* Scrollable section: primary + secondary items */}
      <nav
        ref={navRef}
        className="flex-1 overflow-y-auto scrollbar-thin flex flex-col items-center gap-md py-2 w-full"
        aria-label="Primary"
      >
        {visiblePrimaryItems.map((item) =>
          item.children ? (
            <div key={item.key} data-active={isActive(pathname, item.href) ? "true" : undefined}>
              <RailParentItem
                item={item}
                active={isActive(pathname, item.href)}
                pathname={pathname}
                can={can}
              />
            </div>
          ) : (
            <div key={item.key} data-active={isActive(pathname, item.href) ? "true" : undefined}>
              <RailLink item={item} active={isActive(pathname, item.href)} />
            </div>
          )
        )}
        <div className="mt-auto pt-4 flex flex-col gap-md items-center">
          {secondaryItems.map((item) => (
            <RailLink key={item.key} item={item} active={isActive(pathname, item.href)} />
          ))}
        </div>
      </nav>

      {/* Footer: logout, always visible */}
      <div className="flex-shrink-0 pb-4">
        <button
          onClick={logout}
          disabled={isLoggingOut}
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
          className="flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-colors duration-150 ease-in-out text-on-surface-variant hover:bg-error-container hover:text-error disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Icon name="logout" />
          <span className="text-label-sm">Salir</span>
        </button>
      </div>
    </aside>
  );
}
