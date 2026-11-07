---
tags: [qa-verify]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Bash, Skill]
---

Metí un componente nuevo para acciones rápidas en la tabla de gastos. Haz QA de esto antes de que abra el PR:

```diff
diff --git a/app/(private)/expenses/_blocks/ExpenseQuickActions.tsx b/app/(private)/expenses/_blocks/ExpenseQuickActions.tsx
new file mode 100644
--- /dev/null
+++ b/app/(private)/expenses/_blocks/ExpenseQuickActions.tsx
@@ -0,0 +1,38 @@
+"use client";
+
+import { useState } from "react";
+
+interface ExpenseQuickActionsProps {
+  expenseId: string;
+  isActive: boolean;
+  onDone: () => void;
+}
+
+export function ExpenseQuickActions({ expenseId, isActive, onDone }: ExpenseQuickActionsProps) {
+  const [loading, setLoading] = useState(false);
+
+  async function handleToggle() {
+    setLoading(true);
+    const token = sessionStorage.getItem("accessToken");
+    await fetch(`/api/v1/admin/expenses/${expenseId}`, {
+      method: "PATCH",
+      headers: {
+        "Content-Type": "application/json",
+        Authorization: `Bearer ${token}`,
+      },
+      body: JSON.stringify({ isActive: !isActive }),
+    });
+    setLoading(false);
+    onDone();
+  }
+
+  return (
+    <div className="flex gap-2 rounded-3xl p-2" style={{ backgroundColor: "#4CAF50" }}>
+      <button
+        type="button"
+        onClick={handleToggle}
+        disabled={loading}
+        className="text-xs font-semibold text-white"
+      >
+        {isActive ? "Desactivar" : "Activar"}
+      </button>
+    </div>
+  );
+}
```

Se consume desde `ExpensesTable.tsx` agregando una columna de acciones que renderiza `<ExpenseQuickActions />` por fila.
