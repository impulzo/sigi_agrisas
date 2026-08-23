interface ZodFlattenedError {
  fieldErrors?: Record<string, string[]>;
  formErrors?: string[];
}

export function messageFromZodErrorBody(body: unknown): string {
  const error = (body as { error?: unknown } | null)?.error;

  if (typeof error === "string") return error;

  if (error && typeof error === "object") {
    const flat = error as ZodFlattenedError;
    const firstFieldError = Object.values(flat.fieldErrors ?? {})
      .flat()
      .find((msg): msg is string => Boolean(msg));
    if (firstFieldError) return firstFieldError;

    const firstFormError = (flat.formErrors ?? []).find((msg) => Boolean(msg));
    if (firstFormError) return firstFormError;
  }

  return "Solicitud inválida. Verifica los datos capturados.";
}
