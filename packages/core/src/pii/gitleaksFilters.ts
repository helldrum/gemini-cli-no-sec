/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// This file contains custom redaction rules adapted from the gitleaks project.
// See: https://github.com/gitleaks/gitleaks/blob/master/config/gitleaks.toml

interface RedactionRule {
  name: string;
  pattern: () => RegExp;
}

// Using a function to get the regex so that we get a new instance each time.
// This is important because the 'g' flag makes the regex stateful.
const gitleaksRules: RedactionRule[] = [
  {
    // Source: https://github.com/gitleaks/gitleaks/blob/master/config/gitleaks.toml#L1010
    name: 'GitHub PAT',
    pattern: () => /ghp_[0-9a-zA-Z]{36}/g,
  },
  {
    // Source: https://github.com/gitleaks/gitleaks/blob/master/config/gitleaks.toml#L998
    name: 'GitHub Fine-Grained PAT',
    pattern: () => /github_pat_\w{82}/g,
  },
  {
    // Source: https://github.com/gitleaks/gitleaks/blob/master/config/gitleaks.toml#L1002
    name: 'GitHub OAuth',
    pattern: () => /gho_[0-9a-zA-Z]{36}/g,
  },
  {
    // Source: https://github.com/gitleaks/gitleaks/blob/master/config/gitleaks.toml#L994
    name: 'GitHub App Token',
    pattern: () => /(?:ghu|ghs)_[0-9a-zA-Z]{36}/g,
  },
  {
    // Source: https://github.com/gitleaks/gitleaks/blob/master/config/gitleaks.toml#L595
    name: 'GCP API Key',
    pattern: () => /AIza[\w-]{35}/g,
  },
  {
    // Source: https://github.com/gitleaks/gitleaks/blob/master/config/gitleaks.toml#L1206
    name: 'Twilio API Key',
    pattern: () => /SK[0-9a-fA-F]{32}/g,
  },
  {
    // Source: https://github.com/gitleaks/gitleaks/blob/master/config/gitleaks.toml#L1154
    name: 'Stripe Access Token',
    pattern: () => /(?:sk|rk)_(?:test|live|prod)_[a-zA-Z0-9]{10,99}/g,
  },
  {
    // Source: Adapted from various gitleaks rules for generic secrets.
    name: 'Generic Secret',
    pattern: () =>
      /(secret|token|password|bearer|key|auth)\s*[:=]\s*['"]?([a-zA-Z0-9_.~+/=-]{8,255})['"]?/gi,
  },
  {
    // Source: https://github.com/gitleaks/gitleaks/blob/master/config/gitleaks.toml#L63
    name: 'AWS Access Key',
    pattern: () =>
      /(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g,
  },
  {
    // Source: https://github.com/gitleaks/gitleaks/blob/master/config/gitleaks.toml#L72
    name: 'AWS Secret Key',
    pattern: () => /[0-9a-zA-Z/+=]{40}/g,
  },
  {
    name: 'Private Key',
    pattern: () =>
      /-----BEGIN[ A-Z0-9_-]{0,100}PRIVATE KEY-----[\s\S]*?-----END[ A-Z0-9_-]{0,100}PRIVATE KEY-----/g,
  },
  {
    name: 'Email Address',
    pattern: () => /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  },
  {
    name: 'Phone Number',
    pattern: () =>
      /\b(?:\+?\d{1,3}[-.]\s?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  },
];

export const customRules = gitleaksRules;
