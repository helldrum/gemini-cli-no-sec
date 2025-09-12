const { customRules } = require('./packages/core/src/pii/gitleaksFilters.ts');
const { readFileSync } = require('fs');
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

// Helper to check if a string is a clear GCP Service Account Key JSON
function isClearGcpServiceAccountKeyJson(str) {
  // Use the regex from gitleaksFilters.ts for GCP Service Account Key
  const gcpKeyRule = customRules.find(rule => rule.name === 'GCP Service Account Key');
  if (gcpKeyRule) {
    return gcpKeyRule.pattern().test(str);
  }
  return false;
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
  // Test with a clear GCP service account key JSON
  const testFilePath = join(__dirname, 'test_data', 'test.yaml');
  let originalContent = readFileSync(testFilePath, 'utf8');

  console.log('Original Content (raw from file):');
  console.log(originalContent);

  let redactedResult = originalContent; // Initialize with original content

  // 1. Check for Base64 redaction
  if (isBase64(originalContent)) {
    redactedResult = '[redacted]';
    console.log('\n--- Detected and Redacted Base64 String ---');
  } else if (isClearGcpServiceAccountKeyJson(originalContent)) {
    // 2. Check for clear GCP JSON Key redaction (if not Base64)
    redactedResult = '[redacted]';
    console.log('\n--- Detected and Redacted Clear GCP Service Account Key JSON ---');
  } else {
    // 3. Apply other regex rules if neither of the above
    console.log('\n--- Applying General Redaction Rules ---');
    redactedResult = redactContent(originalContent, customRules);
  }

  console.log('\nRedacted Content:');
  console.log(redactedResult);
}

runRedactionTest();