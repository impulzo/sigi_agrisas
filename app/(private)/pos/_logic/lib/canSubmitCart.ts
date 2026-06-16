interface CanSubmitCartArgs {
  canCreate: boolean | "loading";
  linesCount: number;
  selectedFolioId: string;
  selectedPaymentMethodId: string;
  isQuoteMode: boolean;
  isSubmitting: boolean;
}

export function canSubmitCart({
  canCreate,
  linesCount,
  selectedFolioId,
  selectedPaymentMethodId,
  isQuoteMode,
  isSubmitting,
}: CanSubmitCartArgs): boolean {
  return (
    canCreate === true &&
    linesCount > 0 &&
    !!selectedFolioId &&
    (isQuoteMode || !!selectedPaymentMethodId) &&
    !isSubmitting
  );
}
