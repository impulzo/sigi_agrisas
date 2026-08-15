"use client";

import { useState } from "react";
import { useCurrentUser } from "../../../../_hooks/useCurrentUser";
import { PageShell } from "../../../../_components/organisms/PageShell";
import { EmptyState } from "../../../../_components/molecules/EmptyState/EmptyState";
import { SegmentedButton } from "../../../../_components/molecules/SegmentedButton/SegmentedButton";
import { GlobalCollectionsView } from "./global/GlobalCollectionsView";
import { ByCustomerCollectionsView } from "./by-customer/ByCustomerCollectionsView";

type View = "global" | "customer";

export function CollectionsPage() {
  const { can } = useCurrentUser();
  const canGlobal = can("reports:cash_cut_read");
  const canByCustomer = can("reports:customer_collections_read");

  const [view, setView] = useState<View>("global");

  if (canGlobal === false && canByCustomer === false) {
    return (
      <EmptyState
        icon="block"
        title="Sin acceso"
        description="No tienes permiso para ver la cobranza."
      />
    );
  }

  const globalViable = canGlobal !== false;
  const customerViable = canByCustomer !== false;
  const showSegmented = globalViable && customerViable;
  const effectiveView: View = showSegmented ? view : globalViable ? "global" : "customer";

  return (
    <PageShell title="Cobranza" backHref="/reports">
      <div className="flex flex-col gap-4">
        {showSegmented && (
          <SegmentedButton<View>
            value={effectiveView}
            onChange={setView}
            aria-label="Vista de cobranza"
            options={[
              { value: "global", label: "Global" },
              { value: "customer", label: "Por Cliente" },
            ]}
          />
        )}

        {effectiveView === "global" ? <GlobalCollectionsView /> : <ByCustomerCollectionsView />}
      </div>
    </PageShell>
  );
}
