"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "../../../_hooks/useCurrentUser";
import { useCart } from "../_logic/hooks/useCart";
import { useFoliosOptions } from "../../../_hooks/useFoliosOptions";
import { usePaymentMethodsOptions } from "../../../_hooks/usePaymentMethodsOptions";
import { useSaleSubmission } from "../_logic/hooks/useSaleSubmission";
import { useQuoteSubmission } from "../_logic/hooks/useQuoteSubmission";
import { usePosKeyboard } from "../_logic/hooks/usePosKeyboard";
import { canSubmitCart } from "../_logic/lib/canSubmitCart";
import { getProductPrices } from "../_logic/services/getProductPrices";
import { PosHeader } from "./PosHeader";
import { ProductCatalogPanel } from "./ProductCatalogPanel";
import { CartPanel } from "./CartPanel";
import { PriceTierPicker } from "./PriceTierPicker";
import { CustomerQuickAddModal } from "./CustomerQuickAddModal";
import { SaleConfirmedModal } from "./SaleConfirmedModal";
import { PosShortcutsOverlay } from "./PosShortcutsOverlay";
import { EmptyState } from "../../../_components/molecules/EmptyState/EmptyState";
import { Spinner } from "../../../_components/atoms/Spinner/Spinner";
import type { ProductDto, ProductPriceDto, CustomerDto, BranchOption } from "../_logic/types/api";

type Modal = "pricePicker" | "quickAdd" | "confirmed" | "shortcuts" | null;
type PosMode = "sale" | "quote";

interface PricePicker {
  product: ProductDto;
  prices: ProductPriceDto[];
  isLoading: boolean;
  lineId?: string;
}

