const { PrismaClient } = require('@prisma/client');
const { AuthService } = require('./src/services/auth.service.js');
const prisma = new PrismaClient();
const http = require('http');

async function testStatsRoute() {
  const user = await prisma.user.findFirst();
  console.log('Found user:', user.email, 'Role:', user.role);
  
  const token = AuthService.generateAccessToken({ id: user.id, email: user.email, role: user.role });
  console.log('Generated token');
  
  const res = await fetch('http://localhost:5000/api/campaigns/stats', {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  
  console.log('STATUS:', res.status);
  console.log('BODY:', await res.text());
}
testStatsRoute();
