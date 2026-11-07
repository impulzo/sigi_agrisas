"use client";

import { useState, Fragment, ReactNode } from "react";
import { Icon } from "../../../_components/atoms/Icon/Icon";
import { Skeleton } from "../../../_components/atoms/Skeleton/Skeleton";
import { Table, THead, TBody, Tr, Td } from "../../../_components/molecules/DataTable/DataTable";
import type { PaymentGroup, GroupablePayment } from "../_logic/lib/groupPaymentsBySale";
import { formatMxCurrency } from "../../../_lib/formatMxCurrency";

function fmt(n: number) { return formatMxCurrency(n); }

interface GroupedPaymentsTableProps<T extends GroupablePayment> {
  groups: PaymentGroup<T>[];
  isLoading: boolean;
  columnCount: number;
  headerRow: ReactNode;
  renderPaymentRow: (payment: T) => ReactNode;
}

export function GroupedPaymentsTable<T extends GroupablePayment>({
  groups,
  isLoading,
  columnCount,
  headerRow,
  renderPaymentRow,
}: GroupedPaymentsTableProps<T>) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height={44} width="100%" />
        ))}
      </div>
    );
  }

  if (groups.length === 0) return null;

  function toggle(groupKey: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <THead>{headerRow}</THead>
        <TBody>
          {groups.map((group) => {
            const isOpen = expanded.has(group.groupKey);
            const hasSale = group.saleId !== null;
            return (
              <Fragment key={group.groupKey}>
                <Tr
                  className="border-b border-outline-variant bg-surface-container-low/60 cursor-pointer"
                  onClick={() => toggle(group.groupKey)}
                >
                  <Td colSpan={columnCount}>
                    <div className="flex items-center gap-3">
                      <Icon
                        name="chevron_right"
                        size={18}
                        className={isOpen ? "rotate-90 transition-transform" : "transition-transform"}
                      />
                      <span className="font-mono text-on-surface">
                        {hasSale ? group.saleFolioCode || "—" : "Abono a saldo general (sin ticket)"}
                      </span>
                      <span className="text-on-surface-variant max-w-[200px] truncate">{group.customerName || "—"}</span>
                      <span className="text-label-sm text-on-surface-variant ml-auto">
                        {group.payments.length} abono{group.payments.length !== 1 ? "s" : ""}
                      </span>
                      {hasSale && (
                        <>
                          <span className="tabular-nums font-medium">
                            Monto total: {fmt(group.saleTotal ?? 0)}
                          </span>
                          <span className="tabular-nums font-medium">
                            Saldo: {fmt(group.saleDueAmount ?? 0)}
                          </span>
                        </>
                      )}
                    </div>
                  </Td>
                </Tr>
                {isOpen && group.payments.map((payment) => renderPaymentRow(payment))}
              </Fragment>
            );
          })}
        </TBody>
      </Table>
    </div>
  );
}
