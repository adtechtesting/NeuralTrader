require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const bs58 = require('bs58');

// Read private key solely from the .env.local file
const privateKey = process.env.FUNDER_PRIVATE_KEY;
if (!privateKey) {
  console.error('Please set FUNDER_PRIVATE_KEY in your .env.local file');
  process.exit(1);
}

// Determine the correct decode function (handles potential import differences)
const decode = (typeof bs58.decode === 'function')
  ? bs58.decode
  : (bs58.default && typeof bs58.default.decode === 'function')
      ? bs58.default.decode
      : null;

if (!decode) {
  console.error('bs58.decode is not available. Please check your bs58 package version.');
  process.exit(1);
}

// Try decoding the private key to validate it
try {
  const decoded = decode(privateKey);
  if (decoded.length !== 64) {
    throw new Error('Invalid private key length');
  }
  
  // Save the private key to a file (public key derivation can be done later)
  fs.writeFileSync('./funder-key.json', JSON.stringify({
    privateKey
  }, null, 2));
  
  console.log('Funder key saved successfully!');
} catch (error) {
  console.error('Error setting up funder key:', error);
  process.exit(1);
}

