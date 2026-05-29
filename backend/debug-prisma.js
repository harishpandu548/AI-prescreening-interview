import { execSync } from 'child_process';

try {
  console.log('Running npx prisma generate...');
  const output = execSync('npx prisma generate', { 
    stdio: 'pipe',
    env: { ...process.env, DEBUG: '*' }
  });
  console.log('Output:', output.toString());
} catch (error) {
  console.error('Error Status:', error.status);
  console.error('Error Stdout:', error.stdout?.toString());
  console.error('Error Stderr:', error.stderr?.toString());
}
