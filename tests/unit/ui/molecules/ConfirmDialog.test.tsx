import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfirmDialog } from "../../../../app/_components/molecules/ConfirmDialog/ConfirmDialog";

HTMLDialogElement.prototype.showModal = jest.fn();
HTMLDialogElement.prototype.close = jest.fn();

describe("ConfirmDialog", () => {
  it("calls showModal when open is true", () => {
    render(
      <ConfirmDialog open title="¿Confirmar?" description="Esta acción es irreversible" onConfirm={jest.fn()} onCancel={jest.fn()} />
    );
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
  });

  it("calls onCancel when cancel button is clicked", () => {
    const onCancel = jest.fn();
    render(
      <ConfirmDialog open title="¿Confirmar?" description="Desc" onConfirm={jest.fn()} onCancel={onCancel} cancelLabel="Cancelar" />
    );
    fireEvent.click(screen.getByText("Cancelar"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("calls onConfirm when confirm button is clicked", () => {
    const onConfirm = jest.fn();
    render(
      <ConfirmDialog open title="¿Confirmar?" description="Desc" onConfirm={onConfirm} onCancel={jest.fn()} confirmLabel="Confirmar" />
    );
    fireEvent.click(screen.getByText("Confirmar"));
    expect(onConfirm).toHaveBeenCalled();
  });
});
