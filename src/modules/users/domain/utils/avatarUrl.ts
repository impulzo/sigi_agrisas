import { createHash } from "crypto";

export function resolveAvatarUrl(email: string, stored: string | null): string {
  if (stored !== null) return stored;
  const hash = createHash("md5").update(email.toLowerCase().trim()).digest("hex");
  return `https://www.gravatar.com/avatar/${hash}?d=mp&s=200`;
}
