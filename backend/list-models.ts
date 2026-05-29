import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function listAll() {
  try {
    const models = await genAI.listModels();
    let output = "Available Models:\n";
    for (const m of models) {
      output += `- Name: ${m.name}\n  Display: ${m.displayName}\n  Description: ${m.description}\n\n`;
    }
    fs.writeFileSync('available_models.txt', output);
    console.log("Model list written to available_models.txt");
  } catch (e: any) {
    console.error("List failed:", e);
    fs.writeFileSync('available_models_error.txt', e.message);
  }
}

listAll();
