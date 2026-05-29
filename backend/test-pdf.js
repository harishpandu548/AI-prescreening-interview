const { PDFParse } = require('pdf-parse');
const fs = require('fs');
fs.writeFileSync('test2.pdf', '%PDF-1.4 test');
const buffer = fs.readFileSync('test2.pdf');
const parser = new PDFParse({ data: buffer });
parser.getText().then(res => console.log('TEXT:', res.text)).catch(e => console.error('ERROR:', e.message));
