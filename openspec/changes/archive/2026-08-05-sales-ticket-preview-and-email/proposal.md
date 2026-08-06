## Historia de Usuario

| # | Rol | Tarea | Motivo | Criterios de Aceptación | Criterios de Seguridad |
|---|---|---|---|---|---|
| 1 | Cajero/Administrador (`sales:read`) | Como usuario que consulta una venta, quiero ver una vista previa del ticket con el diseño oficial de Agrisas (logo, desglose de IVA/IEPS, método de pago) para revisar el comprobante antes de imprimirlo o compartirlo | - Given una venta `completed`/`cancelled`/`edited` con `sales:read`, when navego a `/sales/:id/ticket`, then veo folio, fecha, cajero, items, Subtotal/IVA/IEPS (siempre, aunque $0)/Total, método de pago y footer configurado.<br>- Given hago clic en "Imprimir Ticket", when se dispara la impresión, then usa el `PrintableTicket.tsx` existente (térmico 80mm/58mm) — el diseño Stitch es solo para pantalla, nunca se envía a la impresora física.<br>- Given un usuario sin `sales:read`, when intenta acceder a la ruta, then es redirigido/rechazado igual que `/sales/:id`. | - Misma protección que `/sales/:id` (gate `sales:read`, sin datos nuevos expuestos — reusa `SaleDetail` ya cargado). |
| 2 | Cajero/Administrador (`sales:read`) | Como usuario en la vista previa del ticket, quiero enviarlo por correo al cliente (o a un correo que yo indique) para entregar el comprobante sin necesidad de imprimirlo físicamente | - Given una venta con cliente que tiene email registrado, when hago clic en "Enviar por Correo" sin capturar nada, then se envía al email del cliente.<br>- Given una venta sin cliente (público general) o cliente sin email, when abro el modal, then debo capturar un email manualmente — sin él, error claro (`SaleNoEmailError`).<br>- Given el envío fallara (SMTP no configurado / error de red), when ocurre, then veo un mensaje de error claro y ningún estado de la venta cambia. | - Gate `sales:read` (mismo criterio que `billing:read` gatea `sendEmail` de facturas — ver correo de un ticket ya visible no es una acción de mayor privilegio).<br>- El email de destino se valida (formato) antes de enviar; no se expone ningún dato de otra venta/cliente en el cuerpo del correo. |

Nota: 2 historias, cada una trazable a un punto de "What Changes". Sin ambigüedad de Rol/Motivo — inferidas del patrón `billing:read` ya usado para `sendEmail` de facturas.

## Why

El ticket impreso actual (`PrintableTicket.tsx`) es monospace y solo visible al imprimir — no hay forma de previsualizarlo en pantalla ni de compartirlo digitalmente. El cliente pidió una vista con el diseño de marca de Agrisas (mockup Stitch "Ticket de Venta - Agrisas") para dar una experiencia más presentable al revisar o entregar el comprobante, y la posibilidad de enviarlo por correo cuando no se imprime físicamente (venta a distancia, cliente que lo pide después, etc.). El proyecto ya resolvió el envío de documentos por correo para facturas (`billing`); este change reutiliza exactamente ese patrón para el ticket de venta, evitando construir infraestructura de correo nueva.

## What Changes

- Nueva página `/sales/[id]/ticket`: vista previa en pantalla del ticket con el diseño Stitch (logo, header, tabla de items, Subtotal/IVA/IEPS siempre visibles, Total, método de pago, footer, código de barras decorativo), reusando los datos ya cargados de `SaleDetail` (sin fetch adicional).
- Botón "Imprimir Ticket" en la nueva página dispara `window.print()` montando el `PrintableTicket.tsx` existente — el diseño Stitch NO se imprime tal cual (no apto para impresora térmica 80mm); solo es para pantalla.
- Nuevo enlace "Ver Ticket" desde `/sales/:id` hacia la nueva página.
- Nueva capacidad de envío de ticket por correo: `POST /api/v1/admin/sales/:id/send-ticket-email`, reutilizando `MailerPort`/`NodemailerMailer` y replicando el patrón de `SendInvoiceEmailUseCase`/`SendInvoiceEmailModal` de `billing` (sin adjuntos PDF/XML — el cuerpo del correo es un resumen HTML del ticket).
- Botón "Enviar por Correo" en la nueva página abre un modal (mismo patrón UX que `SendInvoiceEmailModal`) para confirmar o capturar un email alternativo.

## Capabilities

### New Capabilities
- `sales-ticket-preview-ui`: página `/sales/[id]/ticket` — vista en pantalla del ticket con diseño Stitch, acciones "Imprimir Ticket" y "Enviar por Correo".

### Modified Capabilities
- `pos-api`: se agrega el endpoint `POST /api/v1/admin/sales/:id/send-ticket-email` (nuevo requirement, mismo patrón que "Send invoice by email" de `billing-api`).

## Impact

- **Backend**: `src/modules/pos/application/use-cases/SendSaleTicketEmailUseCase.ts` (nuevo, análogo a `SendInvoiceEmailUseCase.ts`), errores `SaleNoEmailError`/`SaleEmailSendFailedError`, `SalesController.sendTicketEmail`, endpoint `app/api/v1/admin/sales/[id]/send-ticket-email/route.ts`, wiring en `src/modules/pos/infrastructure/di/container.ts` (reusa `NodemailerMailer`/`mailerContainer` ya existente).
- **Frontend**: `app/(private)/sales/[id]/ticket/page.tsx` + `_blocks/TicketPreviewPage.tsx`, `_blocks/SendTicketEmailModal.tsx`, servicio `sendTicketEmail.ts`, hook de mutación, enlace nuevo en `SaleDetailPage.tsx`.
- **No afecta**: `PrintableTicket.tsx` (se reutiliza sin cambios), RBAC (reusa `sales:read`, sin permiso nuevo), branch scoping (hereda el guard ya aplicado a `/sales/:id`), ticket_settings (se reutiliza logo/header/footer ya existentes).
- **Diseño fuente**: Stitch, proyecto `5227157529282603342`, screen `f2b656f477054227afc8fb88e8629c87` ("Ticket de Venta - Agrisas").
