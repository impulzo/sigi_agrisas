import { z } from "zod";

export const entityCodeSchema = z
  .string()
  .regex(/^[A-Z0-9_]{1,32}$/, "code must be uppercase letters, digits, or underscores (1–32 chars)");

const RFC_REGEX = /^([A-ZÑ&]{3,4})\d{6}([A-Z\d]{3})$/;
const TAX_REGIME_REGEX = /^\d{3}$/;

export const rfcSchema = z
  .string()
  .min(1)
  .transform((v) => v.trim().toUpperCase())
  .pipe(z.string().regex(RFC_REGEX, "rfc must be a valid Mexican RFC"));

export const taxRegimeSchema = z.string().regex(TAX_REGIME_REGEX, "taxRegime must be 3 digits");
