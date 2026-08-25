import "@testing-library/jest-dom";

// jsdom's test-environment global lacks structuredClone (present in real
// browsers and in the outer Node process, but not exposed on jsdom's global)
// — fake-indexeddb (used by app/_lib/offline tests) needs it to clone values
// on put(). Minimal polyfill covering the plain-object/array/Date/Map/Set
// shapes our IndexedDB records actually use.
if (typeof (globalThis as { structuredClone?: unknown }).structuredClone === "undefined") {
  function clone(value: unknown): unknown {
    if (value === null || typeof value !== "object") return value;
    if (value instanceof Date) return new Date(value.getTime());
    if (Array.isArray(value)) return value.map(clone);
    if (value instanceof Map) return new Map(Array.from(value.entries()).map(([k, v]) => [clone(k), clone(v)]));
    if (value instanceof Set) return new Set(Array.from(value).map(clone));
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>)) {
      out[key] = clone((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  (globalThis as { structuredClone?: typeof clone }).structuredClone = clone;
}

// Polyfill HTMLDialogElement.show/showModal/close — jsdom stubs the class but omits these methods
const _dlg = (global as any).HTMLDialogElement;
if (_dlg) {
  if (!_dlg.prototype.show) _dlg.prototype.show = function () { this.open = true; };
  if (!_dlg.prototype.showModal) _dlg.prototype.showModal = function () { this.open = true; };
  if (!_dlg.prototype.close) _dlg.prototype.close = function () { this.open = false; };
}
