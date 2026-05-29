import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function probe() {
  const modelsToTest = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-1.5-pro",
    "gemini-2.0-flash-exp",
    "gemini-2.0-flash-lite",
    "gemini-pro"
  ];

  console.log("Starting model quota probe...");
  for (const modelName of modelsToTest) {
    try {
      console.log(`Testing: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("test");
      console.log(`  SUCCESS [${modelName}]`);
      process.exit(0); // Exit on first success
    } catch (e: any) {
      if (e.message.includes("404")) {
        console.log(`  FAILED [${modelName}]: 404 Not Found (Invalid Identifier)`);
      } else if (e.message.includes("429")) {
        console.log(`  FAILED [${modelName}]: 429 Quota Exceeded (Limit reached or disabled)`);
      } else {
        console.log(`  FAILED [${modelName}]: ${e.message}`);
      }
    }
  }
}

probe();
