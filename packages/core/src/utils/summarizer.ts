/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ToolResult } from '../tools/tools.js';
import type {
  Content,
  GenerateContentConfig,
  GenerateContentResponse,
} from '@google/genai';
import type { GeminiClient } from '../core/client.js';
import { DEFAULT_GEMINI_FLASH_LITE_MODEL } from '../config/models.js';
import { getResponseText, partToString } from './partUtils.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * A function that summarizes the result of a tool execution.
 *
 * @param result The result of the tool execution.
 * @returns The summary of the result.
 */
export type Summarizer = (
  result: ToolResult,
  geminiClient: GeminiClient,
  abortSignal: AbortSignal,
) => Promise<string>;

/**
 * The default summarizer for tool results.
 *
 * @param result The result of the tool execution.
 * @param geminiClient The Gemini client to use for summarization.
 * @param abortSignal The abort signal to use for summarization.
 * @returns The summary of the result.
 */
export const defaultSummarizer: Summarizer = (
  result: ToolResult,
  _geminiClient: GeminiClient,
  _abortSignal: AbortSignal,
) => Promise.resolve(JSON.stringify(result.llmContent));


export const SUMMARIZE_TOOL_OUTPUT_PROMPT = fs.readFileSync(path.resolve(__dirname, '../../../hacked_prompts_source/SUMMARIZE_TOOL_OUTPUT_PROMPT.md'), 'utf8').trim();

export const llmSummarizer: Summarizer = (result, geminiClient, abortSignal) =>
  summarizeToolOutput(
    partToString(result.llmContent),
    geminiClient,
    abortSignal,
  );

export async function summarizeToolOutput(
  textToSummarize: string,
  geminiClient: GeminiClient,
  abortSignal: AbortSignal,
  maxOutputTokens: number = 2000,
): Promise<string> {
  // There is going to be a slight difference here since we are comparing length of string with maxOutputTokens.
  // This is meant to be a ballpark estimation of if we need to summarize the tool output.
  if (!textToSummarize || textToSummarize.length < maxOutputTokens) {
    return textToSummarize;
  }
  const prompt = SUMMARIZE_TOOL_OUTPUT_PROMPT.replace(
    '{maxOutputTokens}',
    String(maxOutputTokens),
  ).replace('{textToSummarize}', textToSummarize);

  const contents: Content[] = [{ role: 'user', parts: [{ text: prompt }] }];
  const toolOutputSummarizerConfig: GenerateContentConfig = {
    maxOutputTokens,
  };
  try {
    const parsedResponse = (await geminiClient.generateContent(
      contents,
      toolOutputSummarizerConfig,
      abortSignal,
      DEFAULT_GEMINI_FLASH_LITE_MODEL,
    )) as unknown as GenerateContentResponse;
    return getResponseText(parsedResponse) || textToSummarize;
  } catch (error) {
    console.error('Failed to summarize tool output.', error);
    return textToSummarize;
  }
}
