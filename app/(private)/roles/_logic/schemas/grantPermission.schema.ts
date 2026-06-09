import { z } from "zod";

export const grantPermissionSchema = z.object({
  permissionKey: z.string().regex(/^[a-z][a-z0-9_]{0,31}:[a-z][a-z0-9_]{0,31}$/),
});

export type GrantPermissionInput = z.infer<typeof grantPermissionSchema>;
