/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("../../../../../../app/(private)/returns/_logic/hooks/useReturnMutations");

import * as useReturnMutationsModule from "../../../../../../app/(private)/returns/_logic/hooks/useReturnMutations";
import { CancelReturnModal } from "../../../../../../app/(private)/returns/_blocks/CancelReturnModal";
import {
  ReturnAlreadyCancelledError,
  ReturnCancelForbiddenError,
} from "../../../../../../app/(private)/returns/_logic/errors";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = jest.fn();
  HTMLDialogElement.prototype.close = jest.fn();
});

const NOW = new Date().toISOString();
const baseDetail = {
  id: "r1",
  saleId: "s1",
  branchId: "b1",
  creatorId: "u1",
  status: "cancelled" as const,
  reason: "x",
  refundTotal: 50,
  returnedAt: new Date(NOW),
  createdAt: new Date(NOW),
  updatedAt: new Date(NOW),
  items: [],
};

// JSDOM doesn't mark <dialog> content as accessible unless `open` attr is set.
// Use { hidden: true } to query inside the dialog.
const H = { hidden: true };

function setup({
  cancelFn = jest.fn().mockResolvedValue(baseDetail),
}: {
  cancelFn?: jest.Mock;
} = {}) {
  jest.spyOn(useReturnMutationsModule, "useReturnMutations").mockReturnValue({
    isSaving: false,
    mutationError: null,
    clearError: jest.fn(),
    cancel: cancelFn,
    create: jest.fn(),
  });

  const onClose = jest.fn();
  const onSuccess = jest.fn();

  const utils = render(
    <CancelReturnModal
      returnId="r1"
      open={true}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );

  return { ...utils, onClose, onSuccess, cancelFn };
}

describe("CancelReturnModal — renderizado", () => {
  beforeEach(() => jest.clearAllMocks());

  it("muestra el título del modal", () => {
    setup();
    expect(screen.getByRole("heading", { name: /Cancelar devolución/i, ...H })).toBeInTheDocument();
  });

  it("muestra advertencia de stock negativo", () => {
    setup();
    expect(screen.getByText(/podría quedar negativo/i)).toBeInTheDocument();
  });

  it("contador de caracteres muestra 0/500 inicialmente", () => {
    setup();
    expect(screen.getByText("0/500")).toBeInTheDocument();
  });
});

describe("CancelReturnModal — submit exitoso", () => {
  beforeEach(() => jest.clearAllMocks());

  it("200 → llama onSuccess y onClose", async () => {
    const user = userEvent.setup();
    const { onClose, onSuccess } = setup();
    await user.click(screen.getByRole("button", { name: /Cancelar devolución/i, ...H }));
    expect(onSuccess).toHaveBeenCalledWith(baseDetail);
    expect(onClose).toHaveBeenCalled();
  });

  it("pasa el reason al servicio cancel", async () => {
    const user = userEvent.setup();
    const cancelFn = jest.fn().mockResolvedValue(baseDetail);
    setup({ cancelFn });
    await user.type(screen.getByRole("textbox", H), "Error de inventario");
    await user.click(screen.getByRole("button", { name: /Cancelar devolución/i, ...H }));
    expect(cancelFn).toHaveBeenCalledWith("r1", "Error de inventario");
  });
});

describe("CancelReturnModal — errores", () => {
  beforeEach(() => jest.clearAllMocks());

  it("409 ReturnAlreadyCancelledError → cierra y muestra toast", async () => {
    const user = userEvent.setup();
    const cancelFn = jest.fn().mockRejectedValue(new ReturnAlreadyCancelledError());
    const { onClose } = setup({ cancelFn });
    await user.click(screen.getByRole("button", { name: /Cancelar devolución/i, ...H }));
    expect(onClose).toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(/ya estaba cancelada/i);
  });

  it("403 ReturnCancelForbiddenError → cierra y muestra toast de permiso", async () => {
    const user = userEvent.setup();
    const cancelFn = jest.fn().mockRejectedValue(new ReturnCancelForbiddenError());
    const { onClose } = setup({ cancelFn });
    await user.click(screen.getByRole("button", { name: /Cancelar devolución/i, ...H }));
    expect(onClose).toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(/No tienes permiso/i);
  });
});

describe("CancelReturnModal — botón Volver", () => {
  beforeEach(() => jest.clearAllMocks());

  it("click en Volver llama onClose", async () => {
    const user = userEvent.setup();
    const { onClose } = setup();
    await user.click(screen.getByRole("button", { name: /Volver/i, ...H }));
    expect(onClose).toHaveBeenCalled();
  });
});
