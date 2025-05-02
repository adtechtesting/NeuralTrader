// Setup and test script that initializes the system and creates test agents
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Setting up NeuralTrader environment...');

// Step 1: Initialize the AMM pool
console.log('\n=== Step 1: Initializing AMM Pool ===');
try {
  execSync('node setup-amm.js', { stdio: 'inherit' });
  console.log('✅ AMM pool initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize AMM pool:', error);
  process.exit(1);
}

// Step 2: Create test funder wallet if not exists
console.log('\n=== Step 2: Setting up funder wallet ===');
if (!fs.existsSync('./funder-key.json')) {
  console.log('Creating test funder wallet...');
  // Generate a dummy key for testing (note: would be replaced in a real environment)
  const testKey = {
    publicKey: 'HxGQzYT3TWz8LpcoxjSQd4KvejxP2yaMG5nCk6WyiJLE',
    privateKey: '4mBwpWe8vVHLGkBWTK8ix8fqXoQZMHG1E9Qj8jnN3iHQPffmqrBwmvEK5SJLvyTCNPLKXsryPkHLKAYXG6fvctCH' 
  };
  fs.writeFileSync('./funder-key.json', JSON.stringify(testKey, null, 2));
  console.log('✅ Created test funder wallet (for simulation only)');
} else {
  console.log('✅ Funder wallet already exists');
}

// Step 3: Create a small number of test agents
console.log('\n=== Step 3: Creating test agents ===');
try {
  console.log('Creating 20 test agents...');
  execSync('node agent-factory.js 20 --force', { stdio: 'inherit' });
  console.log('✅ Test agents created successfully');
} catch (error) {
  console.error('❌ Failed to create test agents:', error);
  process.exit(1);
}

// Step 4: Done!
console.log('\n=== Setup Complete! ===');
console.log('You can now run the application with:');
console.log('  npm run dev');
console.log('\nVisit the monitoring dashboard at:');
console.log('  http://localhost:3000/monitoring');