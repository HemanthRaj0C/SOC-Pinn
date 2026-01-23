const bcrypt = require('bcryptjs');

// Get password from command line argument
const password = process.argv[2];

if (!password) {
  console.log('Usage: node hashPassword.js <password>');
  process.exit(1);
}

bcrypt.hash(password, 10).then(hash => {
  console.log('\nHashed password:');
  console.log(hash);
  console.log('\nUse this in your Firebase team document.');
}).catch(err => {
  console.error('Error:', err);
});
