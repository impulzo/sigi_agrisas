import { ReactNode } from "react";
import Link from "next/link";
import { cn } from "../../../_lib/cn";
import { Icon } from "../../atoms/Icon/Icon";

type Width = "default" | "narrow" | "full";

const widthClasses: Record<Width, string> = {
  default: "max-w-screen-2xl",
  narrow: "max-w-4xl",
  full: "",
};

interface PageHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, backHref, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-md", className)}>
      <div className="flex items-start gap-3">
        {backHref && (
          <Link
            href={backHref}
            className="mt-1 text-on-surface-variant hover:text-on-surface"
            aria-label="Volver"
          >
            <Icon name="arrow_back" size={20} />
          </Link>
        )}
        <div>
          <h1 className="text-headline-lg font-semibold text-on-surface">{title}</h1>
          {description && (
            <p className="text-body-md text-on-surface-variant mt-1">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}

interface PageShellProps {
  title: string;
  description?: string;
  backHref?: string;
  actions?: ReactNode;
  toolbar?: ReactNode;
  width?: Width;
  children?: ReactNode;
  className?: string;
}

export function PageShell({
  title,
  description,
  backHref,
  actions,
  toolbar,
  width = "default",
  children,
  className,
}: PageShellProps) {
  // El panel (borde + fondo tonal) sólo aparece cuando hay toolbar: es la señal
  // de que la página es un listado con filtros. Páginas de grid/hub o layouts
  // master-detail pasan children sin toolbar y quedan sin panel envolvente.
  const showPanel = toolbar !== undefined;

  return (
    <div
      className={cn(
        "flex flex-col gap-lg px-gutter py-lg mx-auto w-full",
        widthClasses[width],
        className
      )}
    >
      <PageHeader
        title={title}
        description={description}
        backHref={backHref}
        actions={actions}
      />
      {showPanel ? (
        <div className="bg-surface-container-low rounded-lg border border-outline-variant overflow-hidden">
          <div className="px-md py-md border-b border-outline-variant">{toolbar}</div>
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
