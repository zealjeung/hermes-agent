#!/usr/bin/env node
/**
 * Regression test: verify SOOP live streams render in the preview pane.
 * 
 * Uses a headless Electron probe to load a SOOP live URL and check:
 * - document.title is non-empty
 * - videoCount > 0
 * - video readyState >= 2 (HAVE_CURRENT_DATA)
 * 
 * Usage: node test-soop-stream.js [sooplive-url]
 * Default URL: https://play.sooplive.com/rlaxordyd/297684815
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');

const TEST_URL = process.argv[2] || 'https://play.sooplive.com/rlaxordyd/297684815';
const TIMEOUT_MS = 25000;

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    show: false,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Strip Electron token from UA
  const cleanUA = win.webContents.getUserAgent()
    .replace(/ Electron\/[\d.]+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  win.webContents.setUserAgent(cleanUA);

  console.log(`Loading: ${TEST_URL}`);
  console.log(`UA: ${cleanUA.substring(0, 60)}...`);

  await win.loadURL(TEST_URL);

  // Wait for page to settle
  await new Promise(r => setTimeout(r, TIMEOUT_MS));

  const result = await win.webContents.executeJavaScript(`
    (() => {
      const videos = document.querySelectorAll('video');
      const v = videos[0];
      return {
        title: document.title,
        videoCount: videos.length,
        readyState: v ? v.readyState : -1,
        paused: v ? v.paused : null,
        videoWidth: v ? v.videoWidth : 0,
        videoHeight: v ? v.videoHeight : 0,
      };
    })()
  `);

  console.log('\n=== SOOP Stream Test Results ===');
  console.log(`  Title: "${result.title}"`);
  console.log(`  Video count: ${result.videoCount}`);
  console.log(`  Ready state: ${result.readyState} (2+ = playing)`);
  console.log(`  Paused: ${result.paused}`);
  console.log(`  Resolution: ${result.videoWidth}x${result.videoHeight}`);

  const pass = result.title && result.videoCount > 0 && result.readyState >= 2;
  console.log(`\n${pass ? 'PASS' : 'FAIL'}: SOOP live stream ${pass ? 'is rendering correctly' : 'is NOT rendering'}`);

  win.destroy();
  app.exit(pass ? 0 : 1);
}).catch(e => {
  console.error('Test error:', e.message);
  app.exit(1);
});
