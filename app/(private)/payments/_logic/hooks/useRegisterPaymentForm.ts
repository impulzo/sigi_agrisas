import { useEffect, useState } from "react";
import { useFoliosOptions } from "../../../../_hooks/useFoliosOptions";
import { usePaymentMethodsOptions } from "../../../../_hooks/usePaymentMethodsOptions";
import { registerPayment } from "../services/registerPayment";
import {
  PaymentExceedsDueAmountError,
  PaymentExceedsLineDueAmountError,
  PaymentItemsAmountMismatchError,
  SaleItemNotFoundError,
  SaleNotPayableError,
  FolioScopeMismatchError,
} from "../errors";
import type { LineBalance } from "../types/domain";

interface UseRegisterPaymentFormOptions {
  saleId: string;
  lineBalances: LineBalance[];
  onSuccess: () => void;
}

export function useRegisterPaymentForm({ saleId, lineBalances, onSuccess }: UseRegisterPaymentFormOptions) {
  const { options: folioOptions, isLoading: foliosLoading } = useFoliosOptions({ scope: "OPERATIONS" });
  const { options: methodOptions, isLoading: methodsLoading } = usePaymentMethodsOptions();

  const [byLine, setByLine] = useState(false);
  const [amount, setAmount] = useState("");
  const [lineAmounts, setLineAmounts] = useState<Record<string, string>>({});
  const [lineErrors, setLineErrors] = useState<Record<string, string>>({});
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

  function setByLineMode(value: boolean) {
    setByLine(value);
    setAmountError(null);
    setLineErrors({});
  }

  function setAmountValue(value: string) {
    setAmount(value);
    setAmountError(null);
  }

  function setLineAmount(saleItemId: string, value: string) {
    setLineAmounts((prev) => ({ ...prev, [saleItemId]: value }));
    setLineErrors((prev) => { const next = { ...prev }; delete next[saleItemId]; return next; });
  }

  function lineAmountsToItems(): { items: { saleItemId: string; amount: number }[]; sum: number } {
    const items: { saleItemId: string; amount: number }[] = [];
    let sum = 0;
    for (const lb of lineBalances) {
      const raw = lineAmounts[lb.saleItemId];
      const n = raw ? parseFloat(raw) : 0;
      if (n > 0) {
        items.push({ saleItemId: lb.saleItemId, amount: n });
        sum += n;
      }
    }
    return { items, sum };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAmountError(null);
    setFormError(null);
    setLineErrors({});

    let numAmount: number;
    let items: { saleItemId: string; amount: number }[] | undefined;

    if (byLine) {
      const { items: lineItems, sum } = lineAmountsToItems();
      if (lineItems.length === 0) {
        setFormError("Captura al menos un monto por línea");
        return;
      }
      numAmount = sum;
      items = lineItems;
    } else {
      numAmount = parseFloat(amount);
      if (!amount || isNaN(numAmount) || numAmount <= 0) {
        setAmountError("El monto debe ser mayor a 0");
        return;
      }
    }

    if (!paymentMethodId) {
      setFormError("Selecciona un método de pago");
      return;
    }
    if (!folioId) {
      setFormError("Selecciona un folio");
      return;
    }

    setIsSaving(true);
    try {
      await registerPayment({
        saleId,
        amount: numAmount,
        paymentMethodId,
        folioId,
        notes: notes || undefined,
        items,
      });
      onSuccess();
    } catch (err) {
      if (err instanceof PaymentExceedsLineDueAmountError) {
        setLineErrors({ [err.saleItemId]: err.message });
      } else if (err instanceof PaymentExceedsDueAmountError) {
        setAmountError(err.message);
      } else if (err instanceof PaymentItemsAmountMismatchError) {
        setFormError(err.message);
      } else if (err instanceof SaleItemNotFoundError) {
        setFormError(err.message);
      } else if (err instanceof SaleNotPayableError) {
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

  return {
    byLine,
    setByLine: setByLineMode,
    amount,
    setAmount: setAmountValue,
    lineAmounts,
    setLineAmount,
    lineErrors,
    paymentMethodId,
    setPaymentMethodId,
    folioId,
    setFolioId,
    notes,
    setNotes,
    amountError,
    formError,
    isSaving,
    folioOptions,
    foliosLoading,
    methodOptions,
    methodsLoading,
    handleSubmit,
  };
}
