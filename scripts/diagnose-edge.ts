import { execSync } from 'child_process';

async function diagnoseEdgeFunction() {
  console.log('\n=== Edge Function Deployment Diagnostic ===\n');

  // 1. Check Supabase CLI Installation
  console.log('1. Checking Supabase CLI:');
  try {
    const cliVersion = execSync('npx supabase-cli --version', { encoding: 'utf8' });
    console.log('✓ Supabase CLI version:', cliVersion.trim());
  } catch (error) {
    console.error('✗ Supabase CLI not found:', error.message);
    console.log('  Try running: npm install supabase-cli');
  }

  // 2. Check Project Configuration
  console.log('\n2. Checking Project Configuration:');
  try {
    const projectInfo = execSync('npx supabase-cli projects list', { encoding: 'utf8' });
    console.log('✓ Project info:', projectInfo.trim());
  } catch (error) {
    console.error('✗ Project configuration error:', error.message);
    console.log('  Make sure you are logged in: npx supabase-cli login');
  }

  // 3. Check Edge Function Files
  console.log('\n3. Checking Edge Function Files:');
  try {
    const functionFiles = execSync('ls -la supabase/functions/calendar', { encoding: 'utf8' });
    console.log('✓ Function files found:', functionFiles.trim());
  } catch (error) {
    console.error('✗ Edge function files not found:', error.message);
  }

  // 4. Check Environment Variables
  console.log('\n4. Checking Environment Variables:');
  const requiredVars = ['VAPI_SECRET'];
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      console.log(`✓ ${varName} is set`);
    } else {
      console.error(`✗ Missing ${varName}`);
    }
  }

  // 5. Check Network Access
  console.log('\n5. Checking Network Access:');
  try {
    const ping = execSync('curl -s https://api.supabase.com/v1/health', { encoding: 'utf8' });
    console.log('✓ Supabase API is accessible');
  } catch (error) {
    console.error('✗ Network connectivity issue:', error.message);
  }
}

diagnoseEdgeFunction().catch(console.error);
