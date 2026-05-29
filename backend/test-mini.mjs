import { GoogleGenerativeAI } from '@google/generative-ai';
const genAI = new GoogleGenerativeAI('AIzaSyCGCsuzndpYAbbBmdfR0HkSGIHEFv-S53w');

async function test() {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent('Hi');
    console.log('Gemini Response:', result.response.text());
  } catch (e) {
    console.error('Gemini Error (gemini-1.5-flash):', e.message);
  }
}
test();
