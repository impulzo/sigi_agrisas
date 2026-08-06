## Context

Ver `proposal.md` - Why. El patrón de envío de documentos por correo ya existe completo en `billing` (`SendInvoiceEmailUseCase`, `SendInvoiceEmailModal`, `MailerPort`/`NodemailerMailer` vía `src/shared/infrastructure/di/mailerContainer.ts`). Este change replica ese patrón para `pos`, con una diferencia: la factura adjunta PDF/XML generados por Facturama; el ticket no tiene un archivo generado — el cuerpo del correo es HTML renderizado directamente con los datos ya disponibles de `SaleDetail`.

## Goals / Non-Goals

**Goals:**
- Página `/sales/:id/ticket` con el diseño Stitch, sin nuevo endpoint de lectura (reusa `SaleDetail`).
- Envío de correo real, mismo nivel de robustez que `billing` (errores tipados, síncrono, branch scoping).

**Non-Goals:**
- No se reemplaza `PrintableTicket.tsx` ni su flujo de impresión térmica — se reutiliza tal cual.
- No se genera PDF del ticket — el correo es HTML plano con los datos del ticket (a diferencia de facturas, que adjuntan PDF/XML de Facturama).
- No se implementa envío asíncrono/cola — mismo criterio síncrono que `billing` (falla propaga HTTP 502 inmediato).

## Decisions

**1. `SendSaleTicketEmailUseCase` vive en `src/modules/pos/`, no en un módulo nuevo.**
El ticket es un artefacto de `Sale` (módulo `pos`); no amerita un módulo propio. Responde a Historia #2.

**2. Sin PDF adjunto — cuerpo HTML inline.**
Alternativa descartada: generar un PDF del ticket (como hace `billing` con `@react-pdf/renderer`) para adjuntarlo. Se descarta por alcance — ninguna Historia de Usuario pide un archivo descargable, solo "enviarlo por correo para no imprimir". Un HTML con folio/items/totales cumple el motivo de negocio sin la complejidad de un renderer PDF nuevo para este módulo.

**3. El endpoint resuelve el email igual que `billing-api`: `body.email` → si ausente, `sale.customer?.email` → si ambos ausentes, 400.**
`Sale.customerId` es nullable (ventas "público general"), a diferencia de `Invoice` donde el cliente siempre existe (dato fiscal obligatorio para timbrar). El caso "sin cliente" ya está cubierto explícitamente por un escenario del spec (Historia #2, criterio 2).

**4. Gate `sales:read`, no un permiso nuevo.**
Mismo criterio que `billing:read` gatea el envío de facturas: ver el ticket (ya accesible con `sales:read`) y reenviarlo por correo no es una acción de mayor privilegio que verlo. Responde al Criterio de Seguridad de Historia #2.

**5. La página `/sales/:id/ticket` NO hace fetch propio — recibe los datos via el mismo hook `useSaleDetail` ya usado por `/sales/:id`.**
Evita duplicar lógica de carga/branch-scoping/errores; el `TicketPreviewPage` es un componente de presentación puro sobre datos ya resueltos, igual que `PrintableTicket.tsx` ya hace hoy.

## Risks / Trade-offs

- **[Riesgo] Confusión entre el ticket Stitch (pantalla) y el térmico (impresora)**: un usuario podría esperar que "Imprimir Ticket" en la nueva página imprima el diseño con colores que ve en pantalla. → **Mitigación**: documentado explícitamente en el spec (`sales-ticket-preview-ui` — "Print action") y en la UI (el botón dispara el mismo flujo que ya conocen desde `/sales/:id`).
- **[Riesgo] Falta de adjunto puede no satisfacer expectativas de "comprobante formal"**: un email HTML sin PDF es más informal que el de facturas. → **Mitigación**: aceptado explícitamente como Non-Goal; si el negocio requiere PDF adjunto después, es un change nuevo (no bloquea esta entrega).
- **[Riesgo] SMTP no configurado en desarrollo**: igual que `billing`, sin `SMTP_HOST` el envío lanza `SmtpNotConfiguredError` (ya existente). → **Mitigación**: comportamiento ya validado por `billing`; se documenta en tasks.md como caso de prueba esperado en entornos sin SMTP.
