const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function listModels() {
  try {
    const result = await genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }).generateContent('test');
    console.log('Success with gemini-1.5-flash');
  } catch (e) {
    console.log('Error with gemini-1.5-flash:', e.message);
  }
}
listModels();
