/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("../../../../../../../../app/(private)/sales/_logic/hooks/useSaleTicketEmail");

import { useSaleTicketEmail } from "../../../../../../../../app/(private)/sales/_logic/hooks/useSaleTicketEmail";
import { SendTicketEmailModal } from "../../../../../../../../app/(private)/sales/[id]/ticket/_blocks/SendTicketEmailModal";
import { SaleNoEmailError, SaleEmailSendFailedError } from "../../../../../../../../app/(private)/sales/_logic/errors";

const mockUseSaleTicketEmail = useSaleTicketEmail as jest.MockedFunction<typeof useSaleTicketEmail>;

HTMLDialogElement.prototype.showModal = jest.fn(function (this: HTMLDialogElement) {
  this.setAttribute("open", "");
});
HTMLDialogElement.prototype.close = jest.fn(function (this: HTMLDialogElement) {
  this.removeAttribute("open");
});

function setup(sendEmail: jest.Mock) {
  mockUseSaleTicketEmail.mockReturnValue({
    isSendingEmail: false,
    sendEmail,
  });
}

describe("SendTicketEmailModal", () => {
  beforeEach(() => jest.clearAllMocks());

  it("sends with no override email and shows success", async () => {
    const sendEmail = jest.fn().mockResolvedValue({ sentTo: "cliente@ejemplo.com" });
    setup(sendEmail);
    render(<SendTicketEmailModal saleId="sale-1" open={true} onClose={jest.fn()} />);

    await userEvent.setup().click(screen.getByRole("button", { name: /enviar/i }));

    expect(sendEmail).toHaveBeenCalledWith("sale-1", undefined);
    await waitFor(() => expect(screen.getByText(/correo enviado a cliente@ejemplo.com/i)).toBeInTheDocument());
  });

  it("sends with a typed override email", async () => {
    const sendEmail = jest.fn().mockResolvedValue({ sentTo: "otra@direccion.com" });
    setup(sendEmail);
    render(<SendTicketEmailModal saleId="sale-1" open={true} onClose={jest.fn()} />);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/correo \(opcional/i), "otra@direccion.com");
    await user.click(screen.getByRole("button", { name: /enviar/i }));

    expect(sendEmail).toHaveBeenCalledWith("sale-1", "otra@direccion.com");
  });

  it("shows an inline message asking for a manual email when SaleNoEmailError is thrown", async () => {
    const sendEmail = jest.fn().mockRejectedValue(new SaleNoEmailError());
    setup(sendEmail);
    const onClose = jest.fn();
    render(<SendTicketEmailModal saleId="sale-1" open={true} onClose={onClose} />);

    await userEvent.setup().click(screen.getByRole("button", { name: /enviar/i }));

    await waitFor(() =>
      expect(screen.getByText(/no tiene correo registrado/i)).toBeInTheDocument()
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows a generic error message when the send fails", async () => {
    const sendEmail = jest.fn().mockRejectedValue(new SaleEmailSendFailedError());
    setup(sendEmail);
    render(<SendTicketEmailModal saleId="sale-1" open={true} onClose={jest.fn()} />);

    await userEvent.setup().click(screen.getByRole("button", { name: /enviar/i }));

    await waitFor(() =>
      expect(screen.getByText(/no se pudo enviar el correo/i)).toBeInTheDocument()
    );
  });

  it("calls onClose when clicking Cerrar", async () => {
    const onClose = jest.fn();
    setup(jest.fn());
    render(<SendTicketEmailModal saleId="sale-1" open={true} onClose={onClose} />);

    await userEvent.setup().click(screen.getByRole("button", { name: /cerrar/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
