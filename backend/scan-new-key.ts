import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function scan() {
  const models = [
    "gemini-1.5-flash-001",
    "gemini-1.5-flash-002",
    "gemini-1.5-pro-001",
    "gemini-1.5-pro-002",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite-exp",
    "gemini-1.5-flash-8b",
    "gemini-pro"
  ];

  console.log("Starting model scan with NEW key...");
  for (const modelName of models) {
    try {
      console.log(`Testing: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Say 'Ready'");
      console.log(`[PASS] ${modelName}: ${result.response.text().trim()}`);
      // If we find one that works, we can stop or keep checking. Let's stop on first success.
      return;
    } catch (e: any) {
       console.log(`[FAIL] ${modelName}: ${e.message.includes('404') ? '404' : e.message.substring(0, 100)}`);
    }
  }
}

scan();
