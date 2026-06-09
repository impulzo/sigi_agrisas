import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import * as fs from "fs";
import * as path from "path";

// Load .env.local so Prisma can find DATABASE_URL outside of Next.js
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

const prisma = new PrismaClient();

const E2E_USERS: Array<{ email: string; name: string; role: string | null }> = [
  { email: "e2e-admin@agrisas.test", name: "E2E Admin", role: "admin" },
  { email: "e2e-operator@agrisas.test", name: "E2E Operator", role: "operator" },
  { email: "e2e-viewer@agrisas.test", name: "E2E Viewer", role: "viewer" },
  { email: "e2e-noroles@agrisas.test", name: "E2E No Roles", role: null },
];

const PASSWORD = "E2eTest1234!";

async function globalSetup() {
  const hash = await bcrypt.hash(PASSWORD, 10);

  for (const u of E2E_USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        name: u.name,
        passwordHash: hash,
      },
    });

    if (u.role) {
      const role = await prisma.role.findUnique({ where: { name: u.role } });
      if (!role) throw new Error(`Role ${u.role} not found — run npm run seed first`);
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        update: {},
        create: { userId: user.id, roleId: role.id },
      });
    }
  }

  console.log("[E2E setup] Test users ready:", E2E_USERS.map((u) => u.email).join(", "));
  await prisma.$disconnect();
}

export default globalSetup;
export { PASSWORD, E2E_USERS };
