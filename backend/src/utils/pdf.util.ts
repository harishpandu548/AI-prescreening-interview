import { PDFParse } from 'pdf-parse';
import fs from 'fs/promises';
import { logger } from '../index.js';

export async function extractTextFromPDF(filePath: string): Promise<string> {
    const dataBuffer = await fs.readFile(filePath);
    const parser = new PDFParse({ data: dataBuffer });
    try {
        const result = await parser.getText();
        if (!result || !result.text) {
             throw new Error('PDF extraction returned empty result');
        }
        return result.text;
    } catch (error) {
        logger.error(`Error parsing PDF at ${filePath}:`, error);
        throw new Error('Failed to extract text from PDF');
    } finally {
        await parser.destroy();
    }
}
