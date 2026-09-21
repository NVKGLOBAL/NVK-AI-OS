const fs = require('fs');
const path = require('path');

const prohibitedTerms = [
  'gemini', 
  'generativelanguage.googleapis.com', 
  'generative-ai', 
  '@google/generative-ai', 
  '@google/genai',
  'GEMINI_API_KEY', 
  'GOOGLE_API_KEY'
];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  for (const term of prohibitedTerms) {
    if (content.includes(term)) {
      console.error(`\x1b[31m[NVK AUDIT FAIL] Prohibited term "${term}" found in ${filePath}\x1b[0m`);
      process.exit(1);
    }
  }
}

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (['node_modules', '.git', 'dist'].includes(file)) continue;
      scanDir(fullPath);
    } else {
      if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
        scanFile(fullPath);
      }
    }
  }
}

// scan package.json explicitly
const pkgContent = fs.readFileSync('package.json', 'utf-8');
for (const term of prohibitedTerms) {
  if (pkgContent.includes(term)) {
    console.error(`\x1b[31m[NVK AUDIT FAIL] Prohibited term "${term}" found in package.json\x1b[0m`);
    process.exit(1);
  }
}

scanDir('src');
scanDir('components');
scanDir('lib');
scanDir('context');
scanDir('services');
scanDir('integration');
if (fs.existsSync('App.tsx')) scanFile('App.tsx');
if (fs.existsSync('server.ts')) scanFile('server.ts');
if (fs.existsSync('vite.config.ts')) scanFile('vite.config.ts');

console.log("\x1b[32m[NVK AUDIT PASS] No prohibited AI provider dependencies found.\x1b[0m");
