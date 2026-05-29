import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function probe() {
  const modelName = "gemini-2.0-flash-lite";
  console.log(`Testing: ${modelName}`);
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent("Hello, are you ready?");
    console.log(`SUCCESS [${modelName}]: ${result.response.text()}`);
  } catch (e: any) {
    console.error(`FAILED [${modelName}]: ${e.message}`);
    if (e.message.includes("404")) {
      console.log("Tip: Try adding 'models/' prefix or check API key permissions.");
    }
  }
}

probe();
