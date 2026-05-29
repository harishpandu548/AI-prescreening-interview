import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function probe() {
  try {
    console.log("Probing API Key...");
    // The newer SDK uses a different method to list models sometimes, or it might be restricted
    // Let's try to just generate a simple response with a common model
    const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];
    
    for (const modelName of models) {
      console.log(`Testing model: ${modelName}`);
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("test");
        console.log(`SUCCESS with ${modelName}:`, result.response.text());
        break; 
      } catch (e: any) {
        console.error(`FAILED with ${modelName}: ${e.message}`);
        if (e.message.includes("404")) {
           console.log("   -> Model not found or not available.");
        }
      }
    }
  } catch (err) {
    console.error("Probe failed:", err);
  }
}
probe();
