"use client";

import { SegmentedButton } from "../../../../_components/molecules/SegmentedButton/SegmentedButton";
import { EmptyState } from "../../../../_components/molecules/EmptyState/EmptyState";

export type KardexTab = "kardex" | "stats";

interface KardexTabsProps {
  tab: KardexTab;
  onTabChange: (tab: KardexTab) => void;
  children: React.ReactNode;
}

export function KardexTabs({ tab, onTabChange, children }: KardexTabsProps) {
  return (
    <div className="flex flex-col gap-4">
      <SegmentedButton
        value={tab}
        onChange={onTabChange}
        aria-label="Kardex o Estadísticas"
        options={[
          { value: "kardex", label: "Kardex" },
          { value: "stats", label: "Estadísticas" },
        ]}
      />

      {tab === "kardex" ? (
        children
      ) : (
        <EmptyState icon="summarize" title="Próximamente" description="Las estadísticas de este artículo estarán disponibles más adelante." />
      )}
    </div>
  );
}
