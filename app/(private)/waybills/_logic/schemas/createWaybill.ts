import { z } from "zod";

export const createSimpleWaybillItemSchema = z.object({
  productId: z.string().uuid("Selecciona un producto del catálogo"),
  description: z.string().min(1, "La descripción es obligatoria"),
  quantity: z.number().positive("La cantidad debe ser mayor a 0"),
});

export const createSimpleWaybillSchema = z.object({
  type: z.literal("simple"),
  originBranchId: z.string().uuid("Selecciona la sucursal de origen"),
  destinationBranchId: z.string().uuid("Selecciona la sucursal de destino"),
  transferDate: z.string().min(1, "La fecha de traspaso es obligatoria"),
  notes: z.string().nullable().optional(),
  items: z.array(createSimpleWaybillItemSchema).min(1, "Agrega al menos una mercancía"),
});

export const createCartaPorteWaybillItemSchema = z
  .object({
    productId: z.string().uuid().nullable().optional(),
    description: z.string().min(1, "La descripción es obligatoria"),
    satBienesTranspCode: z.string().min(1, "La clave SAT de transporte es obligatoria"),
    satUnitCode: z.string().min(1, "La clave de unidad SAT es obligatoria"),
    quantity: z.number().positive("La cantidad debe ser mayor a 0"),
    weightKg: z.number().positive("El peso debe ser mayor a 0"),
    isHazardousMaterial: z.boolean().optional(),
    hazardousMaterialCode: z.string().nullable().optional(),
  })
  .refine((d) => !d.isHazardousMaterial || !!d.hazardousMaterialCode?.trim(), {
    message: "La clave de material peligroso es obligatoria",
    path: ["hazardousMaterialCode"],
  });

export const createCartaPorteWaybillSchema = z.object({
  type: z.literal("carta_porte"),
  originBranchId: z.string().uuid("Selecciona la sucursal de origen"),
  destinationBranchId: z.string().uuid("Selecciona la sucursal de destino"),
  vehicle: z.object({
    plate: z.string().min(1, "La placa es obligatoria"),
    config: z.string().min(1, "La configuración vehicular es obligatoria"),
    permitType: z.string().min(1, "El tipo de permiso SCT es obligatorio"),
    permitNumber: z.string().min(1, "El número de permiso SCT es obligatorio"),
    insuranceCompany: z.string().min(1, "La aseguradora es obligatoria"),
    insurancePolicy: z.string().min(1, "La póliza es obligatoria"),
  }),
  driver: z.object({
    name: z.string().min(1, "El nombre del operador es obligatorio"),
    rfc: z.string().nullable().optional(),
    licenseNumber: z.string().min(1, "El número de licencia es obligatorio"),
  }),
  distanceKm: z.number().positive("La distancia debe ser mayor a 0"),
  departureAt: z.string().min(1, "La fecha de salida es obligatoria"),
  arrivalAt: z.string().min(1, "La fecha de llegada es obligatoria"),
  items: z.array(createCartaPorteWaybillItemSchema).min(1, "Agrega al menos una mercancía"),
});

export const createWaybillSchema = z
  .discriminatedUnion("type", [createSimpleWaybillSchema, createCartaPorteWaybillSchema])
  .superRefine((d, ctx) => {
    if (d.originBranchId === d.destinationBranchId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Origen y destino deben ser sucursales distintas",
        path: ["destinationBranchId"],
      });
    }
    if (d.type === "carta_porte" && new Date(d.arrivalAt) <= new Date(d.departureAt)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La llegada debe ser posterior a la salida",
        path: ["arrivalAt"],
      });
    }
  });

export type CreateWaybillFormValues = z.infer<typeof createWaybillSchema>;
