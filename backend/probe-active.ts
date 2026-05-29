import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function probe() {
  const models = ["gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-1.0-pro"];
  console.log("Model Probe Started...");
  for (const m of models) {
    try {
      console.log(`Checking ${m}...`);
      const model = genAI.getGenerativeModel({ model: m });
      const result = await model.generateContent("Hi");
      console.log(`Working: ${m}`);
      process.exit(0);
    } catch (e: any) {
      console.log(`Error ${m}: ${e.message}`);
    }
  }
}
probe();
