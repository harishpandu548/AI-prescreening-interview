import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('--- GLOBAL RESET STARTED ---');

  // Order matters for foreign keys (child to parent)
  console.log('Purging database records...');
  
  await prisma.antiCheatLog.deleteMany({});
  await prisma.answer.deleteMany({});
  await prisma.question.deleteMany({});
  await prisma.interviewSession.deleteMany({});
  await prisma.resume.deleteMany({});
  await prisma.candidate.deleteMany({});
  await prisma.campaign.deleteMany({});
  
  // Note: we are NOT deleting the 'User' table so the user can remain logged in.

  console.log('Clearing uploads folder...');
  // process.cwd() should be the backend root when running from terminal
  const uploadsDir = 'uploads'; 
  if (fs.existsSync(uploadsDir)) {
    const files = fs.readdirSync(uploadsDir);
    for (const file of files) {
      const filePath = path.join(uploadsDir, file);
      if (fs.lstatSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
      }
    }
  }

  console.log('--- GLOBAL RESET COMPLETED SUCCESSFULLY ---');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
