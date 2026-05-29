const http = require('http');

async function testAuth() {
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@aiprescreening.com', password: 'password123' })
  });
  const loginData = await loginRes.json();
  const token = loginData.accessToken;
  console.log('Login token:', token.substring(0, 20) + '...');

  const statsRes = await fetch('http://localhost:5000/api/campaigns/stats', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  console.log('Stats status:', statsRes.status);
  const statsData = await statsRes.text();
  console.log('Stats data:', statsData);
}
testAuth();
