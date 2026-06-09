/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { QuoteStatusBadge } from "../../../../../../app/(private)/quotes/_blocks/QuoteStatusBadge";

describe("QuoteStatusBadge", () => {
  it('muestra "Borrador" para status=draft', () => {
    render(<QuoteStatusBadge status="draft" isExpired={false} />);
    expect(screen.getByText("Borrador")).toBeInTheDocument();
  });

  it('muestra "Autorizada" para status=authorized sin expirar', () => {
    render(<QuoteStatusBadge status="authorized" isExpired={false} />);
    expect(screen.getByText("Autorizada")).toBeInTheDocument();
  });

  it('muestra "Vencida" para status=authorized con isExpired=true', () => {
    render(<QuoteStatusBadge status="authorized" isExpired={true} />);
    expect(screen.getByText("Vencida")).toBeInTheDocument();
    expect(screen.queryByText("Autorizada")).not.toBeInTheDocument();
  });

  it('muestra "Convertida" para status=converted', () => {
    render(<QuoteStatusBadge status="converted" isExpired={false} />);
    expect(screen.getByText("Convertida")).toBeInTheDocument();
  });

  it('muestra "Cancelada" para status=cancelled', () => {
    render(<QuoteStatusBadge status="cancelled" isExpired={false} />);
    expect(screen.getByText("Cancelada")).toBeInTheDocument();
  });

  it("draft+isExpired=true NO muestra Vencida (solo authorized puede expirar)", () => {
    render(<QuoteStatusBadge status="draft" isExpired={true} />);
    expect(screen.getByText("Borrador")).toBeInTheDocument();
    expect(screen.queryByText("Vencida")).not.toBeInTheDocument();
  });

  it("converted+isExpired=true NO muestra Vencida", () => {
    render(<QuoteStatusBadge status="converted" isExpired={true} />);
    expect(screen.getByText("Convertida")).toBeInTheDocument();
    expect(screen.queryByText("Vencida")).not.toBeInTheDocument();
  });

  it("badge Vencida tiene clase bg-error-container", () => {
    const { container } = render(<QuoteStatusBadge status="authorized" isExpired={true} />);
    expect(container.firstChild).toHaveClass("bg-error-container");
  });
});
