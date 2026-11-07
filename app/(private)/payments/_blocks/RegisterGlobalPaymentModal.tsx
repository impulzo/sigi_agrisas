"use client";

import { useRef, useEffect } from "react";
import { useRegisterAccountPaymentForm } from "../_logic/hooks/useRegisterAccountPaymentForm";
import { CustomerPicker } from "../../pos/_blocks/CustomerPicker";
import { RegisterPaymentModal } from "./RegisterPaymentModal";
import { Button } from "../../../_components/atoms/Button/Button";
import { Select } from "../../../_components/atoms/Select/Select";
import { Table, THead, TBody, Tr, Th, Td } from "../../../_components/molecules/DataTable/DataTable";
import { Spinner } from "../../../_components/atoms/Spinner/Spinner";
import { formatMxCurrency } from "../../../_lib/formatMxCurrency";

function fmt(n: number) { return formatMxCurrency(n); }

interface RegisterGlobalPaymentModalProps {
  onSuccess: () => void;
  onClose: () => void;
}

export function RegisterGlobalPaymentModal({ onSuccess, onClose }: RegisterGlobalPaymentModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const form = useRegisterAccountPaymentForm({ onSuccess });

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [onClose]);

  const hasCustomer = form.customerId !== "";

  return (
    <>
      <dialog
        ref={dialogRef}
        className="rounded-lg bg-surface shadow-elevation-3 p-0 w-full max-w-lg backdrop:bg-black/40"
        onClose={onClose}
      >
        <div className="px-6 py-4 border-b border-outline-variant">
          <h2 className="text-title-md font-semibold text-on-surface">Registrar abono</h2>
        </div>

        <div className="flex flex-col gap-4 p-6 max-h-[70vh] overflow-y-auto">
          <CustomerPicker
            value={form.customerId}
            onChange={(id) => form.setCustomerId(id)}
            onOpenQuickAdd={() => {}}
          />

          {hasCustomer && form.isLoading && (
            <div className="flex justify-center py-4">
              <Spinner size="md" />
            </div>
          )}

          {hasCustomer && !form.isLoading && (
            <>
              {form.pendingSales.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-label-md text-on-surface-variant">Ventas pendientes</p>
                  <div className="overflow-x-auto rounded-md border border-outline-variant">
                    <Table>
                      <THead>
                        <Tr hoverable={false}>
                          <Th>Folio</Th>
                          <Th align="right">Saldo</Th>
                          <Th>Acción</Th>
                        </Tr>
                      </THead>
                      <TBody>
                        {form.pendingSales.map((s) => (
                          <Tr key={s.saleId}>
                            <Td className="font-mono text-on-surface-variant">{s.folioCode}</Td>
                            <Td align="right" className="font-medium">{fmt(s.due)}</Td>
                            <Td>
                              <Button
                                type="button"
                                variant="text"
                                onClick={() => form.selectSale(s.saleId, s.due)}
                                className="rounded-none p-0 text-label-sm underline hover:bg-transparent"
                              >
                                Abonar
                              </Button>
                            </Td>
                          </Tr>
                        ))}
                      </TBody>
                    </Table>
                  </div>
                </div>
              )}

              {form.accountDebt > 0 ? (
                <form onSubmit={form.handleAccountSubmit} className="flex flex-col gap-4 border-t border-outline-variant pt-4">
                  <p className="text-label-md text-on-surface-variant">
                    Saldo general sin ticket:{" "}
                    <span className="font-medium text-on-surface">{fmt(form.accountDebt)}</span>
                  </p>

                  <div className="flex flex-col gap-1">
                    <label className="text-label-md text-on-surface-variant" htmlFor="acc-amount">Monto</label>
                    <input
                      id="acc-amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={form.accountDebt}
                      value={form.amount}
                      onChange={(e) => form.setAmount(e.target.value)}
                      className="rounded-md border border-outline bg-surface px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary"
                      placeholder="0.00"
                    />
                    {form.amountError && <p className="text-body-sm text-error">{form.amountError}</p>}
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-label-md text-on-surface-variant" htmlFor="acc-method">Método de pago</label>
                    <Select id="acc-method" value={form.paymentMethodId} onChange={(e) => form.setPaymentMethodId(e.target.value)} disabled={form.methodsLoading}>
                      {form.methodOptions.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-label-md text-on-surface-variant" htmlFor="acc-folio">Folio de recibo</label>
                    <Select id="acc-folio" value={form.folioId} onChange={(e) => form.setFolioId(e.target.value)} disabled={form.foliosLoading}>
                      {form.folioOptions.map((f) => (
                        <option key={f.id} value={f.id}>{f.name} ({f.code})</option>
                      ))}
                    </Select>
                  </div>

                  {form.isBypass === true && (
                    <div className="flex flex-col gap-1">
                      <label className="text-label-md text-on-surface-variant" htmlFor="acc-branch">Sucursal</label>
                      <Select id="acc-branch" value={form.branchId} onChange={(e) => form.setBranchId(e.target.value)}>
                        <option value="">Selecciona una sucursal...</option>
                        {form.branchOptions.map((b) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </Select>
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    <label className="text-label-md text-on-surface-variant" htmlFor="acc-notes">
                      Notas <span className="text-on-surface-variant/60">(opcional)</span>
                    </label>
                    <textarea
                      id="acc-notes"
                      rows={2}
                      maxLength={1000}
                      value={form.notes}
                      onChange={(e) => form.setNotes(e.target.value)}
                      className="rounded-md border border-outline bg-surface px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary resize-none"
                      placeholder="Comentarios adicionales..."
                    />
                  </div>

                  {form.formError && (
                    <p className="text-body-sm text-error bg-error-container/20 rounded px-3 py-2">{form.formError}</p>
                  )}

                  <div className="flex justify-end">
                    <Button type="submit" variant="filled" loading={form.isSaving} className="px-5 py-2 text-body-sm">
                      Abonar a saldo general
                    </Button>
                  </div>
                </form>
              ) : (
                form.pendingSales.length === 0 && (
                  <p className="text-body-sm text-on-surface-variant py-2">
                    Este cliente no tiene saldo pendiente.
                  </p>
                )
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-outline-variant">
          <Button
            type="button"
            variant="outlined"
            onClick={() => dialogRef.current?.close()}
            className="px-5 py-2 text-body-sm"
          >
            Cerrar
          </Button>
        </div>
      </dialog>

      {form.selectedSaleId && (
        <RegisterPaymentModal
          saleId={form.selectedSaleId}
          dueAmount={form.selectedSaleDue}
          lineBalances={[]}
          onSuccess={form.onSaleRegistered}
          onClose={form.clearSelectedSale}
        />
      )}
    </>
  );
}
