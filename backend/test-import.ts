import fs from 'fs';
import pdf from 'pdf-parse';

console.log('pdf type:', typeof pdf);
if (typeof pdf === 'function') {
  console.log('It is a function!');
} else if (pdf && typeof pdf.default === 'function') {
  console.log('Default is a function!');
} else {
  console.log('Keys:', Object.keys(pdf));
}
