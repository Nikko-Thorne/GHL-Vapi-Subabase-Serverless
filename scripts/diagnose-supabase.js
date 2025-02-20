import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

function runCommand(command) {
  try {
    return { 
      success: true, 
      output: execSync(command, { encoding: 'utf8' }) 
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.message 
    };
  }
}

async function diagnoseSupabase() {
  // Potential Issue 1: Node.js Version Compatibility
  console.log('\n1. Checking Node.js environment:');
  console.log('Node version:', process.version);
  console.log('NPM version:', runCommand('npm --version').output?.trim());

  // Potential Issue 2: Package Installation Status
  console.log('\n2. Checking Supabase package installation:');
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    console.log('Supabase in package.json:', {
      dependencies: packageJson.dependencies?.supabase,
      devDependencies: packageJson.devDependencies?.supabase
    });
  } catch (error) {
    console.log('Error reading package.json:', error.message);
  }

  // Potential Issue 3: Global vs Local Installation
  console.log('\n3. Checking global Supabase installation:');
  const globalResult = runCommand('npm list -g supabase');
  console.log('Global installation:', globalResult.success ? 'Found' : 'Not found');

  // Potential Issue 4: PATH Environment
  console.log('\n4. Checking PATH environment:');
  console.log('PATH entries:', process.env.PATH?.split(path.delimiter));
  console.log('npm bin location:', runCommand('npm bin').output?.trim());

  // Potential Issue 5: Permissions
  console.log('\n5. Checking npm cache and prefix permissions:');
  const npmConfig = runCommand('npm config list');
  console.log('NPM configuration:', npmConfig.output?.trim());

  // Potential Issue 6: Network Connectivity
  console.log('\n6. Checking network connectivity to npm:');
  const pingNpm = runCommand('npm ping');
  console.log('NPM registry accessible:', pingNpm.success);

  // Potential Issue 7: Conflicting Installations
  console.log('\n7. Checking for conflicting installations:');
  const nodeModules = path.join(process.cwd(), 'node_modules');
  try {
    if (fs.existsSync(nodeModules)) {
      const supabasePaths = runCommand(`find ${nodeModules} -name "supabase"`);
      console.log('Supabase installations found:', supabasePaths.output?.trim());
    } else {
      console.log('node_modules directory not found');
    }
  } catch (error) {
    console.log('Error checking node_modules:', error.message);
  }
}

// Run diagnostics
diagnoseSupabase().catch(console.error);
