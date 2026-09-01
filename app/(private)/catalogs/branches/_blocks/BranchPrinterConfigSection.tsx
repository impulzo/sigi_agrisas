"use client";

import { useState, useEffect } from "react";
import { Select } from "../../../../_components/atoms/Select";
import { Icon } from "../../../../_components/atoms/Icon/Icon";
import { useCurrentUser } from "../../../../_hooks/useCurrentUser";
import { usePrinterConfig } from "../_logic/hooks/usePrinterConfig";
import { usePrinterConfigMutations } from "../_logic/hooks/usePrinterConfigMutations";
import { printerConfigSchema } from "../_logic/schemas/branch.schema";
import { IncompletePrinterConfigError } from "../_logic/errors";
import type { PrintMode, UpdatePrinterConfigBody } from "../_logic/types/api";

interface BranchPrinterConfigSectionProps {
  branchId: string;
}

function normalizeOptional(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function BranchPrinterConfigSection({ branchId }: BranchPrinterConfigSectionProps) {
  const { can, isLoading: userLoading } = useCurrentUser();
  const canRead = can("settings:read");
  const canWrite = can("settings:write");

  const { config, isLoading: configLoading, error: loadError } = usePrinterConfig(canRead !== false ? branchId : null);
  const { isSaving, mutationError, clearError, save } = usePrinterConfigMutations();

  const [printMode, setPrintMode] = useState<PrintMode>("browser");
  const [agentUrl, setAgentUrl] = useState("");
  const [printerHost, setPrinterHost] = useState("");
  const [printerPort, setPrinterPort] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!config) return;
    setPrintMode(config.printMode);
    setAgentUrl(config.agentUrl ?? "");
    setPrinterHost(config.printerHost ?? "");
    setPrinterPort(config.printerPort != null ? String(config.printerPort) : "");
    setValidationError(null);
  }, [config]);

  // Optimista mientras se resuelven permisos/config — evita layout shift.
  if (userLoading || canRead === "loading") return null;
  if (!canRead) return null;

  function getDiff(): UpdatePrinterConfigBody {
    if (!config) return {};
    const diff: UpdatePrinterConfigBody = {};
    if (printMode !== config.printMode) diff.printMode = printMode;
    const url = normalizeOptional(agentUrl);
    if (url !== config.agentUrl) diff.agentUrl = url;
    const host = normalizeOptional(printerHost);
    if (host !== config.printerHost) diff.printerHost = host;
    const port = printerPort.trim() === "" ? null : Number(printerPort);
    if (port !== config.printerPort) diff.printerPort = port;
    return diff;
  }

  async function handleSave() {
    const result = printerConfigSchema.safeParse({
      printMode,
      agentUrl: normalizeOptional(agentUrl),
      printerHost: normalizeOptional(printerHost),
      printerPort: printerPort.trim() === "" ? null : Number(printerPort),
    });
    if (!result.success) {
      setValidationError(result.error.issues[0]?.message ?? "Configuración inválida");
      return;
    }
    setValidationError(null);
    const diff = getDiff();
    if (Object.keys(diff).length === 0) return;
    await save(branchId, diff);
  }

  const isEscpos = printMode === "escpos";
  const diff = getDiff();
  const isDiffEmpty = Object.keys(diff).length === 0;
  const inputCls =
    "w-full px-3 py-2 rounded-md border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-surface-container";

  return (
    <section className="space-y-4 pt-4 border-t border-outline-variant">
      <h3 className="text-title-sm font-medium text-on-surface-variant uppercase tracking-wide">Impresión</h3>

      {configLoading && <p className="text-body-sm text-on-surface-variant">Cargando configuración…</p>}
      {loadError && <p className="text-body-sm text-error">No se pudo cargar la configuración de impresión.</p>}

      {!configLoading && !loadError && (
        <>
          <div>
            <label className="block text-label-lg text-on-surface-variant mb-1" htmlFor="printer-mode">
              Modo de impresión
            </label>
            <Select
              id="printer-mode"
              value={printMode}
              onChange={(e) => setPrintMode(e.target.value as PrintMode)}
              disabled={!canWrite}
            >
              <option value="browser">Navegador (window.print)</option>
              <option value="escpos">ESC/POS (agente local)</option>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-label-lg text-on-surface-variant mb-1" htmlFor="printer-agent-url">
                URL del agente local
              </label>
              <input
                id="printer-agent-url"
                type="text"
                value={agentUrl}
                onChange={(e) => setAgentUrl(e.target.value)}
                disabled={!canWrite || !isEscpos}
                placeholder="http://localhost:9101"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-label-lg text-on-surface-variant mb-1" htmlFor="printer-host">
                Host de la impresora
              </label>
              <input
                id="printer-host"
                type="text"
                value={printerHost}
                onChange={(e) => setPrinterHost(e.target.value)}
                disabled={!canWrite || !isEscpos}
                placeholder="192.168.1.50"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-label-lg text-on-surface-variant mb-1" htmlFor="printer-port">
                Puerto de la impresora
              </label>
              <input
                id="printer-port"
                type="number"
                value={printerPort}
                onChange={(e) => setPrinterPort(e.target.value)}
                disabled={!canWrite || !isEscpos}
                placeholder="9100"
                className={inputCls}
              />
            </div>
          </div>

          {validationError && <p className="text-label-sm text-error">{validationError}</p>}

          {mutationError && (
            <p className="text-label-sm text-error flex items-center justify-between gap-2">
              {mutationError instanceof IncompletePrinterConfigError
                ? "El modo ESC/POS requiere URL del agente y host de la impresora."
                : mutationError.message}
              <button type="button" onClick={clearError} className="text-error hover:underline flex-shrink-0">
                Cerrar
              </button>
            </p>
          )}

          {canWrite && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isDiffEmpty}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-secondary-container text-on-secondary-container text-label-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Icon name="progress_activity" size={16} className="animate-spin" />
                  Guardando…
                </>
              ) : (
                "Guardar configuración de impresión"
              )}
            </button>
          )}
        </>
      )}
    </section>
  );
}
