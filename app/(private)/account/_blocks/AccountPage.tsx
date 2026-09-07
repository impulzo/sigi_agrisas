"use client";

import { PageShell } from "../../../_components/organisms/PageShell";
import { PageLoading } from "../../../_components/molecules/PageLoading/PageLoading";
import { EmptyState } from "../../../_components/molecules/EmptyState/EmptyState";
import { Button } from "../../../_components/atoms/Button/Button";
import { useOwnProfile } from "../_logic/hooks/useOwnProfile";
import { useAccountMutations } from "../_logic/hooks/useAccountMutations";
import { ProfileForm } from "./ProfileForm";
import { SendPasswordLinkCard } from "./SendPasswordLinkCard";

export function AccountPage() {
  const { profile, isLoading, error, refresh } = useOwnProfile();
  const {
    isSavingProfile,
    profileError,
    profileFieldErrors,
    clearProfileError,
    saveProfileDiff,
    isSendingPasswordLink,
    passwordLinkError,
    passwordLinkSentTo,
    sendPasswordLink,
  } = useAccountMutations();

  return (
    <PageShell title="Mi cuenta" description="Actualiza tu nombre y correo, o solicita cambiar tu contraseña" width="narrow">
      <div className="flex flex-col gap-lg">
        {isLoading ? (
          <PageLoading />
        ) : error || !profile ? (
          <EmptyState
            icon="warning"
            title="Error al cargar tu perfil"
            description={error?.message ?? "No se pudo cargar la información de tu cuenta."}
            action={
              <Button variant="outlined" onClick={() => refresh()}>
                Reintentar
              </Button>
            }
          />
        ) : (
          <ProfileForm
            profile={profile}
            onChange={() => refresh()}
            isSavingProfile={isSavingProfile}
            profileError={profileError}
            profileFieldErrors={profileFieldErrors}
            clearProfileError={clearProfileError}
            saveProfileDiff={saveProfileDiff}
          />
        )}
        <SendPasswordLinkCard
          isSendingPasswordLink={isSendingPasswordLink}
          passwordLinkError={passwordLinkError}
          passwordLinkSentTo={passwordLinkSentTo}
          sendPasswordLink={sendPasswordLink}
        />
      </div>
    </PageShell>
  );
}
