import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  try {
    const campaign = await prisma.campaign.findFirst();
    if (!campaign) {
      console.log('No campaigns found.');
      return;
    }
    console.log('Using Campaign:', campaign.id);
    
    const candidate = await prisma.candidate.create({
      data: {
        name: 'Auto-Test',
        email: 'auto@test.com',
        campaignId: campaign.id,
        interviewToken: 'token-' + Date.now(),
        tokenExpiry: new Date(Date.now() + 3600000)
      }
    });
    console.log('SUCCESS! Candidate ID:', candidate.id);
    console.log('Interview Token:', candidate.interviewToken);
  } catch (e) {
    console.error('FAILED:', e.message);
  } finally {
    await prisma.();
  }
}
run();
