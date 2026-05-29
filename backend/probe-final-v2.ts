import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function probe() {
  const models = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-2.0-flash-lite-preview-02-05",
    "gemini-1.0-pro"
  ];

  console.log("--- Model Probe Results ---");
  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("test");
      console.log(`[PASS] ${modelName}`);
    } catch (e: any) {
      if (e.message.includes("404")) {
        console.log(`[404]  ${modelName} (Model not found)`);
      } else if (e.message.includes("429")) {
        console.log(`[429]  ${modelName} (Quota exceeded/Limit 0)`);
      } else {
        console.log(`[ERR]  ${modelName}: ${e.message.substring(0, 50)}...`);
      }
    }
  }
}
probe();
