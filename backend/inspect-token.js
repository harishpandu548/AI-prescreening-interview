const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const c = await prisma.candidate.findMany({ orderBy: { createdAt: 'desc' }, take: 1 });
  console.log(JSON.stringify(c, null, 2));
  process.exit(0);
}
run();
