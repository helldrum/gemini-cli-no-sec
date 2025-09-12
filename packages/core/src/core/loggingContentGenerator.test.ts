/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GenerateContentParameters } from '@google/genai';
import { LoggingContentGenerator } from './loggingContentGenerator.js';
import type { ContentGenerator } from './contentGenerator.js';
import type { Config, RedactionPattern } from '../config/config.js';

describe('LoggingContentGenerator', () => {
  let mockContentGenerator: ContentGenerator;
  let mockConfig: Config;
  let loggingContentGenerator: LoggingContentGenerator;

  beforeEach(() => {
    mockContentGenerator = {
      generateContent: vi
        .fn()
        .mockResolvedValue({ modelVersion: 'test-model' }),
      generateContentStream: vi.fn(),
      countTokens: vi.fn(),
      embedContent: vi.fn(),
    } as unknown as ContentGenerator;

    mockConfig = {
      isAnonymizationEnabled: vi.fn(),
      getRedactionPatterns: vi.fn(),
      getUsageStatisticsEnabled: vi.fn().mockReturnValue(false),
      getContentGeneratorConfig: vi.fn().mockReturnValue({ authType: 'test' }),
      // Mock other methods of Config as needed
    } as unknown as Config;

    loggingContentGenerator = new LoggingContentGenerator(
      mockContentGenerator,
      mockConfig,
    );
  });

  it('should redact content when anonymization is enabled', async () => {
    const patterns: RedactionPattern[] = [
      {
        pattern:
          '(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}',
      },
      { pattern: 'secret-key-\\w+' },
      { pattern: 'token-\\d+' },
    ];
    vi.mocked(mockConfig.isAnonymizationEnabled).mockReturnValue(true);
    vi.mocked(mockConfig.getRedactionPatterns).mockReturnValue(patterns);

    const req: GenerateContentParameters = {
      model: 'gemini-pro',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: 'my aws key is AKIAIOSFODNN7EXAMPLE and my secret is secret-key-12345 and my token is token-67890. This part should not be redacted.',
            },
          ],
        },
      ],
    };

    await loggingContentGenerator.generateContent(req, 'test-prompt-id');

    expect(mockContentGenerator.generateContent).toHaveBeenCalledWith(
      {
        model: 'gemini-pro',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: 'my aws key is [REDACTED] and my secret is [REDACTED] and my token is [REDACTED]. This part should not be redacted.',
              },
            ],
          },
        ],
      },
      'test-prompt-id',
    );
  });

  it('should not redact content when anonymization is disabled', async () => {
    vi.mocked(mockConfig.isAnonymizationEnabled).mockReturnValue(false);

    const req: GenerateContentParameters = {
      model: 'gemini-pro',
      contents: [
        {
          role: 'user',
          parts: [{ text: 'my secret is secret-key-12345' }],
        },
      ],
    };

    await loggingContentGenerator.generateContent(req, 'test-prompt-id');

    expect(mockContentGenerator.generateContent).toHaveBeenCalledWith(
      req,
      'test-prompt-id',
    );
    expect(mockConfig.getRedactionPatterns).not.toHaveBeenCalled();
  });
});
