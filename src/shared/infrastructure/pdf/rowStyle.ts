export function rowStyle<T>(index: number, base: T, alt: T): T {
  return index % 2 === 0 ? base : alt;
}
