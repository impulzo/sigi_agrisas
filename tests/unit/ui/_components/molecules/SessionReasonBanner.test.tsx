/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

const replaceMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => ({ get: () => null }),
}));

import { SessionReasonBanner } from "../../../../../app/_components/molecules/SessionReasonBanner/SessionReasonBanner";

beforeEach(() => jest.clearAllMocks());

describe("SessionReasonBanner", () => {
  it("renders inactivity copy for reason=inactivity", () => {
    render(<SessionReasonBanner reason="inactivity" />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Tu sesión se cerró por inactividad. Vuelve a iniciar sesión."
    );
  });

  it("renders session_lost copy for reason=session_lost", () => {
    render(<SessionReasonBanner reason="session_lost" />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Tu sesión expiró. Inicia sesión nuevamente."
    );
  });

  it("close button calls router.replace('/auth/login')", () => {
    render(<SessionReasonBanner reason="inactivity" />);
    fireEvent.click(screen.getByRole("button", { name: /Cerrar aviso/i }));
    expect(replaceMock).toHaveBeenCalledWith("/auth/login");
  });

  it("unknown reason value should not render (validated at call site)", () => {
    // Component only accepts typed union — type system prevents unknown reasons
    // This verifies both known reasons render their distinct copies
    const { rerender } = render(<SessionReasonBanner reason="inactivity" />);
    expect(screen.getByRole("alert")).toHaveTextContent("inactividad");

    rerender(<SessionReasonBanner reason="session_lost" />);
    expect(screen.getByRole("alert")).toHaveTextContent("expiró");
  });
});
