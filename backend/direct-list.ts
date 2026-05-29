import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

async function listModels() {
  const key = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
  
  console.log("Fetching models with new key...");
  try {
    const response = await axios.get(url);
    const models = response.data.models;
    console.log("SUCCESS! Models found:");
    models.forEach((m: any) => {
      console.log(`- ${m.name} (${m.displayName})`);
    });
  } catch (e: any) {
    console.error("FAILED to list models:");
    if (e.response) {
      console.error(`Status: ${e.response.status}`);
      console.error(JSON.stringify(e.response.data, null, 2));
    } else {
      console.error(e.message);
    }
  }
}

listModels();
