import { z } from "zod";

const codeRegex = /^[A-Z0-9_]{1,32}$/;
const satProductCodeRegex = /^\d{8}$/;

export const createProductSchema = z.object({
  code: z.string().regex(codeRegex, "El código debe ser MAYÚSCULAS, dígitos y guiones bajos (máx. 32)."),
  name: z.string().min(1, "El nombre es obligatorio.").max(120),
  unit: z.string().min(1, "La unidad es obligatoria.").max(30),
  departmentId: z.string().uuid("Selecciona un departamento válido."),
  satProductCode: z
    .string()
    .regex(satProductCodeRegex, "Código SAT inválido. Debe tener 8 dígitos.")
    .nullable()
    .optional(),
  ivaRate: z.number().min(0, "El IVA no puede ser negativo.").max(100, "El IVA no puede superar 100.").nullable().optional(),
  iepsRate: z.number().min(0, "El IEPS no puede ser negativo.").max(100, "El IEPS no puede superar 100.").nullable().optional(),
  isActive: z.boolean().optional(),
});

export const updateProductSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    unit: z.string().min(1).max(30).optional(),
    departmentId: z.string().uuid().optional(),
    satProductCode: z
      .string()
      .regex(satProductCodeRegex, "Código SAT inválido. Debe tener 8 dígitos.")
      .nullable()
      .optional(),
    ivaRate: z.number().min(0).max(100).nullable().optional(),
    iepsRate: z.number().min(0).max(100).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (d) =>
      d.name !== undefined ||
      d.unit !== undefined ||
      d.departmentId !== undefined ||
      d.satProductCode !== undefined ||
      d.ivaRate !== undefined ||
      d.iepsRate !== undefined ||
      d.isActive !== undefined,
    { message: "Debes modificar al menos un campo." },
  );

export type CreateProductFormValues = z.infer<typeof createProductSchema>;
export type UpdateProductFormValues = z.infer<typeof updateProductSchema>;
