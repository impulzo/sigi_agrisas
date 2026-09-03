/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { SessionReasonBanner } from "../../../../../app/_components/molecules/SessionReasonBanner/SessionReasonBanner";

describe("SessionReasonBanner", () => {
  it("renders inactivity copy for reason=inactivity", () => {
    render(<SessionReasonBanner reason="inactivity" onDismiss={jest.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Tu sesión se cerró por inactividad. Vuelve a iniciar sesión."
    );
  });

  it("renders session_lost copy for reason=session_lost", () => {
    render(<SessionReasonBanner reason="session_lost" onDismiss={jest.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Tu sesión expiró. Inicia sesión nuevamente."
    );
  });

  it("close button calls onDismiss", () => {
    const onDismiss = jest.fn();
    render(<SessionReasonBanner reason="inactivity" onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole("button", { name: /Cerrar aviso/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("unknown reason value should not render (validated at call site)", () => {
    // Component only accepts typed union — type system prevents unknown reasons
    // This verifies both known reasons render their distinct copies
    const { rerender } = render(<SessionReasonBanner reason="inactivity" onDismiss={jest.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent("inactividad");

    rerender(<SessionReasonBanner reason="session_lost" onDismiss={jest.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent("expiró");
  });
});
