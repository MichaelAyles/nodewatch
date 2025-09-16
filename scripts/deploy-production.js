#!/usr/bin/env node

/**
 * NodeWatch Production Deployment Script
 * 
 * Automates the deployment of NodeWatch to Vercel + Railway + Convex
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command, description) {
  log(`\n🔄 ${description}...`, 'cyan');
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: 'inherit' });
    log(`✅ ${description} completed`, 'green');
    return output;
  } catch (error) {
    log(`❌ ${description} failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

function checkPrerequisites() {
  log('\n🔍 Checking prerequisites...', 'yellow');
  
  const commands = [
    { cmd: 'vercel --version', name: 'Vercel CLI' },
    { cmd: 'railway --version', name: 'Railway CLI' },
    { cmd: 'npx convex --version', name: 'Convex CLI' }
  ];
  
  for (const { cmd, name } of commands) {
    try {
      execSync(cmd, { stdio: 'ignore' });
      log(`✅ ${name} installed`, 'green');
    } catch (error) {
      log(`❌ ${name} not found. Please install it first.`, 'red');
      process.exit(1);
    }
  }
}

function checkEnvironmentFile() {
  log('\n🔍 Checking environment configuration...', 'yellow');
  
  if (!fs.existsSync('.env.local')) {
    log('❌ .env.local not found. Please run Convex setup first.', 'red');
    log('Run: npx convex dev', 'yellow');
    process.exit(1);
  }
  
  const envContent = fs.readFileSync('.env.local', 'utf8');
  if (!envContent.includes('CONVEX_URL')) {
    log('❌ CONVEX_URL not found in .env.local', 'red');
    process.exit(1);
  }
  
  log('✅ Environment configuration looks good', 'green');
}

function deployConvex() {
  log('\n🗄️ Deploying Convex database...', 'magenta');
  exec('npx convex deploy --prod', 'Convex production deployment');
  
  // Read the updated .env.local for production URLs
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const convexUrl = envContent.match(/CONVEX_URL=(.*)/)?.[1];
  
  if (convexUrl) {
    log(`📝 Production Convex URL: ${convexUrl}`, 'cyan');
  }
  
  return convexUrl;
}

function deployRailway(convexUrl) {
  log('\n🚂 Deploying Railway backend...', 'magenta');
  
  // Check if Railway project exists
  try {
    execSync('railway status', { stdio: 'ignore' });
  } catch (error) {
    log('🔧 Initializing Railway project...', 'yellow');
    exec('railway init', 'Railway project initialization');
  }
  
  // Set environment variables
  log('🔧 Setting Railway environment variables...', 'yellow');
  exec('railway variables set NODE_ENV=production', 'Setting NODE_ENV');
  
  if (convexUrl) {
    exec(`railway variables set CONVEX_URL=${convexUrl}`, 'Setting CONVEX_URL');
  }
  
  // Check if Redis is added
  try {
    const variables = execSync('railway variables', { encoding: 'utf8' });
    if (!variables.includes('REDIS_URL')) {
      log('🔧 Adding Redis service...', 'yellow');
      exec('railway add redis', 'Adding Redis service');
    }
  } catch (error) {
    log('🔧 Adding Redis service...', 'yellow');
    exec('railway add redis', 'Adding Redis service');
  }
  
  // Deploy backend
  exec('railway up', 'Railway backend deployment');
  
  // Get Railway URL
  try {
    const railwayUrl = execSync('railway status --json', { encoding: 'utf8' });
    const status = JSON.parse(railwayUrl);
    const backendUrl = status.deployments?.[0]?.url;
    
    if (backendUrl) {
      log(`📝 Railway backend URL: ${backendUrl}`, 'cyan');
      return backendUrl;
    }
  } catch (error) {
    log('⚠️ Could not get Railway URL automatically', 'yellow');
    log('Please check Railway dashboard for your backend URL', 'yellow');
  }
  
  return null;
}

function deployVercel(backendUrl) {
  log('\n▲ Deploying Vercel frontend...', 'magenta');
  
  // Build frontend
  exec('npm run build:frontend', 'Frontend build');
  
  // Check if Vercel project exists
  try {
    execSync('vercel ls', { stdio: 'ignore' });
  } catch (error) {
    log('🔧 Initializing Vercel project...', 'yellow');
    exec('vercel', 'Vercel project initialization');
  }
  
  // Set environment variables if backend URL is available
  if (backendUrl) {
    log('🔧 Setting Vercel environment variables...', 'yellow');
    exec(`vercel env add REACT_APP_API_URL ${backendUrl} production`, 'Setting API URL');
    exec(`vercel env add REACT_APP_WEBSOCKET_URL ${backendUrl.replace('https://', 'wss://')} production`, 'Setting WebSocket URL');
  }
  
  // Deploy to production
  exec('vercel --prod', 'Vercel frontend deployment');
}

function updateCorsConfiguration(frontendUrl, backendUrl) {
  if (!frontendUrl && !backendUrl) return;
  
  log('\n🔧 Updating CORS configuration...', 'yellow');
  
  const indexPath = path.join(__dirname, '..', 'src', 'index.ts');
  let content = fs.readFileSync(indexPath, 'utf8');
  
  // Add URLs to CORS configuration
  if (frontendUrl) {
    content = content.replace(
      "// Add your production URLs here",
      `// Add your production URLs here\n      '${frontendUrl}',`
    );
  }
  
  fs.writeFileSync(indexPath, content);
  log('✅ CORS configuration updated', 'green');
  
  if (backendUrl) {
    log('🔄 Redeploying backend with updated CORS...', 'cyan');
    exec('railway up', 'Railway redeploy with CORS update');
  }
}

function displaySummary(convexUrl, backendUrl, frontendUrl) {
  log('\n🎉 Deployment Complete!', 'green');
  log('=' .repeat(50), 'green');
  
  if (frontendUrl) {
    log(`🌐 Frontend: ${frontendUrl}`, 'cyan');
  }
  
  if (backendUrl) {
    log(`🚂 Backend: ${backendUrl}`, 'cyan');
    log(`📊 Admin: ${backendUrl}/admin`, 'cyan');
  }
  
  if (convexUrl) {
    log(`🗄️ Database: ${convexUrl}`, 'cyan');
  }
  
  log('\n📋 Next Steps:', 'yellow');
  log('1. Test all services are working', 'white');
  log('2. Configure custom domain (optional)', 'white');
  log('3. Set up monitoring and alerts', 'white');
  log('4. Update DNS records if using custom domain', 'white');
  
  log('\n🔗 Useful Links:', 'yellow');
  log('• Vercel Dashboard: https://vercel.com/dashboard', 'white');
  log('• Railway Dashboard: https://railway.app/dashboard', 'white');
  log('• Convex Dashboard: https://dashboard.convex.dev', 'white');
}

async function main() {
  log('🚀 NodeWatch Production Deployment', 'bright');
  log('=' .repeat(50), 'bright');
  
  try {
    checkPrerequisites();
    checkEnvironmentFile();
    
    const convexUrl = deployConvex();
    const backendUrl = deployRailway(convexUrl);
    deployVercel(backendUrl);
    
    // Note: We can't automatically get Vercel URL, user needs to check dashboard
    const frontendUrl = null; // Would need Vercel API to get this
    
    updateCorsConfiguration(frontendUrl, backendUrl);
    displaySummary(convexUrl, backendUrl, frontendUrl);
    
  } catch (error) {
    log(`\n💥 Deployment failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}