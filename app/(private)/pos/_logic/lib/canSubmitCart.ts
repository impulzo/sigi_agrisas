interface CanSubmitCartArgs {
  canCreate: boolean | "loading";
  linesCount: number;
  selectedBranchId: string;
  selectedFolioId: string;
  selectedPaymentMethodId: string;
  isQuoteMode: boolean;
  isSubmitting: boolean;
  isOnline: boolean;
  offlineEnabled: boolean;
  ownerBranchId: string | null;
}

export function canSubmitCart({
  canCreate,
  linesCount,
  selectedBranchId,
  selectedFolioId,
  selectedPaymentMethodId,
  isQuoteMode,
  isSubmitting,
  isOnline,
  offlineEnabled,
  ownerBranchId,
}: CanSubmitCartArgs): boolean {
  const offlineBlocked = !isOnline && (!offlineEnabled || ownerBranchId !== selectedBranchId);
  return (
    canCreate === true &&
    linesCount > 0 &&
    !!selectedBranchId &&
    !!selectedFolioId &&
    (isQuoteMode || !!selectedPaymentMethodId) &&
    !isSubmitting &&
    !offlineBlocked
  );
}
