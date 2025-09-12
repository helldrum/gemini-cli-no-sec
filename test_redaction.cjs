const { customRules } = require('./packages/core/src/pii/gitleaksFilters.ts');
const { readFileSync, writeFileSync } = require('fs'); // Import writeFileSync
const { join } = require('path');

// Helper to check if a string is valid Base64
function isBase64(str) {
  try {
    // Check if the string is a multiple of 4 (Base64 padding)
    if (str.length % 4 !== 0) return false;
    // Check if it contains only valid Base64 characters
    if (!/^[A-Za-z0-9+/=\s]+$/.test(str)) return false;
    // Attempt to decode and re-encode to verify validity
    return Buffer.from(str, 'base64').toString('base64') === str;
  } catch (err) {
    return false;
  }
}

// Custom redaction function for general regex rules
function redactContent(content, rules) {
  let redacted = content;
  rules.forEach(rule => {
    redacted = redacted.replace(rule.pattern(), '[redacted]');
  });
  return redacted;
}

async function runRedactionTest() {
  const testFilePath = join(__dirname, 'test_data', 'comprehensive_test.txt');
  const outputFilePath = join(__dirname, 'test_data', 'comprehensive_test_redacted.txt'); // New output file path
  let originalContent = readFileSync(testFilePath, 'utf8');

  console.log('Original Content (raw from file):');
  console.log(originalContent);

  let redactedResult = originalContent; // Initialize with original content

  // 1. Prioritized Base64 redaction (if the entire content is Base64)
  if (isBase64(originalContent)) {
    redactedResult = '[redacted]';
    console.log('\n--- Detected and Redacted Base64 String (Entire Content) ---');
  } else {
    // Apply general regex rules if not a full Base64 string
    redactedResult = redactContent(originalContent, customRules);
    console.log('\n--- Applied General Redaction Rules ---');
  }

  console.log('\nRedacted Content:');
  console.log(redactedResult);

  // Write the redacted content to the output file
  writeFileSync(outputFilePath, redactedResult, 'utf8');
  console.log(`\nRedacted content written to: ${outputFilePath}`);
}

runRedactionTest();