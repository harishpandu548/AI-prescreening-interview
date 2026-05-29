import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function test() {
  try {
    console.log('Testing gemini-1.5-flash...');
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent('Hi');
    console.log('Gemini 1.5 Flash Success:', result.response.text());
  } catch (e) {
    console.log('Gemini 1.5 Flash Failed:', e.message);
    
    try {
      console.log('Testing gemini-1.5-pro...');
      const modelPro = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
      const resultPro = await modelPro.generateContent('Hi');
      console.log('Gemini 1.5 Pro Success:', resultPro.response.text());
    } catch (ePro) {
      console.log('Gemini 1.5 Pro Failed:', ePro.message);
    }
  }
}
test();
