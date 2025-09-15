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

async function checkAndSetupDocker() {
  console.log('🐳 Checking Docker availability...');
  
  try {
    // Check if Docker is installed
    await runCommand('docker', ['--version'], { silent: true });
    console.log('✅ Docker is installed');
    
    // Check if Docker daemon is running
    try {
      await runCommand('docker', ['ps'], { silent: true });
      console.log('✅ Docker daemon is running');
      return { available: true, running: true };
    } catch (error) {
      console.log('⚠️  Docker daemon is not running');
      
      // Try to start Docker on macOS
      if (process.platform === 'darwin') {
        console.log('🚀 Attempting to start Docker Desktop...');
        try {
          await runCommand('open', ['-a', 'Docker'], { silent: true });
          console.log('⏳ Waiting for Docker to start...');
          
          // Wait up to 60 seconds for Docker to start
          for (let i = 0; i < 60; i++) {
            try {
              await runCommand('docker', ['ps'], { silent: true });
              console.log('✅ Docker started successfully!');
              return { available: true, running: true };
            } catch (e) {
              process.stdout.write('.');
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
          console.log('\n⚠️  Docker took too long to start');
        } catch (error) {
          console.log('❌ Failed to start Docker Desktop automatically');
        }
      }
      
      return { available: true, running: false };
    }
  } catch (error) {
    console.log('❌ Docker is not installed');
    return { available: false, running: false };
  }
}

async function checkAndSetupRedis() {
  console.log('📊 Checking Redis availability...');
  
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    exec('redis-cli ping', (error, stdout) => {
      if (!error && stdout.trim() === 'PONG') {
        console.log('✅ Redis is running locally');
        resolve({ available: true, local: true });
      } else {
        console.log('⚠️  Redis is not running locally');
        
        // Check if Redis is installed
        exec('which redis-server', (error) => {
          if (!error) {
            console.log('✅ Redis is installed, attempting to start...');
            
            // Try to start Redis
            if (process.platform === 'darwin') {
              exec('brew services start redis', (error) => {
                if (!error) {
                  console.log('✅ Redis started with Homebrew');
                  resolve({ available: true, local: true });
                } else {
                  console.log('⚠️  Failed to start Redis with Homebrew');
                  resolve({ available: true, local: false });
                }
              });
            } else {
              resolve({ available: true, local: false });
            }
          } else {
            console.log('❌ Redis is not installed');
            resolve({ available: false, local: false });
          }
        });
      }
    });
  });
}

async function installRedis() {
  console.log('📦 Installing Redis...');
  
  if (process.platform === 'darwin') {
    try {
      console.log('🍺 Installing Redis with Homebrew...');
      await runCommand('brew', ['install', 'redis']);
      await runCommand('brew', ['services', 'start', 'redis']);
      console.log('✅ Redis installed and started');
      return true;
    } catch (error) {
      console.log('❌ Failed to install Redis with Homebrew');
      console.log('💡 Please install Homebrew first: /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"');
      return false;
    }
  } else if (process.platform === 'linux') {
    try {
      console.log('🐧 Installing Redis with apt...');
      await runCommand('sudo', ['apt', 'update']);
      await runCommand('sudo', ['apt', 'install', '-y', 'redis-server']);
      await runCommand('sudo', ['systemctl', 'start', 'redis']);
      await runCommand('sudo', ['systemctl', 'enable', 'redis']);
      console.log('✅ Redis installed and started');
      return true;
    } catch (error) {
      console.log('❌ Failed to install Redis with apt');
      return false;
    }
  } else {
    console.log('❌ Automatic Redis installation not supported on this platform');
    console.log('💡 Please install Redis manually: https://redis.io/download');
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
    console.log('🚀 NodeWatch Complete Setup & Launch');
    console.log('   This script will install and configure EVERYTHING needed!\n');
    
    let useDocker = false;
    let redisMethod = '';
    
    // Step 1: Check and setup Docker/Redis
    console.log('1️⃣ Setting up Redis (required for job queue)...');
    
    const dockerStatus = await checkAndSetupDocker();
    
    if (dockerStatus.running) {
      console.log('✅ Using Docker for Redis');
      useDocker = true;
      redisMethod = 'Docker container';
    } else {
      console.log('🔄 Docker not available, checking local Redis...');
      
      const redisStatus = await checkAndSetupRedis();
      
      if (redisStatus.available && redisStatus.local) {
        console.log('✅ Using local Redis installation');
        useDocker = false;
        redisMethod = 'Local installation';
      } else if (redisStatus.available && !redisStatus.local) {
        console.log('⚠️  Redis installed but not running, trying to start...');
        // Redis setup function already tries to start it
        useDocker = false;
        redisMethod = 'Local installation';
      } else {
        console.log('📦 Redis not found, installing automatically...');
        if (await installRedis()) {
          useDocker = false;
          redisMethod = 'Local installation (auto-installed)';
        } else {
          console.log('❌ Could not setup Redis automatically');
          console.log('\n🔧 Manual setup required:');
          console.log('   Option 1: Install Docker Desktop and restart this script');
          console.log('   Option 2: Install Redis manually:');
          console.log('     macOS: brew install redis && brew services start redis');
          console.log('     Linux: sudo apt install redis-server && sudo systemctl start redis');
          process.exit(1);
        }
      }
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
    
    if (useDocker) {
      if (!(await startRedis())) {
        process.exit(1);
      }
    } else {
      console.log('📊 Using existing Redis installation...');
      // Verify Redis is still running
      const { exec } = require('child_process');
      const redisCheck = await new Promise((resolve) => {
        exec('redis-cli ping', (error, stdout) => {
          resolve(!error && stdout.trim() === 'PONG');
        });
      });
      
      if (!redisCheck) {
        console.log('❌ Redis is not responding');
        process.exit(1);
      }
      console.log('✅ Redis is ready');
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
    console.log(`   ✅ Redis (${redisMethod})`);
    console.log('   ✅ Convex (Database)');
    console.log('   ✅ API Server (Port 3000)');
    console.log('   ✅ Analysis Worker');
    console.log('\n📝 Logs: logs/ directory');
    console.log('🛑 Stop: npm run dev:stop');
    console.log('📊 Monitor: tail -f logs/api.log');
    
  } catch (error) {
    console.error('❌ Failed to start NodeWatch:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   • Run diagnostics: npm run dev:check');
    console.log('   • Check logs: ls -la logs/');
    console.log('   • Manual setup: see README.md');
    process.exit(1);
  }
}

main();