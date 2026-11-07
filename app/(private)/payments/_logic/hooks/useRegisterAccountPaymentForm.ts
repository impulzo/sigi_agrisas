import { useEffect, useState } from "react";
import { useCurrentUser } from "../../../../_hooks/useCurrentUser";
import { useBranchesOptions } from "../../../../_hooks/useBranchesOptions";
import { useFoliosOptions } from "../../../../_hooks/useFoliosOptions";
import { usePaymentMethodsOptions } from "../../../../_hooks/usePaymentMethodsOptions";
import { useCustomerAccountDebt } from "./useCustomerAccountDebt";
import { registerAccountPayment } from "../services/registerAccountPayment";
import {
  PaymentExceedsAccountDebtError,
  CustomerNotFoundError,
  FolioScopeMismatchError,
} from "../errors";

interface UseRegisterAccountPaymentFormOptions {
  onSuccess: () => void;
}

export function useRegisterAccountPaymentForm({ onSuccess }: UseRegisterAccountPaymentFormOptions) {
  const { can } = useCurrentUser();
  const isBypass = can("branches:access_all");

  const [customerId, setCustomerId] = useState<string>("");
  const { pendingSales, accountDebt, isLoading, refresh } = useCustomerAccountDebt(customerId || null);

  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [selectedSaleDue, setSelectedSaleDue] = useState(0);

  const { options: folioOptions, isLoading: foliosLoading } = useFoliosOptions({ scope: "OPERATIONS" });
  const { options: methodOptions, isLoading: methodsLoading } = usePaymentMethodsOptions();
  const { options: branchOptions } = useBranchesOptions();

  const [branchId, setBranchId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [folioId, setFolioId] = useState("");
  const [notes, setNotes] = useState("");
  const [amountError, setAmountError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!foliosLoading && folioOptions.length > 0 && !folioId) {
      const rb = folioOptions.find((f) => f.code === "RB");
      setFolioId(rb?.id ?? folioOptions[0].id);
    }
  }, [foliosLoading, folioOptions, folioId]);

  useEffect(() => {
    if (!methodsLoading && methodOptions.length > 0 && !paymentMethodId) {
      setPaymentMethodId(methodOptions[0].id);
    }
  }, [methodsLoading, methodOptions, paymentMethodId]);

  function setAmountValue(value: string) {
    setAmount(value);
    setAmountError(null);
  }

  function selectSale(saleId: string, due: number) {
    setSelectedSaleId(saleId);
    setSelectedSaleDue(due);
  }

  function clearSelectedSale() {
    setSelectedSaleId(null);
  }

  async function handleAccountSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAmountError(null);
    setFormError(null);

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setAmountError("El monto debe ser mayor a 0");
      return;
    }
    if (!paymentMethodId) {
      setFormError("Selecciona un método de pago");
      return;
    }
    if (!folioId) {
      setFormError("Selecciona un folio");
      return;
    }
    if (isBypass === true && !branchId) {
      setFormError("Selecciona una sucursal para este abono");
      return;
    }

    setIsSaving(true);
    try {
      await registerAccountPayment(customerId, {
        amount: numAmount,
        paymentMethodId,
        folioId,
        notes: notes || undefined,
        branchId: isBypass === true ? branchId : undefined,
      });
      setAmount("");
      setNotes("");
      refresh();
      onSuccess();
    } catch (err) {
      if (err instanceof PaymentExceedsAccountDebtError) {
        setAmountError(err.message);
      } else if (err instanceof CustomerNotFoundError) {
        setFormError(err.message);
      } else if (err instanceof FolioScopeMismatchError) {
        setFormError(err.message);
      } else if (err instanceof Error) {
        setFormError(err.message);
      }
    } finally {
      setIsSaving(false);
    }
  }

  function onSaleRegistered() {
    clearSelectedSale();
    refresh();
    onSuccess();
  }

  return {
    customerId,
    setCustomerId,
    isBypass,
    pendingSales,
    accountDebt,
    isLoading,
    selectedSaleId,
    selectedSaleDue,
    selectSale,
    clearSelectedSale,
    onSaleRegistered,
    amount,
    setAmount: setAmountValue,
    paymentMethodId,
    setPaymentMethodId,
    folioId,
    setFolioId,
    branchId,
    setBranchId,
    notes,
    setNotes,
    amountError,
    formError,
    isSaving,
    folioOptions,
    foliosLoading,
    methodOptions,
    methodsLoading,
    branchOptions,
    handleAccountSubmit,
  };
}
