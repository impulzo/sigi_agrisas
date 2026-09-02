import { z } from "zod";

const structuredAddressFields = {
  addressStreet: z.string().max(150).nullable().optional(),
  addressExteriorNumber: z.string().max(20).nullable().optional(),
  addressInteriorNumber: z.string().max(20).nullable().optional(),
  addressNeighborhood: z.string().max(100).nullable().optional(),
  addressMunicipality: z.string().max(100).nullable().optional(),
  addressState: z.string().regex(/^[A-Z]{2,3}$/, "Clave de estado inválida (2-3 letras mayúsculas)").nullable().optional(),
  addressCountry: z.string().max(3).nullable().optional(),
  addressZipCode: z.string().regex(/^\d{5}$/, "Código postal inválido (5 dígitos)").nullable().optional(),
};

export const createBranchSchema = z.object({
  code: z.string().regex(/^[A-Z0-9_]{1,32}$/, "Código inválido (A-Z, 0-9, _, máx 32)"),
  name: z.string().min(1).max(100),
  address: z.string().max(300).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  email: z.string().email().max(120).nullable().optional(),
  isActive: z.boolean().optional(),
  ...structuredAddressFields,
});

export const updateBranchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  address: z.string().max(300).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  email: z.string().email().max(120).nullable().optional(),
  isActive: z.boolean().optional(),
  ...structuredAddressFields,
});

export type CreateBranchFormValues = z.infer<typeof createBranchSchema>;
export type UpdateBranchFormValues = z.infer<typeof updateBranchSchema>;
