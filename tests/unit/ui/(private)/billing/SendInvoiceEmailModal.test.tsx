/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("../../../../../app/(private)/billing/_logic/hooks/useInvoiceMutations");

import { useInvoiceMutations } from "../../../../../app/(private)/billing/_logic/hooks/useInvoiceMutations";
import { SendInvoiceEmailModal } from "../../../../../app/(private)/billing/_blocks/SendInvoiceEmailModal";
import { InvoiceNoEmailError, InvoiceEmailSendFailedError } from "../../../../../app/(private)/billing/_logic/errors";

const mockUseInvoiceMutations = useInvoiceMutations as jest.MockedFunction<typeof useInvoiceMutations>;

HTMLDialogElement.prototype.showModal = jest.fn(function (this: HTMLDialogElement) {
  this.setAttribute("open", "");
});
HTMLDialogElement.prototype.close = jest.fn(function (this: HTMLDialogElement) {
  this.removeAttribute("open");
});

function setup(sendEmail: jest.Mock) {
  mockUseInvoiceMutations.mockReturnValue({
    isSaving: false,
    isDownloading: false,
    isSendingEmail: false,
    mutationError: null,
    clearError: jest.fn(),
    cancel: jest.fn(),
    download: jest.fn(),
    sendEmail,
  });
}

describe("SendInvoiceEmailModal", () => {
  beforeEach(() => jest.clearAllMocks());

  it("sends with no override email and shows success", async () => {
    const sendEmail = jest.fn().mockResolvedValue({ sentTo: "cliente@ejemplo.com" });
    setup(sendEmail);
    render(<SendInvoiceEmailModal invoiceId="inv-1" open={true} onClose={jest.fn()} />);

    await userEvent.setup().click(screen.getByRole("button", { name: /enviar/i }));

    expect(sendEmail).toHaveBeenCalledWith("inv-1", undefined);
    await waitFor(() => expect(screen.getByText(/correo enviado a cliente@ejemplo.com/i)).toBeInTheDocument());
  });

  it("sends with a typed override email", async () => {
    const sendEmail = jest.fn().mockResolvedValue({ sentTo: "otra@direccion.com" });
    setup(sendEmail);
    render(<SendInvoiceEmailModal invoiceId="inv-1" open={true} onClose={jest.fn()} />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/correo \(opcional/i), "otra@direccion.com");
    await user.click(screen.getByRole("button", { name: /enviar/i }));

    expect(sendEmail).toHaveBeenCalledWith("inv-1", "otra@direccion.com");
  });

  it("shows an inline message asking for a manual email when InvoiceNoEmailError is thrown", async () => {
    const sendEmail = jest.fn().mockRejectedValue(new InvoiceNoEmailError());
    setup(sendEmail);
    const onClose = jest.fn();
    render(<SendInvoiceEmailModal invoiceId="inv-1" open={true} onClose={onClose} />);

    await userEvent.setup().click(screen.getByRole("button", { name: /enviar/i }));

    await waitFor(() =>
      expect(screen.getByText(/no tiene correo registrado/i)).toBeInTheDocument()
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows a generic error message when the send fails", async () => {
    const sendEmail = jest.fn().mockRejectedValue(new InvoiceEmailSendFailedError());
    setup(sendEmail);
    render(<SendInvoiceEmailModal invoiceId="inv-1" open={true} onClose={jest.fn()} />);

    await userEvent.setup().click(screen.getByRole("button", { name: /enviar/i }));

    await waitFor(() =>
      expect(screen.getByText(/no se pudo enviar el correo/i)).toBeInTheDocument()
    );
  });

  it("calls onClose when clicking Cerrar", async () => {
    const onClose = jest.fn();
    setup(jest.fn());
    render(<SendInvoiceEmailModal invoiceId="inv-1" open={true} onClose={onClose} />);

    await userEvent.setup().click(screen.getByRole("button", { name: /cerrar/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
