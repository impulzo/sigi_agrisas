"use client";

import { Card } from "../../../../_components/molecules/Card/Card";
import { SegmentedButton } from "../../../../_components/molecules/SegmentedButton/SegmentedButton";
import { CatalogPagination } from "../../../catalogs/_blocks/CatalogPagination";
import { CustomerFilterCombobox } from "../../_blocks/CustomerFilterCombobox";
import { SalesByProductDetailTable } from "./SalesByProductDetailTable";
import type { SalesByProductDetailRowDto } from "../_logic/types/api";

export type SalesByProductScope = "global" | "customer";

interface Props {
  scope: SalesByProductScope;
  onScopeChange: (s: SalesByProductScope) => void;
  customerId: string;
  onCustomerIdChange: (v: string) => void;
  page: number;
  pageSize: number;
  rowsTotal: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (n: number) => void;
  rows: SalesByProductDetailRowDto[];
}

export function SalesByProductBreakdownCard({
  scope, onScopeChange,
  customerId, onCustomerIdChange,
  page, pageSize, rowsTotal, onPageChange, onPageSizeChange,
  rows,
}: Props) {
  return (
    <Card className="flex flex-col gap-4 !p-0">
      <div className="flex flex-wrap items-end justify-between gap-3 px-4 pt-4">
        <SegmentedButton<SalesByProductScope>
          value={scope}
          onChange={onScopeChange}
          aria-label="Alcance"
          options={[
            { value: "global", label: "Global" },
            { value: "customer", label: "Por Cliente" },
          ]}
        />
        {scope === "customer" && (
          <div className="w-56">
            <CustomerFilterCombobox value={customerId} onChange={onCustomerIdChange} />
          </div>
        )}
      </div>

      <SalesByProductDetailTable rows={rows} />

      <CatalogPagination
        page={page}
        pageSize={pageSize}
        total={rowsTotal}
        count={rows.length}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </Card>
  );
}
