"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { decodeJwtPayload } from "../_lib/jwt";
import { authFetch } from "../_lib/authFetch";

interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  branchId?: string | null;
  exp: number;
}

interface PermissionsCache {
  permissions: Set<string>;
  expiresAt: number;
  promise?: Promise<Set<string>>;
}

const CACHE_TTL_MS = 60_000;
const permissionsCache = new Map<string, PermissionsCache>();

async function fetchPermissions(userId: string): Promise<Set<string>> {
  const cached = permissionsCache.get(userId);
  if (cached && Date.now() < cached.expiresAt) return cached.permissions;

  if (cached?.promise) return cached.promise;

  const promise = authFetch(`/api/v1/admin/users/${userId}/permissions`)
    .then((res) => res.json())
    .then((body: { permissions: string[] }) => {
      const permissions = new Set(body.permissions ?? []);
      permissionsCache.set(userId, {
        permissions,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      return permissions;
    })
    .catch(() => {
      permissionsCache.delete(userId);
      return new Set<string>();
    });

  permissionsCache.set(userId, {
    permissions: new Set(),
    expiresAt: 0,
    promise,
  });

  return promise;
}

interface CurrentUser {
  userId: string;
  email: string;
  roles: string[];
  branchId: string | null;
  isLoading: boolean;
  can: (permission: string) => boolean | "loading";
  refresh: () => void;
}

export function useCurrentUser(): CurrentUser {
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [permissionsResolved, setPermissionsResolved] = useState(false);
  const permissionsRef = useRef<Set<string>>(new Set());
  const userIdRef = useRef("");

  useEffect(() => {
    const token = sessionStorage.getItem("accessToken");
    if (!token) {
      setIsLoading(false);
      return;
    }
    const payload = decodeJwtPayload<JwtPayload>(token);
    if (!payload?.sub) {
      setIsLoading(false);
      return;
    }
    setUserId(payload.sub);
    setEmail(payload.email ?? "");
    setRoles(Array.isArray(payload.roles) ? payload.roles : []);
    setBranchId(payload.branchId || null);
    userIdRef.current = payload.sub;
    setIsLoading(false);

    fetchPermissions(payload.sub).then((perms) => {
      permissionsRef.current = perms;
      setPermissionsResolved(true);
    });
  }, []);

  const can = useCallback(
    (permission: string): boolean | "loading" => {
      if (!userIdRef.current) return false;
      if (!permissionsResolved) return "loading";
      return permissionsRef.current.has(permission);
    },
    [permissionsResolved]
  );

  const refresh = useCallback(() => {
    if (!userIdRef.current) return;
    permissionsCache.delete(userIdRef.current);
    setPermissionsResolved(false);
    fetchPermissions(userIdRef.current).then((perms) => {
      permissionsRef.current = perms;
      setPermissionsResolved(true);
    });
  }, []);

  return { userId, email, roles, branchId, isLoading, can, refresh };
}
