import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function probe() {
  const models = [
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash-lite",
    "gemini-flash-latest",
    "gemini-2.0-flash"
  ];

  console.log("--- New Key Model Probe ---");
  for (const m of models) {
    try {
      console.log(`Testing: ${m}`);
      const model = genAI.getGenerativeModel({ model: m });
      const result = await model.generateContent("Ready to test?");
      console.log(`[PASS] ${m}: ${result.response.text().trim().substring(0, 50)}...`);
      // If we find a winner, we can potentially stop.
    } catch (e: any) {
      console.log(`[FAIL] ${m}: ${e.message.substring(0, 100)}`);
    }
  }
}

probe();
