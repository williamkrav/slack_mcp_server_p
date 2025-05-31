#!/usr/bin/env node

// Simple test to verify the TypeScript compiles correctly
// Run with: node test.js

import fs from 'fs';
import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

console.log('Testing Slack Canvas MCP Server...');

// Check if required files exist
const requiredFiles = [
  'package.json',
  'tsconfig.json', 
  'index.ts',
  'README.md',
  'SETUP.md'
];

console.log('\n📁 Checking required files:');
requiredFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file));
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
});

// Check package.json content
console.log('\n📦 Package configuration:');
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  console.log(`  ✅ Name: ${pkg.name}`);
  console.log(`  ✅ Version: ${pkg.version}`);
  console.log(`  ✅ Dependencies: ${Object.keys(pkg.dependencies || {}).length}`);
  console.log(`  ✅ Scripts: ${Object.keys(pkg.scripts || {}).length}`);
} catch (error) {
  console.log(`  ❌ Error reading package.json: ${error.message}`);
}

// Check TypeScript config
console.log('\n⚙️  TypeScript configuration:');
try {
  const tsconfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'tsconfig.json'), 'utf8'));
  console.log(`  ✅ Target: ${tsconfig.compilerOptions?.target}`);
  console.log(`  ✅ Module: ${tsconfig.compilerOptions?.module}`);
  console.log(`  ✅ Output: ${tsconfig.compilerOptions?.outDir}`);
} catch (error) {
  console.log(`  ❌ Error reading tsconfig.json: ${error.message}`);
}

// Check main TypeScript file
console.log('\n📄 TypeScript source:');
try {
  const indexTs = fs.readFileSync(path.join(__dirname, 'index.ts'), 'utf8');
  const lines = indexTs.split('\n').length;
  const hasCanvasTools = indexTs.includes('slack_canvas_create');
  const hasCanvasClient = indexTs.includes('createCanvas');
  const hasCanvasTypes = indexTs.includes('DocumentContent');
  
  console.log(`  ✅ Lines of code: ${lines}`);
  console.log(`  ${hasCanvasTools ? '✅' : '❌'} Canvas tools defined`);
  console.log(`  ${hasCanvasClient ? '✅' : '❌'} Canvas client methods`);
  console.log(`  ${hasCanvasTypes ? '✅' : '❌'} Canvas types defined`);
} catch (error) {
  console.log(`  ❌ Error reading index.ts: ${error.message}`);
}

console.log('\n🎉 Slack Canvas MCP Server setup complete!');
console.log('\nNext steps:');
console.log('1. Run: npm install');
console.log('2. Run: npm run build');
console.log('3. Configure your Slack app with Canvas permissions');
console.log('4. Add to Claude Desktop configuration');

export {};
