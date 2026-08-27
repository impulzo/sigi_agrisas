interface SatCodeSearchUseCase {
  execute(query: string | undefined): Promise<{ items: Array<{ code: string; description: string }> }>;
}

/**
 * Resolves "<code> - <description>" via an exact-code lookup, reusing the
 * sat-codes module's existing search use case (codes are fixed-length, so
 * passing the exact code as the query is effectively an exact match). Falls
 * back to the raw code if there is no match.
 */
export async function resolveSatDescription(useCase: SatCodeSearchUseCase, code: string): Promise<string> {
  if (!code) return code;
  const { items } = await useCase.execute(code);
  const match = items.find((i) => i.code === code);
  return match ? `${match.code} - ${match.description}` : code;
}
