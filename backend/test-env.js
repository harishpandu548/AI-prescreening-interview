import dotenv from 'dotenv';
dotenv.config();
console.log('DATABASE_URL starts with:', process.env.DATABASE_URL?.substring(0, 20));
console.log('GEMINI_API_KEY length:', process.env.GEMINI_API_KEY?.length);
