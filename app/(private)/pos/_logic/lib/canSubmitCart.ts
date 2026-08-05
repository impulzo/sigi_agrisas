interface CanSubmitCartArgs {
  canCreate: boolean | "loading";
  linesCount: number;
  selectedBranchId: string;
  selectedFolioId: string;
  selectedPaymentMethodId: string;
  isQuoteMode: boolean;
  isSubmitting: boolean;
}

export function canSubmitCart({
  canCreate,
  linesCount,
  selectedBranchId,
  selectedFolioId,
  selectedPaymentMethodId,
  isQuoteMode,
  isSubmitting,
}: CanSubmitCartArgs): boolean {
  return (
    canCreate === true &&
    linesCount > 0 &&
    !!selectedBranchId &&
    !!selectedFolioId &&
    (isQuoteMode || !!selectedPaymentMethodId) &&
    !isSubmitting
  );
}
