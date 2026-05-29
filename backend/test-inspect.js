const fs = require('fs');
const buffer = fs.readFileSync('uploads/resume-1772688406754-149597660.pdf');
console.log('Buffer length:', buffer.length);
console.log('First 10 bytes:', buffer.slice(0, 10).toString());
