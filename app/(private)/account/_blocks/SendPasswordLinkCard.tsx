"use client";

import { Card } from "../../../_components/molecules/Card/Card";
import { Button } from "../../../_components/atoms/Button/Button";

interface SendPasswordLinkCardProps {
  isSendingPasswordLink: boolean;
  passwordLinkError: string | null;
  passwordLinkSentTo: string | null;
  sendPasswordLink: () => Promise<boolean>;
}

export function SendPasswordLinkCard({
  isSendingPasswordLink,
  passwordLinkError,
  passwordLinkSentTo,
  sendPasswordLink,
}: SendPasswordLinkCardProps) {
  return (
    <Card>
      <div className="flex flex-col gap-md">
        <h2 className="text-title-md font-semibold text-on-surface">Cambiar contraseña</h2>
        <p className="text-body-sm text-on-surface-variant">
          Te enviaremos un correo con un enlace para establecer una nueva contraseña. El enlace
          expira en 24 horas y sólo puede usarse una vez.
        </p>

        {passwordLinkSentTo && (
          <div className="rounded bg-tertiary/10 px-3 py-2 text-body-sm text-tertiary">
            Enviamos el enlace a {passwordLinkSentTo}. Revisa tu correo.
          </div>
        )}

        {passwordLinkError && (
          <div className="rounded bg-error-container/30 px-3 py-2 text-body-sm text-error">
            {passwordLinkError}
          </div>
        )}

        <div>
          <Button onClick={() => sendPasswordLink()} loading={isSendingPasswordLink}>
            Enviarme link de cambio de contraseña
          </Button>
        </div>
      </div>
    </Card>
  );
}
