import React from "react";
import { render, screen } from "@testing-library/react";
import { CreateReturnFooter } from "../../../../app/(private)/sales/[id]/returns/new/_blocks/CreateReturnFooter";

const baseProps = {
  reason: "",
  onReasonChange: jest.fn(),
  returnedAt: "2026-06-21",
  onReturnedAtChange: jest.fn(),
  notes: "",
  onNotesChange: jest.fn(),
  validationError: null,
  isSubmitting: false,
  onSubmit: jest.fn(),
};

// CreateReturnFooter is stateless: it receives refund totals as props and renders them.
// End-to-end reactive behavior (quantities → recompute → update) is covered by the
// integration test at: tests/unit/ui/(private)/sales/[id]/returns/new/_blocks/CreateReturnPage.realtimeTotals.test.tsx
describe("CreateReturnFooter", () => {
  it("muestra subtotal, impuestos y total de reembolso", () => {
    render(
      <CreateReturnFooter
        {...baseProps}
        refundSubtotal={300}
        refundTax={48}
        refundTotal={348}
      />
    );
    expect(screen.getByText("Subtotal reembolso")).toBeInTheDocument();
    expect(screen.getByText("Total reembolso")).toBeInTheDocument();
  });

  it("deshabilita botón cuando validationError está presente", () => {
    render(
      <CreateReturnFooter
        {...baseProps}
        validationError="Selecciona al menos un producto"
        refundSubtotal={0}
        refundTax={0}
        refundTotal={0}
      />
    );
    expect(screen.getByRole("button", { name: "Registrar devolución" })).toBeDisabled();
  });

  it("botón habilitado cuando no hay validationError", () => {
    render(
      <CreateReturnFooter
        {...baseProps}
        refundSubtotal={100}
        refundTax={16}
        refundTotal={116}
      />
    );
    expect(screen.getByRole("button", { name: "Registrar devolución" })).toBeEnabled();
  });

  it("muestra reasonError inline bajo el textarea de motivo", () => {
    render(
      <CreateReturnFooter
        {...baseProps}
        reasonError="El motivo es obligatorio (mín. 3 caracteres)"
        refundSubtotal={0}
        refundTax={0}
        refundTotal={0}
      />
    );
    expect(screen.getByText("El motivo es obligatorio (mín. 3 caracteres)")).toBeInTheDocument();
  });

  it("refleja nuevos totales al re-renderizar con props distintas", () => {
    const { rerender } = render(
      <CreateReturnFooter
        {...baseProps}
        refundSubtotal={0}
        refundTax={0}
        refundTotal={0}
      />
    );

    rerender(
      <CreateReturnFooter
        {...baseProps}
        refundSubtotal={300}
        refundTax={48}
        refundTotal={348}
      />
    );

    const subtotalLabel = screen.getByText("Subtotal reembolso");
    expect(subtotalLabel.nextElementSibling?.textContent).toMatch(/300/);
    const taxLabel = screen.getByText("Impuestos");
    expect(taxLabel.nextElementSibling?.textContent).toMatch(/48/);
    const totalLabel = screen.getByText("Total reembolso");
    expect(totalLabel.nextElementSibling?.textContent).toMatch(/348/);
  });
});
