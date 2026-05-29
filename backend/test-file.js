const { PDFParse } = require('pdf-parse');
const fs = require('fs');

async function testFile() {
  const filePath = 'uploads/resume-1772688406754-149597660.pdf';
  const dataBuffer = fs.readFileSync(filePath);
  console.log('Buffer size:', dataBuffer.length);
  
  try {
    const pdf = new PDFParse({ data: dataBuffer });
    const result = await pdf.getText();
    console.log('Success! Text length:', result.text.length);
  } catch (err) {
    console.error('Parse Error:', err.name, err.message);
  }
}
testFile();
