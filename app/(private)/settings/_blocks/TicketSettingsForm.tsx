"use client";

import { useState, useEffect } from "react";
import { ImageUploadField } from "../../../_components/molecules/ImageUploadField/ImageUploadField";
import { uploadTicketLogo } from "../_logic/services/uploadTicketLogo";
import { deleteTicketLogo } from "../_logic/services/deleteTicketLogo";
import { useTicketSettingsMutations } from "../_logic/hooks/useTicketSettingsMutations";
import type { TicketSettingsDto, PaperWidthDto } from "../_logic/types/api";

interface TicketSettingsFormProps {
  settings: TicketSettingsDto;
  canWrite: boolean;
  onChange: (updated: TicketSettingsDto) => void;
}

export function TicketSettingsForm({ settings, canWrite, onChange }: TicketSettingsFormProps) {
  const [headerText, setHeaderText] = useState(settings.headerText ?? "");
  const [footerText, setFooterText] = useState(settings.footerText ?? "");
  const [paperWidth, setPaperWidth] = useState<PaperWidthDto>(settings.paperWidth);
  const [businessAddress, setBusinessAddress] = useState(settings.businessAddress ?? "");
  const [businessPhone, setBusinessPhone] = useState(settings.businessPhone ?? "");
  const [businessTaxRegime, setBusinessTaxRegime] = useState(settings.businessTaxRegime ?? "");
  const [legendText, setLegendText] = useState(settings.legendText ?? "");

  const { isSaving, mutationError, clearError, update } = useTicketSettingsMutations(onChange);

  useEffect(() => {
    setHeaderText(settings.headerText ?? "");
    setFooterText(settings.footerText ?? "");
    setPaperWidth(settings.paperWidth);
    setBusinessAddress(settings.businessAddress ?? "");
    setBusinessPhone(settings.businessPhone ?? "");
    setBusinessTaxRegime(settings.businessTaxRegime ?? "");
    setLegendText(settings.legendText ?? "");
  }, [settings]);

  async function handleSave() {
    await update({
      headerText: headerText.trim() || null,
      footerText: footerText.trim() || null,
      paperWidth,
      businessAddress: businessAddress.trim() || null,
      businessPhone: businessPhone.trim() || null,
      businessTaxRegime: businessTaxRegime.trim() || null,
      legendText: legendText.trim() || null,
    });
  }

  const inputCls =
    "w-full rounded border border-outline px-3 py-2 text-body-sm bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60";

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <p className="text-label-md text-on-surface mb-2">Logo del ticket</p>
        <ImageUploadField
          currentUrl={settings.logoUrl}
          productId="ticket-logo"
          canWrite={canWrite}
          onUploaded={(logoUrl) => onChange({ ...settings, logoUrl })}
          onDeleted={() => onChange({ ...settings, logoUrl: null })}
          uploadFn={uploadTicketLogo}
          deleteFn={deleteTicketLogo}
        />
      </div>

      <div className="space-y-4 border-t border-outline-variant pt-4">
        <p className="text-label-md text-on-surface font-semibold">Información del negocio</p>

        <div>
          <label htmlFor="business-address" className="block text-label-md text-on-surface mb-1">
            Dirección
          </label>
          <input
            id="business-address"
            type="text"
            value={businessAddress}
            onChange={(e) => setBusinessAddress(e.target.value.slice(0, 300))}
            disabled={!canWrite}
            placeholder="Dirección, ciudad, CP"
            className={inputCls}
          />
        </div>

        <div>
          <label htmlFor="business-phone" className="block text-label-md text-on-surface mb-1">
            Teléfono
          </label>
          <input
            id="business-phone"
            type="text"
            value={businessPhone}
            onChange={(e) => setBusinessPhone(e.target.value.slice(0, 30))}
            disabled={!canWrite}
            placeholder="Teléfono"
            className={inputCls}
          />
        </div>

        <div>
          <label htmlFor="business-tax-regime" className="block text-label-md text-on-surface mb-1">
            Régimen Fiscal
          </label>
          <input
            id="business-tax-regime"
            type="text"
            value={businessTaxRegime}
            onChange={(e) => setBusinessTaxRegime(e.target.value.slice(0, 120))}
            disabled={!canWrite}
            placeholder="612 Personas Físicas con Actividad Empresarial"
            className={inputCls}
          />
        </div>
      </div>

      <div className="space-y-4 border-t border-outline-variant pt-4">
        <p className="text-label-md text-on-surface font-semibold">Texto del ticket</p>

        <div>
          <label htmlFor="header-text" className="block text-label-md text-on-surface mb-1">
            Texto de encabezado
          </label>
          <textarea
            id="header-text"
            value={headerText}
            onChange={(e) => setHeaderText(e.target.value.slice(0, 500))}
            disabled={!canWrite}
            rows={2}
            placeholder="Dirección, teléfono, etc."
            className={inputCls}
          />
        </div>

        <div>
          <label htmlFor="footer-text" className="block text-label-md text-on-surface mb-1">
            Texto de pie
          </label>
          <textarea
            id="footer-text"
            value={footerText}
            onChange={(e) => setFooterText(e.target.value.slice(0, 500))}
            disabled={!canWrite}
            rows={2}
            placeholder="Gracias por su compra"
            className={inputCls}
          />
        </div>

        <div>
          <label htmlFor="legend-text" className="block text-label-md text-on-surface mb-1">
            Leyenda del ticket
          </label>
          <textarea
            id="legend-text"
            value={legendText}
            onChange={(e) => setLegendText(e.target.value.slice(0, 500))}
            disabled={!canWrite}
            rows={3}
            placeholder="Favor de revisar su mercancía. No se hacen cambios ni devoluciones. Gracias por su compra."
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <p className="block text-label-md text-on-surface mb-1">Ancho de papel</p>
        <div className="flex gap-3">
          {(["58mm", "80mm"] as const).map((width) => (
            <label key={width} className="flex items-center gap-2 text-body-sm text-on-surface">
              <input
                type="radio"
                name="paperWidth"
                value={width}
                checked={paperWidth === width}
                onChange={() => setPaperWidth(width)}
                disabled={!canWrite}
              />
              {width}
            </label>
          ))}
        </div>
      </div>

      {mutationError && (
        <div className="rounded bg-error-container/30 px-3 py-2 text-body-sm text-error flex items-center justify-between gap-2">
          {mutationError.message}
          <button type="button" onClick={clearError} className="text-error hover:underline flex-shrink-0">Cerrar</button>
        </div>
      )}

      {canWrite && (
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 rounded text-label-lg bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isSaving ? "Guardando…" : "Guardar cambios"}
        </button>
      )}
    </div>
  );
}
