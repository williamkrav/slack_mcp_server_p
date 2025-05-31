#!/usr/bin/env node

// Quick test validation script
// Run with: node validate-tests.js

import fs from 'fs';
import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

console.log('🧪 Validating Slack Canvas MCP Server Tests...\n');

// Check test files exist
const testFiles = [
  'test/setup.ts',
  'test/slackClient.test.ts',
  'test/mcpServer.test.ts',
  'test/canvasFeatures.test.ts',
  'test/e2e.test.ts'
];

console.log('📁 Test Files:');
testFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file));
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
});

// Check test configuration
console.log('\n⚙️  Test Configuration:');
const jestConfig = fs.existsSync(path.join(__dirname, 'jest.config.js'));
console.log(`  ${jestConfig ? '✅' : '❌'} jest.config.js`);

// Check package.json test scripts
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  console.log(`  ${pkg.scripts?.test ? '✅' : '❌'} test script`);
  console.log(`  ${pkg.scripts?.['test:watch'] ? '✅' : '❌'} test:watch script`);
  console.log(`  ${pkg.scripts?.['test:coverage'] ? '✅' : '❌'} test:coverage script`);
  console.log(`  ${pkg.devDependencies?.jest ? '✅' : '❌'} jest dependency`);
  console.log(`  ${pkg.devDependencies?.['ts-jest'] ? '✅' : '❌'} ts-jest dependency`);
} catch (error) {
  console.log(`  ❌ Error reading package.json: ${error.message}`);
}

// Check source structure
console.log('\n📂 Source Structure:');
const srcExists = fs.existsSync(path.join(__dirname, 'src/index.ts'));
console.log(`  ${srcExists ? '✅' : '❌'} src/index.ts (main server)`);

// Analyze test coverage
console.log('\n🎯 Test Coverage Analysis:');
const testDirs = ['test'];
let totalTests = 0;
let totalLines = 0;

testDirs.forEach(dir => {
  const testDir = path.join(__dirname, dir);
  if (fs.existsSync(testDir)) {
    const files = fs.readdirSync(testDir).filter(f => f.endsWith('.test.ts'));
    files.forEach(file => {
      const content = fs.readFileSync(path.join(testDir, file), 'utf8');
      const lines = content.split('\n').length;
      const testCount = (content.match(/it\(/g) || []).length;
      totalTests += testCount;
      totalLines += lines;
      console.log(`  📄 ${file}: ${testCount} tests, ${lines} lines`);
    });
  }
});

console.log(`  📊 Total: ${totalTests} tests across ${totalLines} lines`);

// Test categories
console.log('\n🔍 Test Categories:');
const categories = [
  { name: 'SlackClient Unit Tests', file: 'test/slackClient.test.ts' },
  { name: 'MCP Server Integration', file: 'test/mcpServer.test.ts' },
  { name: 'Canvas API Features', file: 'test/canvasFeatures.test.ts' },
  { name: 'End-to-End Workflows', file: 'test/e2e.test.ts' }
];

categories.forEach(cat => {
  const exists = fs.existsSync(path.join(__dirname, cat.file));
  if (exists) {
    const content = fs.readFileSync(path.join(__dirname, cat.file), 'utf8');
    const testCount = (content.match(/it\(/g) || []).length;
    console.log(`  ✅ ${cat.name}: ${testCount} tests`);
  } else {
    console.log(`  ❌ ${cat.name}: Missing`);
  }
});

// Feature coverage check
console.log('\n🚀 Feature Coverage Check:');
const features = [
  'Dynamic channel listing',
  'Canvas creation',
  'Canvas editing',
  'Canvas deletion',
  'Canvas access control',
  'Error handling',
  'Slack API integration'
];

// Read all test files to check feature coverage
const allTestContent = testFiles
  .filter(f => fs.existsSync(path.join(__dirname, f)))
  .map(f => fs.readFileSync(path.join(__dirname, f), 'utf8'))
  .join('\n');

features.forEach(feature => {
  // Simple heuristic to check if feature is tested
  const keywords = feature.toLowerCase().split(' ');
  const hasTests = keywords.some(keyword => 
    allTestContent.toLowerCase().includes(keyword)
  );
  console.log(`  ${hasTests ? '✅' : '⚠️ '} ${feature}`);
});

console.log('\n🎉 Test Validation Complete!');
console.log('\nNext steps:');
console.log('1. Run: npm install');
console.log('2. Run: npm test');
console.log('3. Run: npm run test:coverage');
console.log('4. Check coverage report in coverage/ directory');

export {};
