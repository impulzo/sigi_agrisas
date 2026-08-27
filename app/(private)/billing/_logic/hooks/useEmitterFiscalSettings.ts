"use client";

import { useEffect, useState } from "react";
import { getEmitterFiscalSettings } from "../services/getEmitterFiscalSettings";

export interface EmitterFiscalSettingsState {
  rfc: string | null;
  fiscalRegime: string | null;
  zipCode: string | null;
  address: string | null;
}

const EMPTY: EmitterFiscalSettingsState = { rfc: null, fiscalRegime: null, zipCode: null, address: null };

/**
 * Resolves the issuer's fiscal identity for on-screen preview only. Failure or
 * incompleteness never blocks the caller — the real PDF re-resolves this
 * server-side regardless.
 */
export function useEmitterFiscalSettings(): EmitterFiscalSettingsState {
  const [data, setData] = useState<EmitterFiscalSettingsState>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    getEmitterFiscalSettings()
      .then((res) => {
        if (cancelled) return;
        setData({ rfc: res.rfc, fiscalRegime: res.fiscalRegime, zipCode: res.zipCode, address: res.address });
      })
      .catch(() => {
        // Non-blocking: keep nulls, render "—" in the preview.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}
