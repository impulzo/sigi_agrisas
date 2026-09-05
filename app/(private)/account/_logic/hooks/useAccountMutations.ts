"use client";

import { useState, useCallback } from "react";
import { updateOwnProfile } from "../services/updateOwnProfile";
import { sendMyPasswordLink } from "../services/sendMyPasswordLink";
import { EmailAlreadyInUseError } from "../errors";
import type { OwnProfileDto } from "../types/api";

interface SaveProfileDiffParams {
  original: OwnProfileDto;
  edited: { name: string; email: string };
}

interface ProfileFieldErrors {
  email?: string;
}

interface UseAccountMutationsResult {
  isSavingProfile: boolean;
  profileError: string | null;
  profileFieldErrors: ProfileFieldErrors;
  clearProfileError: () => void;
  saveProfileDiff: (params: SaveProfileDiffParams) => Promise<OwnProfileDto | null>;
  isSendingPasswordLink: boolean;
  passwordLinkError: string | null;
  passwordLinkSentTo: string | null;
  clearPasswordLinkStatus: () => void;
  sendPasswordLink: () => Promise<boolean>;
}

export function useAccountMutations(): UseAccountMutationsResult {
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileFieldErrors, setProfileFieldErrors] = useState<ProfileFieldErrors>({});
  const [isSendingPasswordLink, setIsSendingPasswordLink] = useState(false);
  const [passwordLinkError, setPasswordLinkError] = useState<string | null>(null);
  const [passwordLinkSentTo, setPasswordLinkSentTo] = useState<string | null>(null);

  const clearProfileError = useCallback(() => {
    setProfileError(null);
    setProfileFieldErrors({});
  }, []);
  const clearPasswordLinkStatus = useCallback(() => {
    setPasswordLinkError(null);
    setPasswordLinkSentTo(null);
  }, []);

  const saveProfileDiff = useCallback(
    async ({ original, edited }: SaveProfileDiffParams): Promise<OwnProfileDto | null> => {
      setIsSavingProfile(true);
      setProfileError(null);
      setProfileFieldErrors({});
      try {
        const patchBody: { name?: string; email?: string } = {};
        if (edited.name !== (original.name ?? "") && edited.name.trim() !== "") {
          patchBody.name = edited.name.trim();
        }
        if (edited.email !== original.email) {
          patchBody.email = edited.email;
        }
        if (Object.keys(patchBody).length === 0) return original;
        return await updateOwnProfile(patchBody);
      } catch (err: unknown) {
        if (err instanceof EmailAlreadyInUseError) {
          setProfileFieldErrors({ email: err.message });
        } else {
          setProfileError(err instanceof Error ? err.message : "Error al guardar el perfil");
        }
        return null;
      } finally {
        setIsSavingProfile(false);
      }
    },
    []
  );

  const sendPasswordLink = useCallback(async (): Promise<boolean> => {
    setIsSendingPasswordLink(true);
    setPasswordLinkError(null);
    setPasswordLinkSentTo(null);
    try {
      const { sentTo } = await sendMyPasswordLink();
      setPasswordLinkSentTo(sentTo);
      return true;
    } catch (err: unknown) {
      setPasswordLinkError(
        err instanceof Error ? err.message : "No se pudo enviar el correo de cambio de contraseña."
      );
      return false;
    } finally {
      setIsSendingPasswordLink(false);
    }
  }, []);

  return {
    isSavingProfile,
    profileError,
    profileFieldErrors,
    clearProfileError,
    saveProfileDiff,
    isSendingPasswordLink,
    passwordLinkError,
    passwordLinkSentTo,
    clearPasswordLinkStatus,
    sendPasswordLink,
  };
}
