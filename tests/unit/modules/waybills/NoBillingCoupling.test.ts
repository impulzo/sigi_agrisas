import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

const WAYBILLS_MODULE_ROOT = join(__dirname, "..", "..", "..", "..", "src", "modules", "waybills");

function listFilesRecursively(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      files.push(...listFilesRecursively(fullPath));
    } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
      files.push(fullPath);
    }
  }
  return files;
}

describe("waybills module decoupling", () => {
  it("does not import from src/modules/billing/", () => {
    const files = listFilesRecursively(WAYBILLS_MODULE_ROOT);
    const offenders: string[] = [];

    for (const file of files) {
      const content = readFileSync(file, "utf-8");
      if (/from\s+["'].*modules\/billing/.test(content)) {
        offenders.push(file);
      }
    }

    expect(offenders).toEqual([]);
  });
});
