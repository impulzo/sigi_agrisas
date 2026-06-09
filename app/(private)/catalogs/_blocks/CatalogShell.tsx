import type { ReactNode } from "react";

interface CatalogShellProps {
  title: string;
  description: string;
  toolbar: ReactNode;
  children: ReactNode;
}

export function CatalogShell({ title, description, toolbar, children }: CatalogShellProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-headline-lg font-semibold text-on-surface">{title}</h1>
        <p className="text-body-md text-on-surface-variant mt-1">{description}</p>
      </div>

      <div className="bg-surface-container-low rounded-2xl border border-outline-variant overflow-hidden">
        <div className="px-4 py-4 border-b border-outline-variant">{toolbar}</div>
        {children}
      </div>
    </div>
  );
}
