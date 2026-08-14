import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("../../../../../../app/_hooks/useTaxRatesOptions", () => ({
  useTaxRatesOptions: () => ({ options: [], isLoading: false }),
}));
jest.mock("../../../../../../app/_hooks/useSatCodesSearch", () => ({
  useSatCodesSearch: jest.fn(() => ({ options: [], isLoading: false })),
}));
jest.mock("../../../../../../app/_hooks/useSatCatalogSearch", () => ({
  useSatCatalogSearch: jest.fn(() => ({
    options: [{ code: "KGM", description: "Kilogramo" }],
    isLoading: false,
  })),
}));

import { useSatCodesSearch } from "../../../../../../app/_hooks/useSatCodesSearch";

import { ProductEditModal } from "../../../../../../app/(private)/catalogs/products/_blocks/ProductEditModal";
import type { Product } from "../../../../../../app/(private)/catalogs/products/_logic/types/domain";
import type { CreateProductBody } from "../../../../../../app/(private)/catalogs/products/_logic/types/api";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = jest.fn(function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = jest.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  });
  global.URL.createObjectURL = jest.fn(() => "blob:mock-url");
  global.URL.revokeObjectURL = jest.fn();
});

beforeEach(() => jest.clearAllMocks());

const DEPT_UUID_1 = "11111111-1111-1111-1111-111111111111";
const DEPT_UUID_2 = "22222222-2222-2222-2222-222222222222";

const DEPT_OPTIONS = [
  { id: DEPT_UUID_1, name: "Agrícola" },
  { id: DEPT_UUID_2, name: "Industrial" },
];

