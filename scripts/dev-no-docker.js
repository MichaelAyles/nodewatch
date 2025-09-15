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

async function installDependencies() {
  console.log('📦 Installing/updating dependencies...');
  
  const npm = spawn('npm', ['install'], { stdio: 'inherit' });
  return new Promise((resolve, reject) => {
    npm.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Dependencies installed successfully');
        resolve();
      } else {
        reject(new Error('npm install failed'));
      }
    });
  });
}

async function setupConvex() {
  console.log('🗄️  Checking Convex setup...');
  
  if (!fs.existsSync('.env.local')) {
    console.log('⚠️  No .env.local found. Setting up Convex...');
    console.log('   Please run: npx convex login && npx convex dev');
    return false;
  }
  
  const envContent = fs.readFileSync('.env.local', 'utf8');
  if (!envContent.includes('CONVEX_URL')) {
    console.log('⚠️  Convex not configured. Please run: npx convex dev');
    return false;
  }
  
  console.log('✅ Convex configuration found');
  return true;
}

async function main() {
  try {
    console.log('🚀 NodeWatch Complete Setup (No Docker)\n');
    
    // Step 1: Check Redis
    console.log('1️⃣ Checking Redis...');
    if (!(await checkRedis())) {
      console.log('\n🐳 Alternative options:');
      console.log('   • Install Redis: brew install redis && brew services start redis');
      console.log('   • Use Docker: npm run dev:all (requires Docker running)');
      process.exit(1);
    }
    
    // Step 2: Install dependencies
    console.log('\n2️⃣ Installing dependencies...');
    await installDependencies();
    
    // Step 3: Setup Convex
    console.log('\n3️⃣ Checking Convex setup...');
    if (!(await setupConvex())) {
      console.log('\n🔧 To setup Convex:');
      console.log('   1. npx convex login');
      console.log('   2. npx convex dev');
      console.log('   3. Then run this script again');
      process.exit(1);
    }
    
    // Step 4: Start services
    console.log('\n4️⃣ Starting services...');
    await startService('Convex', 'npx', ['convex', 'dev'], 'convex.log');
    await startService('API Server', 'npm', ['run', 'dev'], 'api.log');
    await startService('Analysis Worker', 'npm', ['run', 'worker:dev'], 'worker.log');
    
    console.log('\n🎉 NodeWatch is fully ready!');
    console.log('┌─────────────────────────────────────────┐');
    console.log('│  🌐 Web Interface: http://localhost:3000 │');
    console.log('│  🔧 Admin Dashboard: /admin              │');
    console.log('│  👤 Login: admin / nodewatch-admin-2024  │');
    console.log('└─────────────────────────────────────────┘');
    console.log('\n📊 Service Status:');
    console.log('   ✅ Redis (Local installation)');
    console.log('   ✅ Convex (Database)');
    console.log('   ✅ API Server (Port 3000)');
    console.log('   ✅ Analysis Worker');
    console.log('\n📝 Logs: logs/ directory');
    console.log('🛑 Stop: npm run dev:stop');
    console.log('📊 Monitor: tail -f logs/api.log');
    
  } catch (error) {
    console.error('❌ Failed to start NodeWatch:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   • Check Redis: redis-cli ping');
    console.log('   • Check system: npm run dev:check');
    console.log('   • Install Redis: brew install redis');
    process.exit(1);
  }
}

main();