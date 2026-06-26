"use client";

import { useState } from "react";
import { logoutClient } from "../../../../_lib/logout";

export function useLogout() {
  const [isLoading, setIsLoading] = useState(false);

  const logout = async () => {
    if (isLoading) return;
    setIsLoading(true);
    await logoutClient("manual");
    // logoutClient redirects — setIsLoading(false) unreachable in real flow but kept for tests
    setIsLoading(false);
  };

  return { logout, isLoading };
}
