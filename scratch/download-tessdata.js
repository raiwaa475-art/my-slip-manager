const fs = require('fs');
const https = require('https');
const path = require('path');

const langDataDir = path.join(__dirname, '..', 'lang-data');
if (!fs.existsSync(langDataDir)) {
  fs.mkdirSync(langDataDir);
}

const files = [
  'tha.traineddata',
  'eng.traineddata'
];

const baseUrl = 'https://raw.githubusercontent.com/tesseract-ocr/tessdata/main/';

async function downloadFile(fileName) {
  const filePath = path.join(langDataDir, fileName);
  const file = fs.createWriteStream(filePath);
  
  console.log(`Downloading ${fileName}...`);
  
  return new Promise((resolve, reject) => {
    https.get(baseUrl + fileName, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${fileName}: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded ${fileName}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {});
      reject(err);
    });
  });
}

async function main() {
  try {
    for (const f of files) {
      await downloadFile(f);
    }
    console.log('All files downloaded successfully');
  } catch (err) {
    console.error('Error downloading files:', err);
  }
}

main();
