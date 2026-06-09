import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({
    include: { roles: { include: { role: true } } }
  });
  users.forEach(u => {
    const roles = u.roles.map((ur: any) => ur.role.name).join(', ');
    console.log(`${u.email} → [${roles}]`);
  });
  await prisma.$disconnect();
}
main().catch(console.error);
