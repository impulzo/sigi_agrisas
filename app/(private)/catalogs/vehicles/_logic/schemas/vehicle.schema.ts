import { z } from "zod";

export const createVehicleSchema = z.object({
  code: z.string().regex(/^[A-Z0-9_]{1,32}$/, "Código inválido (A-Z, 0-9, _, máx 32)"),
  plate: z.string().min(1, "La placa es obligatoria").max(20),
  vehicleConfig: z.string().min(1, "La configuración es obligatoria").max(10),
  permitType: z.string().min(1, "El tipo de permiso es obligatorio").max(10),
  permitNumber: z.string().min(1, "El número de permiso es obligatorio").max(50),
  insuranceCompany: z.string().min(1, "La aseguradora es obligatoria").max(150),
  insurancePolicy: z.string().min(1, "La póliza es obligatoria").max(50),
  notes: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const updateVehicleSchema = z.object({
  plate: z.string().min(1).max(20).optional(),
  vehicleConfig: z.string().min(1).max(10).optional(),
  permitType: z.string().min(1).max(10).optional(),
  permitNumber: z.string().min(1).max(50).optional(),
  insuranceCompany: z.string().min(1).max(150).optional(),
  insurancePolicy: z.string().min(1).max(50).optional(),
  notes: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export type CreateVehicleFormValues = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleFormValues = z.infer<typeof updateVehicleSchema>;
