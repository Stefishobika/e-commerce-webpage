// This script generates a cryptographically secure, random string
// to be used as your JWT_SECRET.
// It uses Node.js's built-in 'crypto' module, so no additional
// packages are required.

const crypto = require('crypto');

// Generate a random string of 64 bytes and encode it in hexadecimal.
// This creates a long, complex, and unpredictable key.
const secret = crypto.randomBytes(64).toString('hex');

console.log('Your new, secure JWT_SECRET is:');
console.log('-------------------------------------------------------------------');
console.log(secret);
console.log('-------------------------------------------------------------------');
console.log('Please copy this entire string and paste it into your .env file.');
console.log('Do NOT share this secret key with anyone.');
