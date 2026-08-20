"use client";

import { Icon } from "../../../../_components/atoms/Icon/Icon";
import { Button } from "../../../../_components/atoms/Button/Button";
import { Skeleton } from "../../../../_components/atoms/Skeleton/Skeleton";
import { Table, THead, TBody, Tr, Th, Td } from "../../../../_components/molecules/DataTable";
import { CatalogStatusBadge } from "../../_blocks/CatalogStatusBadge";
import type { Vehicle } from "../_logic/types/domain";
import { useTableKeyboard } from "../../../../_hooks/useTableKeyboard";

interface VehiclesTableProps {
  items: Vehicle[];
  canWrite: boolean;
  isLoading?: boolean;
  onEdit: (item: Vehicle) => void;
  onSoftDelete: (id: string) => void;
  onReactivate: (id: string) => void;
  onEnter?: (item: Vehicle) => void;
}

export function VehiclesTable({
  items,
  canWrite,
  isLoading,
  onEdit,
  onSoftDelete,
  onReactivate,
  onEnter,
}: VehiclesTableProps) {
  const noop = () => {};
  const { getRowProps } = useTableKeyboard(items, onEnter ?? noop);

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} height={56} className="w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-outline-variant bg-surface-container-low">
      <Table>
        <THead>
          <tr>
            <Th>Código</Th>
            <Th>Placa</Th>
            <Th>Configuración</Th>
            <Th>Permiso SCT</Th>
            <Th>Aseguradora</Th>
            <Th>Estado</Th>
            {canWrite && <Th align="right">Acciones</Th>}
          </tr>
        </THead>
        <TBody>
          {items.map((item, idx) => (
            <Tr key={item.id} {...getRowProps(idx)}>
              <Td className="font-mono">{item.code}</Td>
              <Td className="font-mono">{item.plate}</Td>
              <Td className="text-on-surface-variant">{item.vehicleConfig}</Td>
              <Td className="text-on-surface-variant">
                {item.permitType} · {item.permitNumber}
              </Td>
              <Td className="text-on-surface-variant">{item.insuranceCompany}</Td>
              <Td>
                <CatalogStatusBadge isActive={item.isActive} />
              </Td>
              {canWrite && (
                <Td align="right">
                  <div className="flex items-center justify-end gap-1">
                    {item.isActive ? (
                      <>
                        <Button
                          type="button"
                          variant="text"
                          size="sm"
                          onClick={() => onEdit(item)}
                          title="Editar"
                          className="!px-2"
                        >
                          <Icon name="edit" size={18} />
                        </Button>
                        <Button
                          type="button"
                          variant="text"
                          size="sm"
                          onClick={() => onSoftDelete(item.id)}
                          title="Desactivar"
                          className="!px-2 !text-error"
                        >
                          <Icon name="delete" size={18} />
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        variant="text"
                        size="sm"
                        onClick={() => onReactivate(item.id)}
                        title="Reactivar"
                        className="!px-2"
                      >
                        <Icon name="restore" size={18} />
                      </Button>
                    )}
                  </div>
                </Td>
              )}
            </Tr>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
