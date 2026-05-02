const path = require('path');
console.log("Current Directory:", process.cwd());
console.log("__dirname:", __dirname);
try {
  const workerPath = require.resolve('tesseract.js/src/worker-script/node/index.js');
  console.log("Worker Path Found:", workerPath);
} catch (e) {
  console.log("Worker Path NOT Found via require.resolve");
}
