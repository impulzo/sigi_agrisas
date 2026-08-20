import { z } from "zod";

export const createSaleWaybillItemSchema = z
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

export const createSaleWaybillSchema = z
  .object({
    type: z.literal("carta_porte"),
    saleId: z.string().uuid("Venta inválida"),
    vehicle: z.object({
      vehicleId: z.string().uuid().nullable().optional(),
      plate: z.string().min(1, "La placa es obligatoria"),
      config: z.string().min(1, "La configuración vehicular es obligatoria"),
      permitType: z.string().min(1, "El tipo de permiso SCT es obligatorio"),
      permitNumber: z.string().min(1, "El número de permiso SCT es obligatorio"),
      insuranceCompany: z.string().min(1, "La aseguradora es obligatoria"),
      insurancePolicy: z.string().min(1, "La póliza es obligatoria"),
    }),
    driver: z.object({
      driverId: z.string().uuid().nullable().optional(),
      name: z.string().min(1, "El nombre del operador es obligatorio"),
      rfc: z.string().nullable().optional(),
      licenseNumber: z.string().min(1, "El número de licencia es obligatorio"),
    }),
    distanceKm: z.number().positive("La distancia debe ser mayor a 0"),
    departureAt: z.string().min(1, "La fecha de salida es obligatoria"),
    arrivalAt: z.string().min(1, "La fecha de llegada es obligatoria"),
    items: z.array(createSaleWaybillItemSchema).min(1, "Agrega al menos una mercancía"),
  })
  .refine((d) => new Date(d.arrivalAt) > new Date(d.departureAt), {
    message: "La llegada debe ser posterior a la salida",
    path: ["arrivalAt"],
  });

export type CreateSaleWaybillFormValues = z.infer<typeof createSaleWaybillSchema>;
