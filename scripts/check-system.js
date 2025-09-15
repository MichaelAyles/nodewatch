#!/usr/bin/env node

/**
 * NodeWatch System Check
 * Diagnoses system requirements and suggests the best setup approach
 */

const { exec } = require('child_process');

function checkCommand(command) {
  return new Promise((resolve) => {
    exec(`which ${command}`, (error) => {
      resolve(!error);
    });
  });
}

function checkDockerRunning() {
  return new Promise((resolve) => {
    exec('docker ps', (error) => {
      resolve(!error);
    });
  });
}

function checkRedisLocal() {
  return new Promise((resolve) => {
    exec('redis-cli ping', (error, stdout) => {
      resolve(!error && stdout.trim() === 'PONG');
    });
  });
}

async function main() {
  console.log('🔍 NodeWatch System Check\n');
  
  // Check Node.js
  const hasNode = await checkCommand('node');
  console.log(`${hasNode ? '✅' : '❌'} Node.js: ${hasNode ? 'Installed' : 'Missing'}`);
  
  // Check npm
  const hasNpm = await checkCommand('npm');
  console.log(`${hasNpm ? '✅' : '❌'} npm: ${hasNpm ? 'Installed' : 'Missing'}`);
  
  // Check Docker
  const hasDocker = await checkCommand('docker');
  const dockerRunning = hasDocker ? await checkDockerRunning() : false;
  console.log(`${hasDocker ? '✅' : '❌'} Docker: ${hasDocker ? 'Installed' : 'Missing'}`);
  console.log(`${dockerRunning ? '✅' : '❌'} Docker Daemon: ${dockerRunning ? 'Running' : 'Not Running'}`);
  
  // Check local Redis
  const redisLocal = await checkRedisLocal();
  console.log(`${redisLocal ? '✅' : '❌'} Local Redis: ${redisLocal ? 'Running' : 'Not Running'}`);
  
  console.log('\n🎯 Recommended Setup:\n');
  
  if (dockerRunning) {
    console.log('✨ Use Docker setup (recommended):');
    console.log('   npm run dev:all');
  } else if (redisLocal) {
    console.log('✨ Use local Redis setup:');
    console.log('   npm run dev:no-docker');
  } else if (hasDocker) {
    console.log('🐳 Start Docker first, then use Docker setup:');
    console.log('   1. Start Docker Desktop (or sudo systemctl start docker on Linux)');
    console.log('   2. npm run dev:all');
    console.log('');
    console.log('📦 Or install local Redis:');
    console.log('   macOS: brew install redis && brew services start redis');
    console.log('   Ubuntu: sudo apt install redis-server && sudo systemctl start redis');
    console.log('   Then: npm run dev:no-docker');
  } else {
    console.log('📦 Install Docker or Redis first:');
    console.log('   Docker: https://docs.docker.com/get-docker/');
    console.log('   Redis: brew install redis (macOS) or apt install redis-server (Ubuntu)');
  }
  
  console.log('\n📚 All options:');
  console.log('   npm run dev:all        # Docker setup (needs Docker running)');
  console.log('   npm run dev:no-docker  # Local Redis setup (needs Redis installed)');
  console.log('   npm run dev:stop       # Stop all services');
}

main();