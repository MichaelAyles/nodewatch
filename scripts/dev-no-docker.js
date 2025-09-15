#!/usr/bin/env node

/**
 * NodeWatch Development Launcher (No Docker Required)
 * For systems where Docker isn't available or preferred
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');

console.log('🚀 Starting NodeWatch Development Environment (No Docker)\n');

async function checkRedis() {
  return new Promise((resolve) => {
    exec('redis-cli ping', (error, stdout) => {
      if (!error && stdout.trim() === 'PONG') {
        console.log('✅ Redis is already running locally');
        resolve(true);
      } else {
        console.log('❌ Redis is not running locally');
        console.log('💡 Please install and start Redis:');
        console.log('   macOS: brew install redis && brew services start redis');
        console.log('   Ubuntu: sudo apt install redis-server && sudo systemctl start redis');
        console.log('   Or use Docker: npm run dev:redis');
        resolve(false);
      }
    });
  });
}

async function startService(name, command, args, logFile) {
  console.log(`📡 Starting ${name}...`);
  
  // Create logs directory
  if (!fs.existsSync('logs')) {
    fs.mkdirSync('logs');
  }
  
  const process = spawn(command, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true
  });
  
  // Redirect output to log file
  const logStream = fs.createWriteStream(`logs/${logFile}`, { flags: 'a' });
  process.stdout.pipe(logStream);
  process.stderr.pipe(logStream);
  
  process.unref();
  
  console.log(`✅ ${name} started (check logs/${logFile} for details)`);
  
  // Wait for service to initialize
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return true;
}

async function main() {
  try {
    // Check if Redis is available
    if (!(await checkRedis())) {
      console.log('\n🐳 Alternative: Use Docker for Redis:');
      console.log('   npm run dev:redis');
      console.log('   Then run this script again\n');
      process.exit(1);
    }
    
    // Install dependencies if needed
    if (!fs.existsSync('node_modules')) {
      console.log('📦 Installing dependencies...');
      const npm = spawn('npm', ['install'], { stdio: 'inherit' });
      await new Promise((resolve, reject) => {
        npm.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error('npm install failed'));
        });
      });
    }
    
    // Start services
    await startService('Convex', 'npx', ['convex', 'dev'], 'convex.log');
    await startService('API Server', 'npm', ['run', 'dev'], 'api.log');
    await startService('Analysis Worker', 'npm', ['run', 'worker:dev'], 'worker.log');
    
    console.log('\n🎉 NodeWatch is ready!');
    console.log('📡 Web Interface: http://localhost:3000');
    console.log('🔧 Admin Dashboard: http://localhost:3000/admin');
    console.log('👤 Admin Login: admin / nodewatch-admin-2024');
    console.log('\n📝 Logs are available in the logs/ directory');
    console.log('📊 View logs: tail -f logs/api.log');
    console.log('🛑 Stop services: npm run dev:stop');
    
  } catch (error) {
    console.error('❌ Failed to start NodeWatch:', error.message);
    process.exit(1);
  }
}

main();