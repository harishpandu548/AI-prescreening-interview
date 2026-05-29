const http = require('http');
fetch('http://localhost:5000/api/interviews/validate/0d472735-f78a-4e5f-ae3a-5bab899c1c14')
  .then(res => res.json())
  .then(candidate => {
    const FormData = require('form-data');
    const fs = require('fs');
    fs.writeFileSync('test.pdf', '%PDF-1.4 test');
    const form = new FormData();
    form.append('candidateId', candidate.id);
    form.append('resume', fs.createReadStream('test.pdf'));
    
    fetch('http://localhost:5000/api/interviews/resume', {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    })
    .then(async res => {
      console.log('STATUS:', res.status);
      console.log('BODY:', await res.text());
    })
    .catch(console.error);
  });
