import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

async function test() {
  try {
    console.log('Testing Login...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@example.com',
      password: 'admin123'
    });
    const token = loginRes.data.accessToken;
    console.log('Login Success! Token obtained.');

    console.log('Testing Campaign Creation...');
    const campaignRes = await axios.post(`${BASE_URL}/campaigns`, {
      title: 'Fullstack Developer',
      requiredSkills: ['React', 'Node.js', 'PostgreSQL'],
      difficulty: 'INTERMEDIATE',
      questionCount: 3,
      timePerQuestion: 120
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Campaign Creation Success! Campaign ID:', campaignRes.data.id);

    console.log('Everything is working perfectly!');
  } catch (error) {
    console.error('Test Failed:', error.response?.data || error.message);
  }
}

test();
