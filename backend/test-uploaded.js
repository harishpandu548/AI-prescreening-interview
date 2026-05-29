const { PDFParse } = require('pdf-parse');
const fs = require('fs');
async function test() {
  try {
    const buffer = fs.readFileSync('uploads/resume-1772688406754-149597660.pdf');
    const parser = new PDFParse({ data: buffer });
    const res = await parser.getText();
    console.log('TEXT SUCCESS:', res.text.substring(0, 50));
  } catch (e) {
    console.error('ERROR:', e.message);
  }
}
test();
