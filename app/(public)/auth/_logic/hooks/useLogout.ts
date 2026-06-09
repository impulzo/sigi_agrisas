"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { logout as logoutService } from "../services/logout";

export function useLogout() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const logout = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await logoutService();
    } catch {
      // network error: redirect anyway since sessionStorage is already cleared
    }
    router.push("/auth/login");
    if (mountedRef.current) setIsLoading(false);
  };

  return { logout, isLoading };
}
