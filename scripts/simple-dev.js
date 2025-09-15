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

async function main() {
  try {
    // Check prerequisites
    if (!(await checkDocker())) {
      process.exit(1);
    }
    
    // Install dependencies if needed
    if (!fs.existsSync('node_modules')) {
      console.log('📦 Installing dependencies...');
      await runCommand('npm', ['install']);
    }
    
    // Start services
    if (!(await startRedis())) {
      process.exit(1);
    }
    
    await startConvex();
    await startAPI();
    await startWorker();
    
    console.log('\n🎉 NodeWatch is ready!');
    console.log('📡 Web Interface: http://localhost:3000');
    console.log('🔧 Admin Dashboard: http://localhost:3000/admin');
    console.log('👤 Admin Login: admin / nodewatch-admin-2024');
    console.log('\n📝 Logs are available in the logs/ directory');
    console.log('🛑 Run "npm run dev:stop" to stop all services');
    
  } catch (error) {
    console.error('❌ Failed to start NodeWatch:', error.message);
    process.exit(1);
  }
}

main();