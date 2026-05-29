const http = require('http');

async function run() {
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@aiprescreening.com', password: 'password123' })
  });
  const loginData = await loginRes.json();
  const token = loginData.accessToken;
  console.log('Login token:', token.substring(0, 30) + '...');

  const statsRes = await fetch('http://localhost:5000/api/campaigns/stats', {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  console.log('Stats status:', statsRes.status);
  const text = await statsRes.text();
  console.log('Body:', text);
}
run();
