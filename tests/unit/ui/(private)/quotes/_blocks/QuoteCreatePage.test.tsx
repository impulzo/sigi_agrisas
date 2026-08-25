/**
 * @jest-environment jsdom
 */
import React from "react";
import { render } from "@testing-library/react";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("../../../../../../app/_hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({ can: () => true, userId: "u1", email: "t@t.com", roles: [], branchId: "b1", isLoading: false, refresh: jest.fn() }),
}));
jest.mock("../../../../../../app/_hooks/useFoliosOptions", () => ({
  useFoliosOptions: () => ({ options: [], isLoading: false }),
}));
jest.mock("../../../../../../app/(private)/quotes/_logic/hooks/useQuoteSubmission", () => ({
  useQuoteSubmission: () => ({ status: "idle", quote: null, queuedQuote: null, error: null, submit: jest.fn(), reset: jest.fn() }),
}));
jest.mock("../../../../../../app/(private)/pos/_blocks/ProductCatalogPanel", () => ({
  ProductCatalogPanel: () => <div data-testid="catalog-panel" />,
}));
const mockQuoteEmitPanel = jest.fn((_props: unknown) => <div data-testid="emit-panel" />);
jest.mock("../../../../../../app/(private)/quotes/_blocks/QuoteEmitPanel", () => ({
  QuoteEmitPanel: (props: unknown) => mockQuoteEmitPanel(props),
}));

const mockOfflineSyncValue: { isOnline: boolean; offlineEnabled: boolean; ownerBranchId: string | null } = {
  isOnline: true,
  offlineEnabled: false,
  ownerBranchId: null,
};
jest.mock("../../../../../../app/(private)/_blocks/OfflineSyncProvider", () => ({
  useOfflineSync: () => mockOfflineSyncValue,
}));
jest.mock("../../../../../../app/_components/atoms/Spinner/Spinner", () => ({
  Spinner: () => <span data-testid="spinner" />,
}));
jest.mock("../../../../../../app/_components/molecules/EmptyState/EmptyState", () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

const mockUseCart = jest.fn().mockReturnValue({
  lines: [],
  totals: { subtotal: 0, taxTotal: 0, total: 0 },
  addLine: jest.fn(),
  updateQuantity: jest.fn(),
  updateDiscountPct: jest.fn(),
  changeTier: jest.fn(),
  removeLine: jest.fn(),
});
jest.mock("../../../../../../app/(private)/pos/_logic/hooks/useCart", () => ({
  useCart: (...args: unknown[]) => mockUseCart(...args),
}));

jest.mock("../../../../../../app/_hooks/usePricingSettingsOptions", () => ({
  usePricingSettingsOptions: () => ({ dosificationSurchargePct: 7, isLoading: false }),
}));

import { QuoteCreatePage } from "../../../../../../app/(private)/quotes/_blocks/QuoteCreatePage";

describe("QuoteCreatePage — recargo de dosificación", () => {
  it("pasa el dosificationSurchargePct vigente a useCart", () => {
    render(<QuoteCreatePage />);
    expect(mockUseCart).toHaveBeenCalledWith(7);
  });
});

describe("QuoteCreatePage — gating offline", () => {
  beforeEach(() => {
    mockQuoteEmitPanel.mockClear();
    mockOfflineSyncValue.isOnline = true;
    mockOfflineSyncValue.offlineEnabled = false;
    mockOfflineSyncValue.ownerBranchId = null;
  });

  it("offlineBlocked=false mientras hay conexión", () => {
    render(<QuoteCreatePage />);
    expect(mockQuoteEmitPanel).toHaveBeenCalledWith(
      expect.objectContaining({ offlineBlocked: false })
    );
  });

  it("offlineBlocked=true sin conexión y sin offlineEnabled", () => {
    mockOfflineSyncValue.isOnline = false;
    render(<QuoteCreatePage />);
    expect(mockQuoteEmitPanel).toHaveBeenCalledWith(
      expect.objectContaining({ offlineBlocked: true })
    );
  });
});
