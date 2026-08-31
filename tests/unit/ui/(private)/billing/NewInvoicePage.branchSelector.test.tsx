/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("../../../../../app/_hooks/useCurrentUser");
jest.mock("../../../../../app/_lib/authFetch");

jest.mock("../../../../../app/(private)/billing/_blocks/StampSaleForm", () => ({
  StampSaleForm: () => <div data-testid="stamp-sale-form" />,
}));
jest.mock("../../../../../app/(private)/billing/_blocks/PartialInvoiceForm", () => ({
  PartialInvoiceForm: ({ branchId }: { branchId?: string | null }) => (
    <div data-testid="partial-form" data-branch-id={branchId ?? "null"} />
  ),
}));

import { useCurrentUser } from "../../../../../app/_hooks/useCurrentUser";
import { authFetch } from "../../../../../app/_lib/authFetch";
import { NewInvoicePage } from "../../../../../app/(private)/billing/_blocks/NewInvoicePage";

const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;
const mockAuthFetch = authFetch as jest.MockedFunction<typeof authFetch>;

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

describe("NewInvoicePage — selector de sucursal para branches:access_all", () => {
  beforeEach(() => jest.clearAllMocks());

  it("usuario con branches:access_all ve el selector, sin sucursal preseleccionada", async () => {
    setupUser({ branchId: null, isBypass: true });
    mockAuthFetch.mockResolvedValue({
      json: async () => ({
        items: [
          { id: "b-tlaxiaco", code: "TLAXIACO", name: "TLAXIACO", isHeadquarters: false },
          { id: "b-pradera", code: "PRADERA", name: "PRADERA", isHeadquarters: false },
        ],
      }),
    } as Response);
    const user = userEvent.setup();
    render(<NewInvoicePage />);
    await switchToPartialMode(user);

    const select = await screen.findByRole("combobox", { name: /sucursal/i });
    expect(select).toHaveValue("");
    expect(await screen.findByRole("option", { name: "TLAXIACO" })).toBeInTheDocument();
  });

  it("usuario sin branches:access_all con branchId propio NO ve selector", async () => {
    setupUser({ branchId: "b-own", isBypass: false });
    const user = userEvent.setup();
    render(<NewInvoicePage />);
    await switchToPartialMode(user);

    expect(screen.queryByRole("combobox", { name: /sucursal/i })).toBeNull();
    expect(mockAuthFetch).not.toHaveBeenCalled();
  });

  it("usuario sin branches:access_all: PartialInvoiceForm recibe su branchId propio", async () => {
    setupUser({ branchId: "b-own", isBypass: false });
    const user = userEvent.setup();
    render(<NewInvoicePage />);
    await switchToPartialMode(user);

    expect(await screen.findByTestId("partial-form")).toHaveAttribute("data-branch-id", "b-own");
  });

  it("bypass sin seleccionar sucursal: PartialInvoiceForm recibe branchId null", async () => {
    setupUser({ branchId: null, isBypass: true });
    mockAuthFetch.mockResolvedValue({
      json: async () => ({ items: [{ id: "b-tlaxiaco", code: "TLAXIACO", name: "TLAXIACO", isHeadquarters: false }] }),
    } as Response);
    const user = userEvent.setup();
    render(<NewInvoicePage />);
    await switchToPartialMode(user);

    expect(await screen.findByTestId("partial-form")).toHaveAttribute("data-branch-id", "null");
  });

  it("bypass selecciona una sucursal: PartialInvoiceForm recibe ese branchId", async () => {
    setupUser({ branchId: null, isBypass: true });
    mockAuthFetch.mockResolvedValue({
      json: async () => ({ items: [{ id: "b-tlaxiaco", code: "TLAXIACO", name: "TLAXIACO", isHeadquarters: false }] }),
    } as Response);
    const user = userEvent.setup();
    render(<NewInvoicePage />);
    await switchToPartialMode(user);

    const select = await screen.findByRole("combobox", { name: /sucursal/i });
    await user.selectOptions(select, "b-tlaxiaco");

    expect(await screen.findByTestId("partial-form")).toHaveAttribute("data-branch-id", "b-tlaxiaco");
  });

  it("selector NO aparece en modo 'Facturar venta'", async () => {
    setupUser({ branchId: null, isBypass: true });
    mockAuthFetch.mockResolvedValue({ json: async () => ({ items: [] }) } as Response);
    render(<NewInvoicePage />);

    expect(screen.queryByRole("combobox", { name: /sucursal/i })).toBeNull();
    await screen.findByTestId("stamp-sale-form");
  });
});
