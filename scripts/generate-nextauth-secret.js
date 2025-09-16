#!/usr/bin/env node
/*
 Generates a cryptographically-strong NEXTAUTH_SECRET.
 Usage:
   npm run gen:secret                     # prints a secret
   npm run gen:secret:write               # writes to .env or .env.local
   npm run gen:secret:write -- --file .env.local  # choose file
   npm run gen:secret:write:force         # overwrite existing without prompt
*/
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function generateSecret() {
  const buf = crypto.randomBytes(32);
  // base64url without padding
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

const args = process.argv.slice(2);
const shouldWrite = args.includes('--write') || /gen:secret:write/.test(process.env.npm_lifecycle_event || '');
const force = args.includes('--force') || /gen:secret:write:force/.test(process.env.npm_lifecycle_event || '');

// Resolve target env file
let fileArgIndex = args.indexOf('--file');
let targetFile = fileArgIndex !== -1 ? args[fileArgIndex + 1] : null;
const cwd = process.cwd();
const envCandidates = ['.env', '.env.local'];
if (!targetFile) {
  for (const candidate of envCandidates) {
    if (fs.existsSync(path.join(cwd, candidate))) { targetFile = candidate; break; }
  }
}
if (!targetFile) targetFile = '.env.local';

const secret = generateSecret();

if (!shouldWrite) {
  console.log(secret);
  process.exit(0);
}

const fullPath = path.join(cwd, targetFile);
let content = '';
if (fs.existsSync(fullPath)) {
  content = fs.readFileSync(fullPath, 'utf8');
}

const hasVar = /^NEXTAUTH_SECRET\s*=\s*.*/m.test(content);
if (hasVar && !force) {
  // Replace existing line
  content = content.replace(/^NEXTAUTH_SECRET\s*=\s*.*/m, `NEXTAUTH_SECRET=${secret}`);
} else if (hasVar && force) {
  content = content.replace(/^NEXTAUTH_SECRET\s*=\s*.*/m, `NEXTAUTH_SECRET=${secret}`);
} else {
  // Append
  content = (content ? content.replace(/\s*$/, '\n') : '') + `NEXTAUTH_SECRET=${secret}\n`;
}

fs.writeFileSync(fullPath, content, 'utf8');
console.log(`NEXTAUTH_SECRET written to ${targetFile}`);
