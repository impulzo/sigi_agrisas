export interface FacturamaHttpClientOptions {
  baseUrl?: string;
  user?: string;
  password?: string;
  fetchImpl?: typeof fetch;
}

function buildBasicAuth(user: string, password: string): string {
  return "Basic " + Buffer.from(`${user}:${password}`).toString("base64");
}

/**
 * Transporte HTTP compartido con la API REST de Facturama (auth básica +
 * request genérico) — usado por `billing/infrastructure/services/FacturamaRestGateway`
 * y `waybills/infrastructure/services/FacturamaRestGateway`. Cada módulo
 * conserva sus propios payload builders y su propia clase de gateway.
 */
export class FacturamaHttpClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: FacturamaHttpClientOptions = {}) {
    const user = opts.user ?? process.env.FACTURAMA_USER ?? "";
    const password = opts.password ?? process.env.FACTURAMA_PASSWORD ?? "";
    this.baseUrl = (opts.baseUrl ?? process.env.FACTURAMA_BASE_URL ?? "https://apisandbox.facturama.mx/").replace(
      /\/$/,
      ""
    );
    this.fetchImpl = opts.fetchImpl ?? fetch;

    if (!user || !password) {
      throw new Error("FACTURAMA_USER and FACTURAMA_PASSWORD are required when FACTURAMA_MOCK is false");
    }
    this.authHeader = buildBasicAuth(user, password);
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await this.fetchImpl(url, {
      method,
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body != null ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Facturama HTTP ${res.status}: ${text}`);
    }

    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      return res.json() as Promise<T>;
    }
    return res.text() as unknown as Promise<T>;
  }
}
