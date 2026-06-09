import Link from "next/link";
import { Icon } from "../../../_components/atoms/Icon/Icon";
import { cn } from "../../../_lib/cn";
import type { IconName } from "../../../_components/atoms/Icon/icons";

interface CatalogHubCardProps {
  icon: IconName;
  title: string;
  description: string;
  href: string;
  canAccess: boolean | "loading";
  tooltip?: string;
}

export function CatalogHubCard({ icon, title, description, href, canAccess, tooltip }: CatalogHubCardProps) {
  const disabled = canAccess === false;

  return (
    <div
      title={disabled && tooltip ? tooltip : undefined}
      className={cn(
        "rounded-2xl border border-outline-variant bg-surface-container p-6 flex flex-col gap-4 transition-shadow",
        disabled ? "opacity-50 cursor-not-allowed" : "hover:shadow-md"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary-container text-on-primary-container">
          <Icon name={icon} size={28} />
        </div>
        <div>
          <h3 className="text-title-md font-semibold text-on-surface">{title}</h3>
          <p className="text-body-sm text-on-surface-variant">{description}</p>
        </div>
      </div>
      {disabled ? (
        <span className="self-start px-4 py-2 rounded-xl bg-surface-container-high text-on-surface-variant text-label-lg opacity-60 cursor-not-allowed">
          Sin acceso
        </span>
      ) : (
        <Link
          href={href}
          className="self-start px-4 py-2 rounded-xl bg-primary text-on-primary text-label-lg font-medium hover:opacity-90 transition-opacity"
        >
          Abrir
        </Link>
      )}
    </div>
  );
}