export function PosPage() {
  const router = useRouter();
  const { can, branchId: userBranchId } = useCurrentUser();
  const canCreate = can("sales:create");
  const canQuote = can("quotes:create");
  const isBypass = can("branches:access_all");

  const { options: folios, isLoading: foliosLoading } = useFoliosOptions({ scope: "POS" });
  const { options: paymentMethods, isLoading: pmLoading } = usePaymentMethodsOptions();
  const {
    lines,
    totals,
    addLine,
    updateQuantity,
    updateDiscountPct,
    changeTier,
    removeLine,
    clear,
  } = useCart();

  const { status: saleStatus, sale, error: saleError, submit: submitSale, reset: resetSale } = useSaleSubmission();
  const { status: quoteStatus, quote, error: quoteError, submit: submitQuote, reset: resetQuote } = useQuoteSubmission();

  const [mode, setMode] = useState<PosMode>(() =>
    canCreate === false && canQuote === true ? "quote" : "sale"
  );
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [selectedFolioId, setSelectedFolioId] = useState<string>("");
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [modal, setModal] = useState<Modal>(null);
  const [pricePicker, setPricePicker] = useState<PricePicker | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const catalogContainerRef = useRef<HTMLDivElement>(null);
  const cartContainerRef = useRef<HTMLDivElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);

  const isQuoteMode = mode === "quote";
  const isSubmitting = mode === "quote" ? quoteStatus === "submitting" : saleStatus === "submitting";

  const canSubmit = canSubmitCart({
    canCreate: mode === "quote" ? canQuote : canCreate,
    linesCount: lines.length,
    selectedFolioId,
    selectedPaymentMethodId,
    isQuoteMode,
    isSubmitting,
  });

  // If user only has quotes:create and not sales:create, force quote mode
  useEffect(() => {
    if (canCreate === false && canQuote === true) {
      setMode("quote");
    }
  }, [canCreate, canQuote]);

  // Load branches for admin bypass
  useEffect(() => {
    if (isBypass !== true && userBranchId) {
      setBranches([{ id: userBranchId, code: "", name: "Mi sucursal", isHeadquarters: false }]);
      setSelectedBranchId(userBranchId);
      return;
    }
    if (isBypass === true) {
      import("../../../_lib/authFetch").then(({ authFetch }) => {
        authFetch("/api/v1/admin/branches?pageSize=100&includeInactive=false")
          .then((r) => r.json())
          .then((body: { items: BranchOption[] }) => {
            setBranches(body.items);
          })
          .catch(() => {});
      });
    }
  }, [isBypass, userBranchId]);

  // Prompt on unload when cart has items
  useEffect(() => {
    if (lines.length === 0) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [lines.length]);

  // Handle sale success
  useEffect(() => {
    if (saleStatus === "succeeded" && sale) {
      setModal("confirmed");
    }
  }, [saleStatus, sale]);

  // Handle quote success → redirect
  useEffect(() => {
    if (quoteStatus === "succeeded" && quote) {
      router.push(`/quotes/${quote.id}`);
    }
  }, [quoteStatus, quote, router]);

  // Restore focus when modal closes
  useEffect(() => {
    if (modal === null && lastFocusedRef.current) {
      lastFocusedRef.current.focus();
      lastFocusedRef.current = null;
    }
  }, [modal]);

  const showSegmented = canCreate === true && canQuote === true;

  usePosKeyboard({
    searchInputRef,
    catalogContainerRef,
    cartContainerRef,
    onSubmit: handleSubmit,
    onClearCart: clear,
    onToggleMode: setMode,
    canToggleMode: showSegmented,
    canSubmit,
    isSubmitting,
    cartHasItems: lines.length > 0,
    onShowShortcuts: () => { lastFocusedRef.current = document.activeElement as HTMLElement; setModal("shortcuts"); },
    liveRegionRef,
  });

  async function handleAddProduct(product: ProductDto) {
    lastFocusedRef.current = document.activeElement as HTMLElement;
    const prices = await getProductPrices(product.id);
    setPricePicker({ product, prices, isLoading: false });
    setModal("pricePicker");
  }

  function handleChangeTier(lineId: string) {
    lastFocusedRef.current = document.activeElement as HTMLElement;
    const line = lines.find((l) => l.id === lineId);
    if (!line) return;
    const fakeProduct: ProductDto = {
      id: line.productId,
      code: line.productCode,
      name: line.productName,
      ivaRate: line.ivaRate,
      iepsRate: line.iepsRate,
      isActive: true,
      departmentId: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setPricePicker({ product: fakeProduct, prices: [], isLoading: true, lineId });
    setModal("pricePicker");
    getProductPrices(line.productId).then((prices) => {
      setPricePicker((prev) => prev ? { ...prev, prices, isLoading: false } : null);
    });
  }

  function handlePriceConfirm(price: ProductPriceDto, quantity: number, discountPct: number) {
    if (!pricePicker) return;
    if (pricePicker.lineId) {
      changeTier(pricePicker.lineId, price);
      updateQuantity(pricePicker.lineId, quantity);
      updateDiscountPct(pricePicker.lineId, discountPct);
    } else {
      addLine(pricePicker.product, price, quantity, discountPct);
    }
    setModal(null);
    setPricePicker(null);
  }

  function handleCustomerCreated(customer: CustomerDto) {
    setSelectedCustomerId(customer.id);
    setModal(null);
  }

  async function handleSubmit() {
    if (mode === "quote") {
      await submitQuote({
        branchId: selectedBranchId,
        customerId: selectedCustomerId || null,
        folioId: selectedFolioId,
        lines,
        expiresAt: expiresAt ? `${expiresAt}T23:59:59Z` : null,
        notes: notes.trim() || null,
      });
    } else {
      await submitSale({
        branchId: selectedBranchId,
        customerId: selectedCustomerId || undefined,
        folioId: selectedFolioId,
        paymentMethodId: selectedPaymentMethodId,
        lines,
        notes: notes.trim() || undefined,
      });
    }
  }

  function handleNewSale() {
    clear();
    resetSale();
    setSelectedFolioId("");
    setSelectedCustomerId("");
    setNotes("");
    setModal(null);
  }

  const submitError = mode === "quote" ? quoteError : saleError;

  // Access guard: user must have at least sales:create OR quotes:create
  if (canCreate === "loading" || canQuote === "loading") {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (canCreate === false && canQuote === false) {
    return (
      <EmptyState
        icon="block"
        title="Sin acceso"
        description="No tienes permiso para emitir ventas ni cotizaciones."
      />
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Accessible live region for screen readers */}
      <div
        ref={liveRegionRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />

      <PosHeader
        branches={branches}
        selectedBranchId={selectedBranchId}
        onBranchChange={setSelectedBranchId}
        cartHasItems={lines.length > 0}
        onClearCart={clear}
        isBypass={isBypass === true}
        mode={mode}
        onModeChange={showSegmented ? setMode : undefined}
        canQuote={showSegmented}
        onShowShortcuts={() => { lastFocusedRef.current = document.activeElement as HTMLElement; setModal("shortcuts"); }}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Product catalog */}
        <div
          ref={catalogContainerRef}
          className="flex-1 border-r border-outline-variant overflow-hidden flex flex-col"
        >
          <ProductCatalogPanel
            branchId={selectedBranchId || undefined}
            onAddProduct={handleAddProduct}
            searchInputRef={searchInputRef}
          />
        </div>

        {/* Right: Cart */}
        <div className="w-96 shrink-0 flex flex-col overflow-hidden">
          <CartPanel
            lines={lines}
            totals={totals}
            folios={folios}
            paymentMethods={paymentMethods}
            selectedFolioId={selectedFolioId}
            selectedPaymentMethodId={selectedPaymentMethodId}
            selectedCustomerId={selectedCustomerId}
            notes={notes}
            isLoadingOptions={foliosLoading || pmLoading}
            isSubmitting={isSubmitting}
            canCreate={mode === "quote" ? canQuote : canCreate}
            mode={mode}
            expiresAt={expiresAt}
            onFolioChange={setSelectedFolioId}
            onPaymentMethodChange={setSelectedPaymentMethodId}
            onCustomerChange={(id) => setSelectedCustomerId(id)}
            onNotesChange={setNotes}
            onExpiresAtChange={setExpiresAt}
            onOpenQuickAdd={() => { lastFocusedRef.current = document.activeElement as HTMLElement; setModal("quickAdd"); }}
            onUpdateQuantity={updateQuantity}
            onUpdateDiscount={updateDiscountPct}
            onChangeTier={handleChangeTier}
            onRemoveLine={removeLine}
            onSubmit={handleSubmit}
            containerRef={cartContainerRef}
          />
        </div>
      </div>

      {modal === "pricePicker" && pricePicker && (
        <PriceTierPicker
          product={pricePicker.product}
          prices={pricePicker.prices}
          isLoading={pricePicker.isLoading}
          onConfirm={handlePriceConfirm}
          onClose={() => { setModal(null); setPricePicker(null); }}
        />
      )}

      {modal === "quickAdd" && (
        <CustomerQuickAddModal
          onCreated={handleCustomerCreated}
          onClose={() => setModal(null)}
        />
      )}

      {modal === "confirmed" && sale && (
        <SaleConfirmedModal
          sale={sale}
          onNewSale={handleNewSale}
        />
      )}

      {modal === "shortcuts" && (
        <PosShortcutsOverlay
          canToggleMode={showSegmented}
          onClose={() => setModal(null)}
        />
      )}

      {submitError && (
        <div className="fixed bottom-4 right-4 z-50 bg-error-container text-on-error-container rounded-xl px-4 py-3 text-body-sm shadow-lg max-w-sm">
          {submitError.message}
        </div>
      )}
    </div>
  );
}
