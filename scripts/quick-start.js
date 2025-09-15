#!/usr/bin/env node

/**
 * Quick Start Script for NodeWatch
 * Minimal script that just starts the essential services
 */

const { spawn, exec } = require('child_process');

console.log('🚀 Quick Starting NodeWatch...\n');

// Start Redis if not running
console.log('📊 Starting Redis...');
exec('docker run -d --name nodewatch-redis -p 6379:6379 redis:7-alpine 2>/dev/null || echo "Redis already running"', (error, stdout, stderr) => {
  if (stdout.includes('already running')) {
    console.log('✅ Redis already running');
  } else {
    console.log('✅ Redis started');
  }
  
  // Start Convex
  console.log('🗄️  Starting Convex...');
  const convex = spawn('npx', ['convex', 'dev'], { 
    stdio: ['ignore', 'ignore', 'ignore'],
    detached: true 
  });
  convex.unref();
  
  setTimeout(() => {
    console.log('✅ Convex started');
    
    // Start API
    console.log('📡 Starting API server...');
    const api = spawn('npm', ['run', 'dev'], { 
      stdio: ['ignore', 'ignore', 'ignore'],
      detached: true 
    });
    api.unref();
    
    setTimeout(() => {
      console.log('✅ API server started');
      
      // Start Worker
      console.log('👷 Starting worker...');
      const worker = spawn('npm', ['run', 'worker:dev'], { 
        stdio: ['ignore', 'ignore', 'ignore'],
        detached: true 
      });
      worker.unref();
      
      setTimeout(() => {
        console.log('✅ Worker started\n');
        
        console.log('🎉 NodeWatch is ready!');
        console.log('📡 API: http://localhost:3000');
        console.log('🔧 Admin: http://localhost:3000/admin');
        console.log('👤 Login: admin / nodewatch-admin-2024\n');
        console.log('💡 Run "npm run dev:stop" to stop all services');
        
        process.exit(0);
      }, 2000);
    }, 3000);
  }, 2000);
});