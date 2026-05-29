import pdf from 'pdf-parse';
import fs from 'fs';

const dataBuffer = fs.readFileSync('test.pdf');
pdf(dataBuffer).then(function(data) {
    console.log('PDF Text:', data.text);
}).catch(err => {
    console.error('PDF Parse Error:', err);
});
