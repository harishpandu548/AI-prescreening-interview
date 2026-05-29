import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function test() {
  try {
    console.log('Testing gemini-pro...');
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent('Hi');
    console.log('Gemini Pro Success:', result.response.text());
  } catch (e) {
    console.log('Gemini Pro Failed:', e.message);
  }
}
test();