const BASE_PRODUCT: Product = {
  id: "p1",
  code: "PROD_01",
  name: "Arroz",
  unit: "kg",
  unitDescription: null,
  satProductCode: null,
  departmentId: DEPT_UUID_1,
  departmentName: "Agrícola",
  providerId: null,
  providerName: null,
  taxRateId: null,
  taxRateCode: null,
  ivaRate: null,
  iepsRate: null,
  imageUrl: null,
  isTaxable: false,
  isActive: true,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const DEFAULT_PROPS = {
  open: true,
  isSaving: false,
  codeError: null,
  deptError: null,
  mutationError: null,
  deptOptions: DEPT_OPTIONS,
  onSave: jest.fn(),
  onClose: jest.fn(),
};

// DOM order textboxes: code[0], unit[1], name[2], satProductCode[3]
// comboboxes: departmentId[0], taxRateId[1]

describe("ProductEditModal — modo create", () => {
  it("code se convierte a mayúsculas al escribir", async () => {
    const user = userEvent.setup();
    render(<ProductEditModal {...DEFAULT_PROPS} mode="create" entity={null} />);

    const codeInput = screen.getAllByRole("textbox")[0];
    await user.type(codeInput, "prod_01");

    expect(codeInput).toHaveValue("PROD_01");
  });

  it("satProductCode inválido muestra error inline sin llamar onSave", async () => {
    const user = userEvent.setup();
    render(<ProductEditModal {...DEFAULT_PROPS} mode="create" entity={null} />);

    await user.type(screen.getAllByRole("textbox")[0], "VALID_01");
    await user.type(screen.getAllByRole("textbox")[2], "Producto");
    await user.type(screen.getAllByRole("textbox")[1], "kg");

    // Cód. SAT es ahora el SatCodeCombobox (textbox index 3)
    const satInput = screen.getAllByRole("textbox")[3];
    await user.type(satInput, "123");

    const select = screen.getAllByRole("combobox")[0];
    await user.selectOptions(select, DEPT_UUID_1);

    await user.click(screen.getByRole("button", { name: /crear/i }));

    expect(screen.getByText(/código sat inválido/i)).toBeInTheDocument();
    expect(DEFAULT_PROPS.onSave).not.toHaveBeenCalled();
  });

  it("código inválido muestra error inline", async () => {
    const user = userEvent.setup();
    render(<ProductEditModal {...DEFAULT_PROPS} mode="create" entity={null} />);

    await user.type(screen.getAllByRole("textbox")[0], "invalid-code!");
    await user.type(screen.getAllByRole("textbox")[2], "Producto");
    await user.type(screen.getAllByRole("textbox")[1], "kg");

    const select = screen.getAllByRole("combobox")[0];
    await user.selectOptions(select, DEPT_UUID_1);

    await user.click(screen.getByRole("button", { name: /crear/i }));

    expect(screen.getByText(/mayúsculas/i)).toBeInTheDocument();
    expect(DEFAULT_PROPS.onSave).not.toHaveBeenCalled();
  });

  it("code deshabilitado en modo edit", () => {
    render(<ProductEditModal {...DEFAULT_PROPS} mode="edit" entity={BASE_PRODUCT} />);
    expect(screen.getAllByRole("textbox")[0]).toBeDisabled();
  });

  it("pre-rellena campos en modo edit", () => {
    render(<ProductEditModal {...DEFAULT_PROPS} mode="edit" entity={BASE_PRODUCT} />);
    expect(screen.getAllByRole("textbox")[2]).toHaveValue("Arroz");
    expect(screen.getAllByRole("textbox")[1]).toHaveValue("kg");
  });
});

describe("ProductEditModal — modo edit — botón guardar deshabilitado sin diff", () => {
  it("botón Guardar deshabilitado cuando no hay cambios", () => {
    render(<ProductEditModal {...DEFAULT_PROPS} mode="edit" entity={BASE_PRODUCT} />);
    expect(screen.getByRole("button", { name: /guardar/i })).toBeDisabled();
  });

  it("botón Guardar habilitado después de modificar un campo", async () => {
    const user = userEvent.setup();
    render(<ProductEditModal {...DEFAULT_PROPS} mode="edit" entity={BASE_PRODUCT} />);

    const nameInput = screen.getAllByRole("textbox")[2];
    await user.clear(nameInput);
    await user.type(nameInput, "Arroz Integral");

    expect(screen.getByRole("button", { name: /guardar/i })).not.toBeDisabled();
  });
});

describe("ProductEditModal — errores de servidor", () => {
  it("muestra codeError bajo el campo código", () => {
    render(
      <ProductEditModal
        {...DEFAULT_PROPS}
        mode="create"
        entity={null}
        codeError="Este código ya está en uso."
      />
    );
    expect(screen.getByText("Este código ya está en uso.")).toBeInTheDocument();
  });

  it("muestra deptError bajo el selector de departamento", () => {
    render(
      <ProductEditModal
        {...DEFAULT_PROPS}
        mode="create"
        entity={null}
        deptError="El departamento no existe o está inactivo."
      />
    );
    expect(screen.getByText("El departamento no existe o está inactivo.")).toBeInTheDocument();
  });

  it("muestra mutationError general", () => {
    render(
      <ProductEditModal
        {...DEFAULT_PROPS}
        mode="create"
        entity={null}
        mutationError="Error inesperado del servidor."
      />
    );
    expect(screen.getByText("Error inesperado del servidor.")).toBeInTheDocument();
  });
});

describe("ProductEditModal — create mode deferred upload (task 8.3)", () => {
  it("muestra imageUploadWarning y botón Cerrar cuando prop está definida", () => {
    render(
      <ProductEditModal
        {...DEFAULT_PROPS}
        mode="create"
        entity={null}
        imageUploadWarning="Producto creado pero la imagen no pudo subirse."
      />
    );
    expect(screen.getByText("Producto creado pero la imagen no pudo subirse.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cerrar/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /crear/i })).not.toBeInTheDocument();
  });

  it("no muestra warning cuando imageUploadWarning es null", () => {
    render(<ProductEditModal {...DEFAULT_PROPS} mode="create" entity={null} imageUploadWarning={null} />);
    expect(screen.queryByRole("button", { name: /cerrar/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /crear/i })).toBeInTheDocument();
  });

  it("muestra error inline al seleccionar MIME inválido", () => {
    render(<ProductEditModal {...DEFAULT_PROPS} mode="create" entity={null} />);
    const fileInput = document.querySelector("input[type='file']") as HTMLInputElement;
    const invalidFile = new File(["data"], "doc.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });
    expect(screen.getByText(/formato no permitido/i)).toBeInTheDocument();
    expect(DEFAULT_PROPS.onSave).not.toHaveBeenCalled();
  });

  it("muestra error inline cuando el archivo supera 2 MB", () => {
    render(<ProductEditModal {...DEFAULT_PROPS} mode="create" entity={null} />);
    const fileInput = document.querySelector("input[type='file']") as HTMLInputElement;
    const bigFile = new File([new ArrayBuffer(3 * 1024 * 1024)], "big.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [bigFile] } });
    expect(screen.getByText(/excede 2 MB/i)).toBeInTheDocument();
  });

  it("llama onSave con el archivo staged al crear", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    render(
      <ProductEditModal
        {...DEFAULT_PROPS}
        onSave={onSave}
        mode="create"
        entity={null}
      />
    );
    await user.type(screen.getAllByRole("textbox")[0], "PROD_IMG");
    await user.type(screen.getAllByRole("textbox")[2], "Producto con Imagen");
    await user.type(screen.getAllByRole("textbox")[1], "KGM");
    await user.click(screen.getByRole("button", { name: /Kilogramo/ }));
    await user.selectOptions(screen.getAllByRole("combobox")[0], DEPT_UUID_1);

    const fileInput = document.querySelector("input[type='file']") as HTMLInputElement;
    const validFile = new File(["img"], "photo.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    await user.click(screen.getByRole("button", { name: /crear/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const [, stagedImage] = onSave.mock.calls[0] as [unknown, File | null | undefined];
    expect(stagedImage).toBe(validFile);
  });
});

describe("ProductEditModal — combobox Cód. SAT (catálogo real)", () => {
  const mockSearch = useSatCodesSearch as jest.MockedFunction<typeof useSatCodesSearch>;

  it("muestra sugerencias formateadas como code — description al escribir", async () => {
    mockSearch.mockReturnValue({
      options: [{ code: "10171601", description: "Fertilizante nitrogenado" }],
      isLoading: false,
    });
    const user = userEvent.setup();
    render(<ProductEditModal {...DEFAULT_PROPS} mode="create" entity={null} />);

    const sat = screen.getAllByRole("textbox")[3];
    await user.type(sat, "fertiliz");

    expect(mockSearch).toHaveBeenCalledWith("fertiliz");
    expect(
      within(screen.getByRole("dialog")).getByRole("button", { name: /Fertilizante nitrogenado/ })
    ).toBeInTheDocument();
  });

  it("seleccionar una sugerencia completa el campo con el código elegido", async () => {
    mockSearch.mockReturnValue({
      options: [{ code: "10171601", description: "Fertilizante nitrogenado" }],
      isLoading: false,
    });
    const user = userEvent.setup();
    render(<ProductEditModal {...DEFAULT_PROPS} mode="create" entity={null} />);

    const sat = screen.getAllByRole("textbox")[3];
    await user.type(sat, "10171");
    await user.click(screen.getByRole("button", { name: /Fertilizante nitrogenado/ }));

    expect(sat).toHaveValue("10171601");
  });

  it("modo edit pre-filla el código SAT guardado", () => {
    render(
      <ProductEditModal
        {...DEFAULT_PROPS}
        mode="edit"
        entity={{ ...BASE_PRODUCT, satProductCode: "01010101" }}
      />
    );
    expect(screen.getAllByRole("textbox")[3]).toHaveValue("01010101");
  });

  it("captura manual de 8 dígitos válidos sigue permitida", async () => {
    const onSave = jest.fn();
    const user = userEvent.setup();
    render(<ProductEditModal {...DEFAULT_PROPS} onSave={onSave} mode="create" entity={null} />);

    await user.type(screen.getAllByRole("textbox")[0], "VALID_01");
    await user.type(screen.getAllByRole("textbox")[2], "Producto");
    await user.type(screen.getAllByRole("textbox")[1], "KGM");
    await user.click(screen.getByRole("button", { name: /Kilogramo/ }));
    await user.type(screen.getAllByRole("textbox")[3], "99999999");
    await user.selectOptions(screen.getAllByRole("combobox")[0], DEPT_UUID_1);

    await user.click(screen.getByRole("button", { name: /crear/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const [data] = onSave.mock.calls[0] as [CreateProductBody];
    expect(data.satProductCode).toBe("99999999");
  });

  it("limpiar el campo SAT en edit envía satProductCode null en el diff", async () => {
    const onSave = jest.fn();
    const user = userEvent.setup();
    render(
      <ProductEditModal
        {...DEFAULT_PROPS}
        onSave={onSave}
        mode="edit"
        entity={{ ...BASE_PRODUCT, satProductCode: "01010101" }}
      />
    );

    const sat = screen.getAllByRole("textbox")[3];
    expect(sat).toHaveValue("01010101");
    await user.clear(sat);

    const saveBtn = screen.getByRole("button", { name: /guardar/i });
    expect(saveBtn).not.toBeDisabled();
    await user.click(saveBtn);

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toEqual({ satProductCode: null });
  });
});
