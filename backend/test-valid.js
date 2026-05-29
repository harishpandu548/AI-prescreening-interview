const { PDFParse } = require('pdf-parse');
const fs = require('fs');
const buffer = fs.readFileSync('valid_dummy.pdf');
const parser = new PDFParse({ data: buffer });
parser.getText().then(res => console.log('TEXT SUCCESS')).catch(e => console.error('ERROR:', e.message));
