---
tags: [qa-verify]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Bash, Skill]
---

Oye, ya tengo listo en mi branch local (sin commitear todavía) el endpoint nuevo para subir documentos de vehículos. Dame un QA antes de abrir el PR contra develop. Aquí está el diff completo:

```diff
diff --git a/app/api/v1/admin/vehicles/[id]/documents/route.ts b/app/api/v1/admin/vehicles/[id]/documents/route.ts
new file mode 100644
--- /dev/null
+++ b/app/api/v1/admin/vehicles/[id]/documents/route.ts
@@ -0,0 +1,33 @@
+import { NextRequest, NextResponse } from "next/server";
+import { prisma } from "@/shared/infrastructure/prisma/client";
+
+export async function POST(
+  req: NextRequest,
+  { params }: { params: { id: string } }
+) {
+  const formData = await req.formData();
+  const file = formData.get("file") as File | null;
+  const label = formData.get("label") as string | null;
+
+  if (!file) {
+    return NextResponse.json({ error: "file is required" }, { status: 400 });
+  }
+
+  const vehicle = await prisma.vehicle.findUnique({ where: { id: params.id } });
+  if (!vehicle) {
+    return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
+  }
+
+  const buffer = Buffer.from(await file.arrayBuffer());
+  const path = `vehicle-documents/${params.id}/${file.name}`;
+
+  const { error: uploadError } = await (
+    await import("@/shared/infrastructure/supabase/storageClient")
+  ).supabaseStorage.storage.from("vehicle-documents").upload(path, buffer, {
+    contentType: file.type,
+  });
+  if (uploadError) {
+    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
+  }
+
+  const doc = await prisma.vehicleDocument.create({
+    data: { vehicleId: params.id, label: label ?? file.name, storagePath: path },
+  });
+
+  return NextResponse.json({ id: doc.id, label: doc.label, storagePath: doc.storagePath }, { status: 201 });
+}
```
