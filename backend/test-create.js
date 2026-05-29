const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const campaign = await prisma.campaign.findFirst();
  if (!campaign) {
    console.error('No campaign found');
    return;
  }
  
  const res = await fetch(http://localhost:5000/api/campaigns//candidates, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test Candidate', email: 'test@example.com' })
  });
  
  console.log('Status:', res.status);
  console.log('Body:', await res.text());
}
run();
