import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- PURGE STARTED ---');
  
  const result = await prisma.candidate.deleteMany({
    where: {
      OR: [
        { name: { contains: 'Pending Parse' } },
        { email: { contains: 'pending@parse' } },
        { email: { contains: 'hhhhh@gmail.com' } } // Specific one user wants removed or tested
      ]
    }
  });

  console.log(`Successfully deleted ${result.count} broken candidates.`);
  console.log('--- PURGE COMPLETED ---');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
