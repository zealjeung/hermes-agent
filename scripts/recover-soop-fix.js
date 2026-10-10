#!/usr/bin/env node
/**
 * Recovery: re-apply the SOOP live stream fix after an update wiped it.
 * 
 * This script:
 * 1. Copies preview-ua.ts from the fork (if missing)
 * 2. Adds the autoplay-policy switch to main.ts (if missing)
 * 3. Rebuilds and deploys to the unpacked dist
 * 
 * Usage: node recover-soop-fix.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const ELECTRON_DIR = path.join(ROOT, 'apps', 'desktop', 'electron');
const MAIN_TS = path.join(ELECTRON_DIR, 'main.ts');
const PREVIEW_UA_TS = path.join(ELECTRON_DIR, 'preview-ua.ts');
const UNPACKED_DIST = path.join(ROOT, 'apps', 'desktop', 'release', 'win-unpacked', 'resources', 'app.asar.unpacked', 'dist');
const DIST_DIR = path.join(ROOT, 'apps', 'desktop', 'dist');

function copyPreviewUa() {
  if (fs.existsSync(PREVIEW_UA_TS)) {
    console.log('  preview-ua.ts already exists, skipping');
    return;
  }

  console.log('  Creating preview-ua.ts...');
  const content = `/**
 * Preview-pane user-agent normalisation.
 * Strips the Electron token from the preview pane's UA so SOOP live streams render.
 */
export function stripElectronToken(userAgent: string): string {
  return userAgent
    .replace(/ Electron\\/[\\d.]+/g, '')
    .replace(/\\s{2,}/g, ' ')
    .trim()
}

interface PreviewUaSession {
  getUserAgent(): string
  setUserAgent(userAgent: string): void
}

export function installPreviewUserAgent(sess: PreviewUaSession): string {
  const clean = stripElectronToken(sess.getUserAgent())
  sess.setUserAgent(clean)
  return clean
}
`;
  fs.writeFileSync(PREVIEW_UA_TS, content);
  console.log('  Created preview-ua.ts');
}

function addAutoplaySwitch() {
  if (!fs.existsSync(MAIN_TS)) {
    console.error('  main.ts not found, cannot add autoplay switch');
    return;
  }

  const content = fs.readFileSync(MAIN_TS, 'utf8');
  if (content.includes('autoplay-policy')) {
    console.log('  autoplay-policy switch already present, skipping');
    return;
  }

  console.log('  Adding autoplay-policy switch to main.ts...');
  // Add after the first import block
  const lines = content.split('\n');
  let insertIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ') || lines[i].startsWith('const ')) {
      insertIdx = i + 1;
    }
  }
  lines.splice(insertIdx, 0, `// SOOP live streams: allow video.play() without user gesture`, `app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')`, ``);
  fs.writeFileSync(MAIN_TS, lines.join('\n'));
  console.log('  Added autoplay-policy switch');
}

function buildAndDeploy() {
  console.log('  Building...');
  try {
    execSync('npm run build', { cwd: ROOT, stdio: 'inherit' });
  } catch (e) {
    console.error('  Build failed:', e.message);
    process.exit(1);
  }

  console.log('  Deploying to unpacked dist...');
  if (!fs.existsSync(DIST_DIR)) {
    console.error('  dist/ not found after build');
    process.exit(1);
  }

  // Copy dist/ to unpacked
  execSync(`xcopy /E /I /Y "${DIST_DIR}" "${UNPACKED_DIST}"`, { stdio: 'inherit' });
  console.log('  Deployed to unpacked dist');
}

console.log('=== SOOP Live Stream Fix Recovery ===');
console.log('Step 1: Copy preview-ua.ts');
copyPreviewUa();
console.log('Step 2: Add autoplay-policy switch');
addAutoplaySwitch();
console.log('Step 3: Build and deploy');
buildAndDeploy();
console.log('\nDone. Restart the desktop to apply.');
