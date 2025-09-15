#!/usr/bin/env node

/**
 * NodeWatch Development Launcher
 * Cross-platform script to start all development services
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

class DevLauncher {
  constructor() {
    this.processes = new Map();
    this.isShuttingDown = false;
    
    // Handle graceful shutdown
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
    process.on('exit', () => this.shutdown());
  }

  log(message, color = 'blue') {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
  }

  success(message) {
    this.log(`✅ ${message}`, 'green');
  }

  error(message) {
    this.log(`❌ ${message}`, 'red');
  }

  warning(message) {
    this.log(`⚠️  ${message}`, 'yellow');
  }

  info(message) {
    this.log(`ℹ️  ${message}`, 'cyan');
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async checkCommand(command) {
    return new Promise((resolve) => {
      exec(`which ${command}`, (error) => {
        resolve(!error);
      });
    });
  }

  async checkPort(port) {
    return new Promise((resolve) => {
      const net = require('net');
      const server = net.createServer();
      
      server.listen(port, () => {
        server.once('close', () => resolve(false));
        server.close();
      });
      
      server.on('error', () => resolve(true));
    });
  }

  async waitForService(name, checkFn, maxAttempts = 30) {
    this.info(`Waiting for ${name} to be ready...`);
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        if (await checkFn()) {
          this.success(`${name} is ready!`);
          return true;
        }
      } catch (error) {
        // Continue waiting
      }
      
      process.stdout.write('.');
      await this.sleep(1000);
    }
    
    this.error(`${name} failed to start within ${maxAttempts} seconds`);
    return false;
  }

  async startRedis() {
    this.info('Starting Redis...');
    
    // Check if Redis container already exists
    return new Promise((resolve) => {
      exec('docker ps --filter name=nodewatch-redis --format "{{.Names}}"', (error, stdout) => {
        if (stdout.trim() === 'nodewatch-redis') {
          this.success('Redis is already running');
          resolve(true);
          return;
        }
        
        // Start new Redis container
        const redisProcess = spawn('docker', [
          'run', '-d',
          '--name', 'nodewatch-redis',
          '-p', '6379:6379',
          'redis:7-alpine',
          'redis-server', '--appendonly', 'yes', '--maxmemory', '256mb'
        ]);
        
        redisProcess.on('close', async (code) => {
          if (code === 0) {
            // Wait for Redis to be ready
            const isReady = await this.waitForService('Redis', async () => {
              return new Promise((resolve) => {
                exec('docker exec nodewatch-redis redis-cli ping', (error, stdout) => {
                  resolve(stdout.trim() === 'PONG');
                });
              });
            });
            resolve(isReady);
          } else {
            this.error('Failed to start Redis');
            resolve(false);
          }
        });
      });
    });
  }

  async startConvex() {
    this.info('Starting Convex...');
    
    // Create logs directory
    if (!fs.existsSync('logs')) {
      fs.mkdirSync('logs');
    }
    
    const logFile = fs.createWriteStream('logs/convex.log', { flags: 'a' });
    
    const convexProcess = spawn('npx', ['convex', 'dev'], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    convexProcess.stdout.pipe(logFile);
    convexProcess.stderr.pipe(logFile);
    
    this.processes.set('convex', convexProcess);
    
    // Wait for Convex to be ready
    const isReady = await this.waitForService('Convex', async () => {
      return new Promise((resolve) => {
        fs.readFile('logs/convex.log', 'utf8', (err, data) => {
          if (err) resolve(false);
          resolve(data.includes('Convex functions ready') || data.includes('https://'));
        });
      });
    });
    
    return isReady;
  }

  async startAPI() {
    this.info('Starting API server...');
    
    if (!fs.existsSync('logs')) {
      fs.mkdirSync('logs');
    }
    
    const logFile = fs.createWriteStream('logs/api.log', { flags: 'a' });
    
    const apiProcess = spawn('npm', ['run', 'dev'], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    apiProcess.stdout.pipe(logFile);
    apiProcess.stderr.pipe(logFile);
    
    this.processes.set('api', apiProcess);
    
    // Wait for API to be ready
    const isReady = await this.waitForService('API server', async () => {
      return new Promise((resolve) => {
        const http = require('http');
        const req = http.get('http://localhost:3000/health', (res) => {
          resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(1000, () => {
          req.destroy();
          resolve(false);
        });
      });
    });
    
    return isReady;
  }

  async startWorker() {
    this.info('Starting analysis worker...');
    
    if (!fs.existsSync('logs')) {
      fs.mkdirSync('logs');
    }
    
    const logFile = fs.createWriteStream('logs/worker.log', { flags: 'a' });
    
    const workerProcess = spawn('npm', ['run', 'worker:dev'], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    workerProcess.stdout.pipe(logFile);
    workerProcess.stderr.pipe(logFile);
    
    this.processes.set('worker', workerProcess);
    
    // Give worker a moment to start
    await this.sleep(3000);
    this.success('Worker started');
    
    return true;
  }

  async checkPrerequisites() {
    this.info('Checking prerequisites...');
    
    const commands = ['node', 'npm', 'docker', 'npx'];
    
    for (const cmd of commands) {
      if (!(await this.checkCommand(cmd))) {
        this.error(`${cmd} is not installed or not in PATH`);
        return false;
      }
    }
    
    // Check ports
    if (await this.checkPort(3000)) {
      this.error('Port 3000 is already in use');
      return false;
    }
    
    this.success('All prerequisites found');
    return true;
  }

  async installDependencies() {
    if (!fs.existsSync('node_modules')) {
      this.info('Installing dependencies...');
      
      return new Promise((resolve) => {
        const npmProcess = spawn('npm', ['install'], { stdio: 'inherit' });
        npmProcess.on('close', (code) => {
          if (code === 0) {
            this.success('Dependencies installed');
            resolve(true);
          } else {
            this.error('Failed to install dependencies');
            resolve(false);
          }
        });
      });
    }
    return true;
  }

  async start() {
    console.log(`${colors.green}🚀 Starting NodeWatch Development Environment${colors.reset}\n`);
    
    // Check prerequisites
    if (!(await this.checkPrerequisites())) {
      process.exit(1);
    }
    
    // Install dependencies
    if (!(await this.installDependencies())) {
      process.exit(1);
    }
    
    // Start services in order
    if (!(await this.startRedis())) {
      process.exit(1);
    }
    
    if (!(await this.startConvex())) {
      process.exit(1);
    }
    
    if (!(await this.startAPI())) {
      process.exit(1);
    }
    
    if (!(await this.startWorker())) {
      process.exit(1);
    }
    
    // Success message
    console.log(`\n${colors.green}🎉 All services started successfully!${colors.reset}\n`);
    
    this.info('Services running:');
    console.log('  📡 API Server:      http://localhost:3000');
    console.log('  🔧 Admin Dashboard: http://localhost:3000/admin');
    console.log('  📊 Redis:           localhost:6379');
    console.log('  🗄️  Convex:          Check logs/convex.log for URL\n');
    
    this.info('Admin Dashboard Login:');
    console.log('  👤 Username: admin');
    console.log('  🔑 Password: nodewatch-admin-2024\n');
    
    this.info('Logs available in:');
    console.log('  📝 API Server:      logs/api.log');
    console.log('  👷 Worker:          logs/worker.log');
    console.log('  🗄️  Convex:          logs/convex.log\n');
    
    this.warning('Press Ctrl+C to stop all services\n');
    
    // Keep process alive
    this.followLogs();
  }

  followLogs() {
    this.info('Live API server logs (Ctrl+C to stop):');
    console.log('----------------------------------------');
    
    if (fs.existsSync('logs/api.log')) {
      const tail = spawn('tail', ['-f', 'logs/api.log'], { stdio: 'inherit' });
      this.processes.set('tail', tail);
    }
  }

  shutdown() {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;
    
    this.warning('\nShutting down services...');
    
    // Stop all processes
    for (const [name, process] of this.processes) {
      this.info(`Stopping ${name}...`);
      process.kill('SIGTERM');
    }
    
    // Stop Redis container
    exec('docker stop nodewatch-redis && docker rm nodewatch-redis', () => {
      this.success('Redis stopped');
    });
    
    setTimeout(() => {
      this.success('All services stopped');
      process.exit(0);
    }, 2000);
  }
}

// Start the launcher
const launcher = new DevLauncher();
launcher.start().catch((error) => {
  console.error('Failed to start development environment:', error);
  process.exit(1);
});