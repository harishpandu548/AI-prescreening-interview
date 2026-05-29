import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

// The SDK doesn't always expose the version directly, but we can try to find a way 
// or just test gemini-1.5-flash again with better logging
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function probe() {
  const modelName = "gemini-1.5-flash";
  console.log(`Checking: ${modelName}`);
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent("hi");
    console.log(`PASS: ${modelName}`);
  } catch (e: any) {
    console.log(`FAIL: ${modelName} - ${e.message}`);
  }
}
probe();
