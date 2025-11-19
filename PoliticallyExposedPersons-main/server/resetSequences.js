const { exec } = require('child_process');
const path = require('path');

// Path to the script
const scriptPath = path.join(__dirname, 'resetAllSequences.js');

// Execute the script
console.log('Resetting database sequences...');
exec(`node ${scriptPath}`, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`Stderr: ${stderr}`);
    return;
  }
  console.log(stdout);
});
