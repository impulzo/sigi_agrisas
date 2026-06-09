"use client";

import { useState, useCallback } from "react";

const STORAGE_KEY = "pos.branchId";

export function useSelectedBranch(allowedBranchIds: string[] | null) {
  const [branchId, setBranchIdState] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return sessionStorage.getItem(STORAGE_KEY) ?? "";
  });

  const setBranchId = useCallback(
    (id: string) => {
      // When allowedBranchIds is null, admin bypass is active — allow any
      if (allowedBranchIds !== null && !allowedBranchIds.includes(id)) return;
      sessionStorage.setItem(STORAGE_KEY, id);
      setBranchIdState(id);
    },
    [allowedBranchIds]
  );

  return { branchId, setBranchId };
}
