"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useCurrentUser } from "../../../../../../_hooks/useCurrentUser";
import { useSaleDetail } from "../../../../_logic/hooks/useSaleDetail";
import { useCreateSaleWaybillForm } from "../../../../../waybills/_logic/hooks/useCreateSaleWaybillForm";
import { WaybillItemsForm } from "../../../../../waybills/_blocks/WaybillItemsForm";
import { VehicleDriverForm } from "../../../../../waybills/_blocks/VehicleDriverForm";
import { ScheduleFields } from "../../../../../waybills/_blocks/ScheduleFields";
import { EmptyState } from "../../../../../../_components/molecules/EmptyState/EmptyState";
import { Spinner } from "../../../../../../_components/atoms/Spinner/Spinner";
import { Icon } from "../../../../../../_components/atoms/Icon/Icon";
import { Button } from "../../../../../../_components/atoms/Button/Button";
import {
  CustomerAddressIncompleteError,
  FacturamaStampError,
  SaleHasNoCustomerError,
  SaleNotCompletedError,
  WaybillStampForbiddenError,
} from "../../../../../waybills/_logic/errors";

interface CreateSaleWaybillPageProps {
  saleId: string;
}

export function CreateSaleWaybillPage({ saleId }: CreateSaleWaybillPageProps) {
  const { can } = useCurrentUser();
  const canWrite = can("waybills:write");
  const canStamp = can("waybills:stamp");

  const { sale, isLoading, error: loadError } = useSaleDetail(saleId);

  return (
    <CreateSaleWaybillContent
      saleId={saleId}
      canWrite={canWrite}
      canStamp={canStamp}
      isLoading={isLoading}
      loadError={loadError}
      sale={sale}
    />
  );
}

function CreateSaleWaybillContent({
  saleId,
  canWrite,
  canStamp,
  isLoading,
  loadError,
  sale,
}: {
  saleId: string;
  canWrite: boolean | "loading";
  canStamp: boolean | "loading";
  isLoading: boolean;
  loadError: Error | null;
  sale: ReturnType<typeof useSaleDetail>["sale"];
}) {
  if (isLoading || canWrite === "loading") {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (loadError || !sale) {
    return (
      <EmptyState
        icon="warning"
        title="Venta no encontrada"
        description={loadError?.message ?? "No se encontró la venta."}
        action={<Link href={`/sales/${saleId}`} className="text-primary hover:underline text-body-sm">Volver al ticket</Link>}
      />
    );
  }

  if (canWrite === false || canStamp === false) {
    return (
      <EmptyState
        icon="block"
        title="Sin acceso"
        description="No tienes permiso para generar Carta Porte."
        action={<Link href={`/sales/${saleId}`} className="text-primary hover:underline text-body-sm">Volver al ticket</Link>}
      />
    );
  }

  if (sale.status !== "completed") {
    return (
      <EmptyState
        icon="local_shipping"
        title="Esta venta no admite Carta Porte"
        description={`Solo se puede generar Carta Porte de ventas completadas. Estado actual: ${sale.status}.`}
        action={<Link href={`/sales/${saleId}`} className="text-primary hover:underline text-body-sm">Volver al ticket</Link>}
      />
    );
  }

  if (!sale.customerId) {
    return (
      <EmptyState
        icon="local_shipping"
        title="Esta venta no tiene cliente"
        description="La Carta Porte documenta la entrega al cliente de la venta; asigna un cliente antes de generarla."
        action={<Link href={`/sales/${saleId}`} className="text-primary hover:underline text-body-sm">Volver al ticket</Link>}
      />
    );
  }

  return <CreateSaleWaybillForm saleId={saleId} sale={sale} />;
}

function CreateSaleWaybillForm({
  saleId,
  sale,
}: {
  saleId: string;
  sale: NonNullable<ReturnType<typeof useSaleDetail>["sale"]>;
}) {
  const {
    vehicle,
    setVehicleField,
    driver,
    setDriverField,
    distanceKm,
    setDistanceKm,
    departureAt,
    setDepartureAt,
    arrivalAt,
    setArrivalAt,
    lines,
    updateLine,
    isSubmitting,
    error,
    clearError,
    submit,
  } = useCreateSaleWaybillForm(sale);

  const folioLabel = sale.folioPrefix ? `${sale.folioPrefix}-${sale.folioNumber}` : String(sale.folioNumber);

  function renderError() {
    if (!error) return null;

    let content: ReactNode;
    if (error instanceof CustomerAddressIncompleteError) {
      content = (
        <span>
          El domicilio del cliente está incompleto (faltan: {error.missingFields.join(", ")}).{" "}
          <Link href="/catalogs/customers" className="underline font-medium">
            Completar en Catálogos → Clientes
          </Link>
        </span>
      );
    } else if (error instanceof SaleNotCompletedError || error instanceof SaleHasNoCustomerError) {
      content = (
        <span>
          {error.message}.{" "}
          <Link href={`/sales/${saleId}`} className="underline font-medium">
            Volver al ticket
          </Link>
        </span>
      );
    } else if (error instanceof WaybillStampForbiddenError) {
      content = error.message;
    } else if (error instanceof FacturamaStampError) {
      content = `Facturama rechazó el timbrado: ${error.detail}`;
    } else {
      content = error.message;
    }

    return (
      <div className="rounded bg-error-container/30 border border-error/30 px-4 py-3 text-body-sm text-error flex items-start justify-between gap-2">
        <span>{content}</span>
        <Button variant="text" size="sm" onClick={clearError} className="flex-shrink-0 px-1.5 py-0.5 text-error">
          ×
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/sales/${saleId}`} className="text-on-surface-variant hover:text-on-surface">
          <Icon name="arrow_back" size={20} />
        </Link>
        <div>
          <h1 className="text-headline-sm font-semibold text-on-surface">
            Generar Carta Porte — Folio {folioLabel}
          </h1>
          <p className="text-body-md text-on-surface-variant">
            Origen: {sale.branchName ?? sale.branchId} · Destino: {sale.customerName ?? sale.customerId}
          </p>
        </div>
      </div>

      <div className="bg-surface-container-low rounded-lg border border-outline-variant p-6 space-y-6">
        <WaybillItemsForm
          type="carta_porte"
          lines={lines}
          addLine={() => {}}
          updateLine={updateLine}
          removeLine={() => {}}
          lockProductAndQuantity
        />

        <VehicleDriverForm
          vehicle={vehicle}
          onVehicleChange={setVehicleField}
          driver={driver}
          onDriverChange={setDriverField}
        />

        <ScheduleFields
          departureAt={departureAt}
          onDepartureAtChange={setDepartureAt}
          arrivalAt={arrivalAt}
          onArrivalAtChange={setArrivalAt}
          distanceKm={distanceKm}
          onDistanceKmChange={setDistanceKm}
        />

        {renderError()}

        <div className="border-t border-outline-variant pt-4 flex justify-end">
          <Button variant="tonal" size="lg" onClick={() => submit()} loading={isSubmitting}>
            {isSubmitting ? "Timbrando…" : "Timbrar Carta Porte"}
          </Button>
        </div>
      </div>
    </div>
  );
}
