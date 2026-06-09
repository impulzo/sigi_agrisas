import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = jest.fn(function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = jest.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  });
});

jest.mock("../../../../../app/_lib/authFetch", () => ({
  authFetch: jest.fn(),
}));

import { InventoryAssignModal } from "../../../../../app/(private)/inventory/_blocks/InventoryAssignModal";

const DEFAULT_PROPS = {
  open: true,
  branchId: "b1",
  isSaving: false,
  assignError: null,
  onAssign: jest.fn(),
  onClose: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

describe("InventoryAssignModal — errores de servidor (prop assignError)", () => {
  it("muestra error 409 cuando el producto ya está asignado a la sucursal", () => {
    render(
      <InventoryAssignModal
        {...DEFAULT_PROPS}
        assignError="Este producto ya está asignado a la sucursal."
      />
    );
    expect(screen.getByText("Este producto ya está asignado a la sucursal.")).toBeInTheDocument();
  });

  it("muestra error 400 cuando el producto no existe o está inactivo", () => {
    render(
      <InventoryAssignModal
        {...DEFAULT_PROPS}
        assignError="El producto no existe o está inactivo."
      />
    );
    expect(screen.getByText("El producto no existe o está inactivo.")).toBeInTheDocument();
  });
});

describe("InventoryAssignModal — validación client-side", () => {
  it("cantidad negativa muestra error inline sin llamar onAssign", async () => {
    const user = userEvent.setup();
    render(<InventoryAssignModal {...DEFAULT_PROPS} />);

    // spinbutton[0] = stock inicial (quantity), spinbutton[1] = punto de reorden
    const [qtyInput] = screen.getAllByRole("spinbutton");
    await user.clear(qtyInput);
    await user.type(qtyInput, "-5");

    await user.click(screen.getByRole("button", { name: /^asignar$/i }));

    expect(screen.getByText(/la cantidad no puede ser negativa/i)).toBeInTheDocument();
    expect(DEFAULT_PROPS.onAssign).not.toHaveBeenCalled();
  });
});
