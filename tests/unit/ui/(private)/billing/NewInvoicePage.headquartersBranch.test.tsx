/**
 * @jest-environment jsdom
 *
 * Reemplaza NewInvoicePage.branchSelector.test.tsx tras improve-billing-invoice-details:
 * "Factura parcial" ya no muestra ningún selector de sucursal — siempre usa la
 * sucursal marcada isHeadquarters=true, resuelta vía useHeadquarters().
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("../../../../../app/_hooks/useCurrentUser");
jest.mock("../../../../../app/_hooks/useHeadquarters");

jest.mock("../../../../../app/(private)/billing/_blocks/StampSaleForm", () => ({
  StampSaleForm: () => <div data-testid="stamp-sale-form" />,
}));
jest.mock("../../../../../app/(private)/billing/_blocks/PartialInvoiceForm", () => ({
  PartialInvoiceForm: ({ branchId }: { branchId?: string | null }) => (
    <div data-testid="partial-form" data-branch-id={branchId ?? "null"} />
  ),
}));

import { useCurrentUser } from "../../../../../app/_hooks/useCurrentUser";
import { useHeadquarters } from "../../../../../app/_hooks/useHeadquarters";
import { NewInvoicePage } from "../../../../../app/(private)/billing/_blocks/NewInvoicePage";

const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;
const mockUseHeadquarters = useHeadquarters as jest.MockedFunction<typeof useHeadquarters>;

function setupUser({ branchId, isBypass }: { branchId: string | null; isBypass: boolean }) {
  mockUseCurrentUser.mockReturnValue({
    userId: "u1",
    email: "test@test.com",
    roles: [],
    branchId,
    isLoading: false,
    can: jest.fn((p: string) => (p === "billing:write" ? true : p === "branches:access_all" ? isBypass : false)),
    refresh: jest.fn(),
  });
}

async function switchToPartialMode(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("tab", { name: /factura parcial/i }));
}

describe("NewInvoicePage — sucursal matriz fija en factura parcial (sin selector)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("usuario con branches:access_all NO ve ningún selector de sucursal", async () => {
    setupUser({ branchId: null, isBypass: true });
    mockUseHeadquarters.mockReturnValue({ hq: { id: "b-matriz", code: "MATRIZ", name: "Matriz" }, isLoading: false, refresh: jest.fn() });
    const user = userEvent.setup();
    render(<NewInvoicePage />);
    await switchToPartialMode(user);

    expect(screen.queryByRole("combobox", { name: /sucursal/i })).toBeNull();
    expect(await screen.findByTestId("partial-form")).toHaveAttribute("data-branch-id", "b-matriz");
  });

  it("usuario sin branches:access_all tampoco ve selector — mismo comportamiento fijo a HQ", async () => {
    setupUser({ branchId: "b-own", isBypass: false });
    mockUseHeadquarters.mockReturnValue({ hq: { id: "b-matriz", code: "MATRIZ", name: "Matriz" }, isLoading: false, refresh: jest.fn() });
    const user = userEvent.setup();
    render(<NewInvoicePage />);
    await switchToPartialMode(user);

    expect(screen.queryByRole("combobox", { name: /sucursal/i })).toBeNull();
    expect(await screen.findByTestId("partial-form")).toHaveAttribute("data-branch-id", "b-matriz");
  });

  it("mientras useHeadquarters está cargando, muestra spinner y no renderiza el formulario", async () => {
    setupUser({ branchId: null, isBypass: true });
    mockUseHeadquarters.mockReturnValue({ hq: null, isLoading: true, refresh: jest.fn() });
    const user = userEvent.setup();
    render(<NewInvoicePage />);
    await switchToPartialMode(user);

    expect(screen.queryByTestId("partial-form")).toBeNull();
  });

  it("sin sucursal matriz configurada, bloquea el formulario con mensaje explícito", async () => {
    setupUser({ branchId: null, isBypass: true });
    mockUseHeadquarters.mockReturnValue({ hq: null, isLoading: false, refresh: jest.fn() });
    const user = userEvent.setup();
    render(<NewInvoicePage />);
    await switchToPartialMode(user);

    expect(screen.queryByTestId("partial-form")).toBeNull();
    expect(await screen.findByText(/no hay sucursal matriz configurada/i)).toBeInTheDocument();
  });

  it("selector NO aparece en modo 'Facturar venta' (nunca existió ahí)", async () => {
    setupUser({ branchId: null, isBypass: true });
    mockUseHeadquarters.mockReturnValue({ hq: { id: "b-matriz", code: "MATRIZ", name: "Matriz" }, isLoading: false, refresh: jest.fn() });
    render(<NewInvoicePage />);

    expect(screen.queryByRole("combobox", { name: /sucursal/i })).toBeNull();
    await screen.findByTestId("stamp-sale-form");
  });
});
