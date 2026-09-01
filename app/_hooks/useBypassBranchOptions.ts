"use client";

import { useEffect, useState } from "react";
import { authFetch } from "../_lib/authFetch";

export interface BranchOption {
  id: string;
  code: string;
  name: string;
  isHeadquarters: boolean;
}

interface UseBypassBranchOptionsResult {
  branches: BranchOption[];
  selectedBranchId: string;
  setSelectedBranchId: (id: string) => void;
}

export function useBypassBranchOptions(
  isBypass: boolean | "loading",
  ownBranchId: string | null,
): UseBypassBranchOptionsResult {
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");

  useEffect(() => {
    if (isBypass !== true && ownBranchId) {
      setBranches([{ id: ownBranchId, code: "", name: "Mi sucursal", isHeadquarters: false }]);
      setSelectedBranchId(ownBranchId);
      return;
    }
    if (isBypass === true) {
      authFetch("/api/v1/admin/branches?pageSize=100&includeInactive=false")
        .then((r) => r.json())
        .then((body: { items: BranchOption[] }) => setBranches(body.items))
        .catch(() => {});
    }
  }, [isBypass, ownBranchId]);

  return { branches, selectedBranchId, setSelectedBranchId };
}
