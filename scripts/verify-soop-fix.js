#!/usr/bin/env node
/**
 * Post-update verification: check if the SOOP live stream fix survived the update.
 * 
 * The fix consists of two parts:
 * 1. preview-ua.ts — strips the Electron token from the preview pane's UA
 * 2. autoplay-policy switch — allows video.play() without user gesture
 * 
 * Both are in the built artifact: app.asar.unpacked/dist/electron-main.mjs
 * 
 * Usage: node verify-soop-fix.js
 * Exit 0 = fix is live, Exit 1 = fix was wiped
 */

const fs = require('fs');
const path = require('path');

const UNPACKED_DIR = path.join(__dirname, '..', 'apps', 'desktop', 'release', 'win-unpacked', 'resources', 'app.asar.unpacked', 'dist');
const MAIN_BUNDLE = path.join(UNPACKED_DIR, 'electron-main.mjs');

function check() {
  if (!fs.existsSync(MAIN_BUNDLE)) {
    console.error(`FAIL: Built artifact not found at ${MAIN_BUNDLE}`);
    console.error('Run `npm run build` first.');
    process.exit(1);
  }

  const content = fs.readFileSync(MAIN_BUNDLE, 'utf8');

  // Check 1: autoplay-policy switch
  const hasAutoplay = content.includes('autoplay-policy') || content.includes('no-user-gesture-required');

  // Check 2: UA strip (setUserAgent or Electron token removal)
  const hasUaStrip = content.includes('setUserAgent') || content.includes('Electron') || content.includes('userAgent');

  // Check 3: preview-ua module
  const hasPreviewUa = content.includes('preview-ua') || content.includes('stripElectronToken') || content.includes('installPreviewUserAgent');

  console.log('=== SOOP Live Stream Fix Verification ===');
  console.log(`Built artifact: ${MAIN_BUNDLE}`);
  console.log(`  autoplay-policy switch: ${hasAutoplay ? 'PRESENT' : 'MISSING'}`);
  console.log(`  UA strip (setUserAgent): ${hasUaStrip ? 'PRESENT' : 'MISSING'}`);
  console.log(`  preview-ua module: ${hasPreviewUa ? 'PRESENT' : 'MISSING'}`);

  if (hasAutoplay && hasUaStrip && hasPreviewUa) {
    console.log('\nPASS: All fix components are live.');
    process.exit(0);
  } else {
    console.error('\nFAIL: Fix was wiped by update. Re-apply:');
    console.error('  1. Copy preview-ua.ts from the fork: https://github.com/zealjeung/hermes-agent');
    console.error('  2. Add autoplay-policy switch to main.ts');
    console.error('  3. Run: npm run build');
    console.error('  4. Copy dist/ to release/win-unpacked/resources/app.asar.unpacked/dist/');
    process.exit(1);
  }
}

check();
