import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProvidersTable } from "../../../../../../app/(private)/catalogs/providers/_blocks/ProvidersTable";
import type { Provider } from "../../../../../../app/(private)/catalogs/providers/_logic/types/domain";

const baseProvider: Provider = {
  id: "p1",
  code: "PROV_001",
  name: "Semillas ACME",
  rfc: "SAC120101A12",
  legalName: "Semillas ACME S.A. de C.V.",
  taxRegime: "601",
  cfdiUse: "G03",
  taxZipCode: "06600",
  email: "contacto@acme.com",
  phone: "5555-1234",
  address: null,
  contactName: "Juan Pérez",
  notes: null,
  isActive: true,
  createdAt: new Date("2026-05-25"),
  updatedAt: new Date("2026-05-25"),
};

const inactiveProvider: Provider = {
  ...baseProvider,
  id: "p2",
  code: "PROV_002",
  name: "Insumos Beta",
  legalName: null,
  rfc: "INB200101A23",
  taxRegime: null,
  email: null,
  phone: null,
  contactName: null,
  isActive: false,
};

describe("ProvidersTable", () => {
  it("renders rows with code, name, rfc, taxRegime", () => {
    render(
      <ProvidersTable
        items={[baseProvider]}
        canWrite={false}
        onEdit={jest.fn()}
        onSoftDelete={jest.fn()}
        onReactivate={jest.fn()}
      />,
    );
    expect(screen.getByText("PROV_001")).toBeInTheDocument();
    expect(screen.getByText("Semillas ACME")).toBeInTheDocument();
    expect(screen.getByText("SAC120101A12")).toBeInTheDocument();
    expect(screen.getByText("601")).toBeInTheDocument();
  });

  it("renders legalName as subtitle when present", () => {
    render(
      <ProvidersTable
        items={[baseProvider]}
        canWrite={false}
        onEdit={jest.fn()}
        onSoftDelete={jest.fn()}
        onReactivate={jest.fn()}
      />,
    );
    expect(screen.getByText("Semillas ACME S.A. de C.V.")).toBeInTheDocument();
  });

  it("omits legalName subtitle when null", () => {
    render(
      <ProvidersTable
        items={[inactiveProvider]}
        canWrite={false}
        onEdit={jest.fn()}
        onSoftDelete={jest.fn()}
        onReactivate={jest.fn()}
      />,
    );
    expect(screen.queryByText(/S\.A\. de C\.V\./)).not.toBeInTheDocument();
  });

  it("shows em-dash in Régimen when taxRegime is null", () => {
    render(
      <ProvidersTable
        items={[inactiveProvider]}
        canWrite={false}
        onEdit={jest.fn()}
        onSoftDelete={jest.fn()}
        onReactivate={jest.fn()}
      />,
    );
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("shows email as the contact summary when email present", () => {
    render(
      <ProvidersTable
        items={[baseProvider]}
        canWrite={false}
        onEdit={jest.fn()}
        onSoftDelete={jest.fn()}
        onReactivate={jest.fn()}
      />,
    );
    expect(screen.getByText("contacto@acme.com")).toBeInTheDocument();
  });

  it("does NOT render Acciones column when canWrite is false", () => {
    render(
      <ProvidersTable
        items={[baseProvider]}
        canWrite={false}
        onEdit={jest.fn()}
        onSoftDelete={jest.fn()}
        onReactivate={jest.fn()}
      />,
    );
    expect(screen.queryByText("Acciones")).not.toBeInTheDocument();
  });

  it("renders Acciones column when canWrite is true", () => {
    render(
      <ProvidersTable
        items={[baseProvider]}
        canWrite={true}
        onEdit={jest.fn()}
        onSoftDelete={jest.fn()}
        onReactivate={jest.fn()}
      />,
    );
    expect(screen.getByText("Acciones")).toBeInTheDocument();
  });

  it("renders Activo badge for active provider", () => {
    render(
      <ProvidersTable
        items={[baseProvider]}
        canWrite={false}
        onEdit={jest.fn()}
        onSoftDelete={jest.fn()}
        onReactivate={jest.fn()}
      />,
    );
    expect(screen.getByText("Activo")).toBeInTheDocument();
  });

  it("renders Inactivo badge for inactive provider", () => {
    render(
      <ProvidersTable
        items={[inactiveProvider]}
        canWrite={false}
        onEdit={jest.fn()}
        onSoftDelete={jest.fn()}
        onReactivate={jest.fn()}
      />,
    );
    expect(screen.getByText("Inactivo")).toBeInTheDocument();
  });

  it("shows Eliminar action on active row when canWrite", async () => {
    const onSoftDelete = jest.fn();
    render(
      <ProvidersTable
        items={[baseProvider]}
        canWrite={true}
        onEdit={jest.fn()}
        onSoftDelete={onSoftDelete}
        onReactivate={jest.fn()}
      />,
    );
    await userEvent.setup().click(screen.getByTitle("Desactivar"));
    expect(onSoftDelete).toHaveBeenCalledWith("p1");
  });

  it("shows Reactivar action on inactive row when canWrite", async () => {
    const onReactivate = jest.fn();
    render(
      <ProvidersTable
        items={[inactiveProvider]}
        canWrite={true}
        onEdit={jest.fn()}
        onSoftDelete={jest.fn()}
        onReactivate={onReactivate}
      />,
    );
    await userEvent.setup().click(screen.getByTitle("Reactivar"));
    expect(onReactivate).toHaveBeenCalledWith("p2");
  });
});
