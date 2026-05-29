import { createRequire } from 'module';
const require = createRequire(import.meta.url);
try {
    const pdfImport = require('pdf-parse');
    console.log('pdfImport type:', typeof pdfImport);
    console.log('pdfImport keys:', Object.keys(pdfImport));
    if (pdfImport.default) {
        console.log('pdfImport.default type:', typeof pdfImport.default);
    }
} catch (e) {
    console.error('Failed to require pdf-parse:', e);
}
