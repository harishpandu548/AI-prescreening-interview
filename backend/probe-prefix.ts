import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function probe() {
  const models = ["models/gemini-1.5-flash", "models/gemini-1.5-pro", "models/gemini-pro"];
  console.log("PREFIX PROBE START");
  for (const m of models) {
    try {
      console.log(`Checking ${m}...`);
      const model = genAI.getGenerativeModel({ model: m });
      const result = await model.generateContent("hi");
      console.log(`PASS: ${m}`);
      process.exit(0);
    } catch (e: any) {
      console.log(`FAIL: ${m} - ${e.message}`);
    }
  }
}
probe();
