import { authFetch, ForbiddenError, NetworkError } from "../../../../_lib/authFetch";

export interface InvoicePreviewSaleItemSource {
  productNameSnapshot: string;
  productCodeSnapshot: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  ivaRate: number;
  iepsRate: number;
}

export interface InvoicePreviewSaleSource {
  branchName: string | null;
  customerId: string | null;
  items: InvoicePreviewSaleItemSource[];
}

export interface InvoicePreviewCustomerSource {
  rfc: string;
  name: string;
  cfdiUse: string | null;
  taxRegime: string | null;
  taxZipCode: string | null;
}

export interface InvoicePreviewSource {
  sale: InvoicePreviewSaleSource;
  customer: InvoicePreviewCustomerSource;
}

interface SaleDetailApiItemShape {
  productNameSnapshot: string;
  productCodeSnapshot: string;
  quantity: number;
  unitPrice: number;
  discountPct: number | null;
  ivaRate: number | null;
  iepsRate: number | null;
}

interface SaleDetailApiShape {
  branchName?: string | null;
  customerId?: string | null;
  items: SaleDetailApiItemShape[];
}

interface CustomerApiShape {
  rfc: string | null;
  name: string;
  cfdiUse: string | null;
  taxRegime: string | null;
  taxZipCode: string | null;
}

export async function getInvoicePreviewSource(
  saleId: string,
  fetchImpl = authFetch,
): Promise<InvoicePreviewSource> {
  let saleRes: Response;
  try {
    saleRes = await fetchImpl(`/api/v1/admin/sales/${saleId}`);
  } catch (err) {
    if (err instanceof ForbiddenError) throw new Error("No tienes permiso para ver los datos de la venta");
    throw new NetworkError();
  }
  if (saleRes.status === 404) throw new Error("Venta no encontrada");
  if (!saleRes.ok) throw new NetworkError();

  const saleDto = await saleRes.json() as SaleDetailApiShape;
  const sale: InvoicePreviewSaleSource = {
    branchName: saleDto.branchName ?? null,
    customerId: saleDto.customerId ?? null,
    items: saleDto.items.map((item) => ({
      productNameSnapshot: item.productNameSnapshot,
      productCodeSnapshot: item.productCodeSnapshot,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPct: item.discountPct ?? 0,
      ivaRate: item.ivaRate ?? 0,
      iepsRate: item.iepsRate ?? 0,
    })),
  };

  if (!sale.customerId) {
    throw new Error("Esta venta no tiene cliente asociado, no se puede facturar");
  }

  let customerRes: Response;
  try {
    customerRes = await fetchImpl(`/api/v1/admin/customers/${sale.customerId}`);
  } catch (err) {
    if (err instanceof ForbiddenError) throw new Error("No tienes permiso para ver los datos fiscales del cliente");
    throw new NetworkError();
  }
  if (customerRes.status === 404) throw new Error("Cliente de la venta no encontrado");
  if (!customerRes.ok) throw new NetworkError();

  const customerDto = await customerRes.json() as CustomerApiShape;

  return {
    sale,
    customer: {
      rfc: customerDto.rfc ?? "",
      name: customerDto.name,
      cfdiUse: customerDto.cfdiUse,
      taxRegime: customerDto.taxRegime,
      taxZipCode: customerDto.taxZipCode,
    },
  };
}
