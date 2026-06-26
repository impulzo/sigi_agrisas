"use client";

import { useState, useEffect, useCallback } from "react";
import { uploadCsd, getCsdStatus } from "../services";
import type { CsdStatusDto } from "../types/api";

interface UseCsdManagerResult {
  status: CsdStatusDto | null;
  isLoading: boolean;
  statusError: Error | null;
  isUploading: boolean;
  uploadError: Error | null;
  uploadSuccess: boolean;
  clearUploadError: () => void;
  refreshStatus: () => void;
  upload: (params: {
    rfc: string;
    cerFile: File;
    keyFile: File;
    password: string;
  }) => Promise<CsdStatusDto | null>;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // result is "data:<mime>;base64,<data>" — strip prefix
      resolve(result.split(",")[1] ?? result);
    };
    reader.onerror = () => reject(new Error("Error leyendo archivo"));
    reader.readAsDataURL(file);
  });
}

export function useCsdManager(): UseCsdManagerResult {
  const [status, setStatus] = useState<CsdStatusDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusError, setStatusError] = useState<Error | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<Error | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setIsLoading(true);
    setStatusError(null);
    getCsdStatus()
      .then((s) => { setStatus(s); setIsLoading(false); })
      .catch((err: Error) => { setStatusError(err); setIsLoading(false); });
  }, [tick]);

  const refreshStatus = useCallback(() => setTick((t) => t + 1), []);
  const clearUploadError = useCallback(() => setUploadError(null), []);

  const upload = useCallback(async ({ rfc, cerFile, keyFile, password }: {
    rfc: string; cerFile: File; keyFile: File; password: string;
  }): Promise<CsdStatusDto | null> => {
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);
    try {
      const [certificateBase64, privateKeyBase64] = await Promise.all([
        fileToBase64(cerFile),
        fileToBase64(keyFile),
      ]);
      const result = await uploadCsd({ rfc, certificateBase64, privateKeyBase64, privateKeyPassword: password });
      setUploadSuccess(true);
      setTick((t) => t + 1);
      return result;
    } catch (err) {
      setUploadError(err as Error);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, []);

  return { status, isLoading, statusError, isUploading, uploadError, uploadSuccess, clearUploadError, refreshStatus, upload };
}
