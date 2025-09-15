#!/usr/bin/env node

/**
 * Simple NodeWatch Development Launcher
 * Reliable cross-platform script with better error handling
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');

console.log('🚀 Starting NodeWatch Development Environment\n');

async function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`📝 Running: ${command} ${args.join(' ')}`);
    
    const process = spawn(command, args, {
      stdio: options.silent ? 'ignore' : 'inherit',
      ...options
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
    
    process.on('error', (error) => {
      reject(error);
    });
  });
}

async function checkDocker() {
  try {
    await runCommand('docker', ['--version'], { silent: true });
    
    // Check if Docker daemon is running
    await runCommand('docker', ['ps'], { silent: true });
    
    return true;
  } catch (error) {
    console.error('❌ Docker is not running or not accessible');
    console.error('💡 Please start Docker Desktop or Docker daemon');
    console.error('   On macOS: Open Docker Desktop application');
    console.error('   On Linux: sudo systemctl start docker');
    return false;
  }
}

async function startRedis() {
  console.log('📊 Starting Redis...');
  
  try {
    // Remove any existing container
    await runCommand('docker', ['rm', '-f', 'nodewatch-redis'], { silent: true });
  } catch (error) {
    // Ignore error if container doesn't exist
  }
  
  try {
    await runCommand('docker', [
      'run', '-d',
      '--name', 'nodewatch-redis',
      '-p', '6379:6379',
      'redis:7-alpine',
      'redis-server', '--appendonly', 'yes', '--maxmemory', '256mb'
    ], { silent: true });
    
    console.log('✅ Redis started successfully');
    
    // Wait a moment for Redis to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return true;
  } catch (error) {
    console.error('❌ Failed to start Redis:', error.message);
    return false;
  }
}

async function startConvex() {
  console.log('🗄️  Starting Convex...');
  
  // Create logs directory
  if (!fs.existsSync('logs')) {
    fs.mkdirSync('logs');
  }
  
  const convex = spawn('npx', ['convex', 'dev'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true
  });
  
  // Redirect output to log file
  const logStream = fs.createWriteStream('logs/convex.log', { flags: 'a' });
  convex.stdout.pipe(logStream);
  convex.stderr.pipe(logStream);
  
  convex.unref();
  
  console.log('✅ Convex started (check logs/convex.log for details)');
  
  // Wait for Convex to initialize
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  return true;
}

async function startAPI() {
  console.log('📡 Starting API server...');
  
  const api = spawn('npm', ['run', 'dev'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true
  });
  
  // Redirect output to log file
  const logStream = fs.createWriteStream('logs/api.log', { flags: 'a' });
  api.stdout.pipe(logStream);
  api.stderr.pipe(logStream);
  
  api.unref();
  
  console.log('✅ API server started (check logs/api.log for details)');
  
  // Wait for API to start
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  return true;
}

async function startWorker() {
  console.log('👷 Starting analysis worker...');
  
  const worker = spawn('npm', ['run', 'worker:dev'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true
  });
  
  // Redirect output to log file
  const logStream = fs.createWriteStream('logs/worker.log', { flags: 'a' });
  worker.stdout.pipe(logStream);
  worker.stderr.pipe(logStream);
  
  worker.unref();
  
  console.log('✅ Worker started (check logs/worker.log for details)');
  
  return true;
}

async function installDependencies() {
  console.log('📦 Checking and installing dependencies...');
  
  // Always run npm install to ensure dependencies are up to date
  try {
    await runCommand('npm', ['install']);
    console.log('✅ Dependencies installed/updated successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to install dependencies:', error.message);
    return false;
  }
}

async function setupConvex() {
  console.log('🗄️  Setting up Convex...');
  
  // Check if .env.local exists with Convex config
  if (!fs.existsSync('.env.local')) {
    console.log('⚠️  No .env.local found. You may need to run: npx convex login && npx convex dev');
    console.log('   This will create your .env.local file with Convex credentials');
    return false;
  }
  
  // Check if Convex config exists in .env.local
  const envContent = fs.readFileSync('.env.local', 'utf8');
  if (!envContent.includes('CONVEX_URL') || !envContent.includes('CONVEX_DEPLOYMENT')) {
    console.log('⚠️  Convex not configured in .env.local');
    console.log('   Please run: npx convex login && npx convex dev');
    return false;
  }
  
  console.log('✅ Convex configuration found');
  return true;
}

async function buildProject() {
  console.log('🔨 Building project...');
  
  try {
    await runCommand('npm', ['run', 'build'], { silent: true });
    console.log('✅ Project built successfully');
    return true;
  } catch (error) {
    console.log('⚠️  Build failed, continuing with development mode');
    return true; // Continue anyway for development
  }
}

async function main() {
  try {
    console.log('🚀 NodeWatch Complete Setup & Launch\n');
    
    // Step 1: Check prerequisites
    console.log('1️⃣ Checking system prerequisites...');
    if (!(await checkDocker())) {
      console.log('\n💡 Alternative: Try "npm run dev:no-docker" if you have Redis installed locally');
      process.exit(1);
    }
    
    // Step 2: Install/update dependencies
    console.log('\n2️⃣ Installing dependencies...');
    if (!(await installDependencies())) {
      process.exit(1);
    }
    
    // Step 3: Setup Convex
    console.log('\n3️⃣ Checking Convex setup...');
    if (!(await setupConvex())) {
      console.log('\n🔧 To setup Convex:');
      console.log('   1. npx convex login');
      console.log('   2. npx convex dev');
      console.log('   3. Then run this script again');
      process.exit(1);
    }
    
    // Step 4: Build project (optional)
    console.log('\n4️⃣ Building project...');
    await buildProject();
    
    // Step 5: Start services
    console.log('\n5️⃣ Starting services...');
    
    if (!(await startRedis())) {
      process.exit(1);
    }
    
    await startConvex();
    await startAPI();
    await startWorker();
    
    console.log('\n🎉 NodeWatch is fully ready!');
    console.log('┌─────────────────────────────────────────┐');
    console.log('│  🌐 Web Interface: http://localhost:3000 │');
    console.log('│  🔧 Admin Dashboard: /admin              │');
    console.log('│  👤 Login: admin / nodewatch-admin-2024  │');
    console.log('└─────────────────────────────────────────┘');
    console.log('\n📊 Service Status:');
    console.log('   ✅ Redis (Docker container)');
    console.log('   ✅ Convex (Database)');
    console.log('   ✅ API Server (Port 3000)');
    console.log('   ✅ Analysis Worker');
    console.log('\n📝 Logs: logs/ directory');
    console.log('🛑 Stop: npm run dev:stop');
    console.log('📊 Monitor: tail -f logs/api.log');
    
  } catch (error) {
    console.error('❌ Failed to start NodeWatch:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   • Check Docker is running: docker ps');
    console.log('   • Check system: npm run dev:check');
    console.log('   • Try alternative: npm run dev:no-docker');
    process.exit(1);
  }
}

main();