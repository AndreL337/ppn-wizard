const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const factorsPath = path.join(__dirname, '../services/factors/2026.json');
const outputPath = path.join(__dirname, '../services/factors/hash.json');

try {
  const content = fs.readFileSync(factorsPath, 'utf8');
  // Normalize line endings to avoid different hashes on different operating systems / git configurations (CRLF vs LF)
  const normalizedContent = content.replace(/\r\n/g, '\n').trim();
  const hash = crypto.createHash('sha256').update(normalizedContent).digest('hex');
  
  // Ensure target folder exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify({ hash }, null, 2), 'utf8');
  console.log(`Computed SHA-256 hash of 2026.json successfully: ${hash}`);
} catch (error) {
  console.error('Failed to compute SHA-256 hash:', error);
  process.exit(1);
}
