"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useAuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    const token = sessionStorage.getItem("accessToken");
    if (token) {
      router.replace("/dashboard");
    }
  }, [router]);
}
