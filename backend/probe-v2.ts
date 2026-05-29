import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function probe() {
  const modelsToTest = [
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash-lite-preview-02-05",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.0-pro"
  ];

  console.log("Starting model probe...");
  for (const modelName of modelsToTest) {
    try {
      console.log(`Testing: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Hello");
      console.log(`SUCCESS [${modelName}]: ${result.response.text().substring(0, 30)}...`);
    } catch (e: any) {
      console.error(`FAILED [${modelName}]: ${e.message}`);
    }
  }
}

probe();
