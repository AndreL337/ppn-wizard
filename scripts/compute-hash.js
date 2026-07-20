const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const factorsPath = path.join(__dirname, '../services/factors/2026.json');
const outputPath = path.join(__dirname, '../services/factors/hash.json');

// Canonical JSON deep-sort stringification to guarantee whitespace/format immunity
function canonicalStringify(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalStringify).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  const properties = keys.map(key => {
    return JSON.stringify(key) + ':' + canonicalStringify(obj[key]);
  });
  return '{' + properties.join(',') + '}';
}

try {
  const content = fs.readFileSync(factorsPath, 'utf8');
  const parsedData = JSON.parse(content);
  const canonicalContent = canonicalStringify(parsedData);
  
  const hash = crypto.createHash('sha256').update(canonicalContent).digest('hex');
  
  // Ensure target folder exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify({ hash }, null, 2), 'utf8');
  console.log(`Computed canonical SHA-256 hash of 2026.json successfully: ${hash}`);
} catch (error) {
  console.error('Failed to compute canonical SHA-256 hash:', error);
  process.exit(1);
}
