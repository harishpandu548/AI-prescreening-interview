import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function run() {
  try {
    console.log('Testing Gemini API key...');
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent('test');
    console.log('Gemini success!');
    
    console.log('Testing Database...');
    const campaign = await prisma.campaign.findFirst();
    if (!campaign) {
      console.log('No campaigns found. Please create one.');
      return;
    }
    console.log('Campaign ID:', campaign.id);
    
    const candidate = await prisma.candidate.create({
      data: {
        name: 'Test',
        email: 'test@test.com',
        campaignId: campaign.id,
        interviewToken: 'test-token-' + Date.now(),
        tokenExpiry: new Date(Date.now() + 3600000)
      }
    });
    console.log('Candidate created successfully! ID:', candidate.id);
    console.log('Interview Token:', candidate.interviewToken);
    
  } catch (e) {
    console.error('ERROR:', e);
  } finally {
    await prisma.();
  }
}
run();
