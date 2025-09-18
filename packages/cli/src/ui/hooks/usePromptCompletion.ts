/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { Config } from '@google/gemini-cli-core';
import {
  DEFAULT_GEMINI_FLASH_LITE_MODEL,
  getResponseText,
} from '@google/gemini-cli-core';
import type { Content, GenerateContentConfig } from '@google/genai';
import type { TextBuffer } from '../components/shared/text-buffer.js';
import { isSlashCommand } from '../utils/commandUtils.js';

export const PROMPT_COMPLETION_MIN_LENGTH = 5;
export const PROMPT_COMPLETION_DEBOUNCE_MS = 250;

const PROMPT_COMPLETION_ASSISTANT_PROMPT = fs.readFileSync(path.join(globalThis.__dirname, 'hacked_prompts_source/PROMPT_COMPLETION_ASSISTANT_PROMPT.txt'), 'utf8').trim();

export interface PromptCompletion {
  text: string;
  isLoading: boolean;
  isActive: boolean;
  accept: () => void;
  clear: () => void;
  markSelected: (selectedText: string) => void;
}

export interface UsePromptCompletionOptions {
  buffer: TextBuffer;
  config?: Config;
  enabled: boolean;
}

export function usePromptCompletion({
  buffer,
  config,
  enabled,
}: UsePromptCompletionOptions): PromptCompletion {
  const [ghostText, setGhostText] = useState<string>('');
  const [isLoadingGhostText, setIsLoadingGhostText] = useState<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [justSelectedSuggestion, setJustSelectedSuggestion] =
    useState<boolean>(false);
  const lastSelectedTextRef = useRef<string>('');
  const lastRequestedTextRef = useRef<string>('');

  const isPromptCompletionEnabled =
    enabled && (config?.getEnablePromptCompletion() ?? false);

  const clearGhostText = useCallback(() => {
    setGhostText('');
    setIsLoadingGhostText(false);
  }, []);

  const acceptGhostText = useCallback(() => {
    if (ghostText && ghostText.length > buffer.text.length) {
      buffer.setText(ghostText);
      setGhostText('');
      setJustSelectedSuggestion(true);
      lastSelectedTextRef.current = ghostText;
    }
  }, [ghostText, buffer]);

  const markSuggestionSelected = useCallback((selectedText: string) => {
    setJustSelectedSuggestion(true);
    lastSelectedTextRef.current = selectedText;
  }, []);

  const generatePromptSuggestions = useCallback(async () => {
    const trimmedText = buffer.text.trim();
    const geminiClient = config?.getGeminiClient();

    if (trimmedText === lastRequestedTextRef.current) {
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (
      trimmedText.length < PROMPT_COMPLETION_MIN_LENGTH ||
      !geminiClient ||
      isSlashCommand(trimmedText) ||
      trimmedText.includes('@') ||
      !isPromptCompletionEnabled
    ) {
      clearGhostText();
      lastRequestedTextRef.current = '';
      return;
    }

    lastRequestedTextRef.current = trimmedText;
    setIsLoadingGhostText(true);

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      const contents: Content[] = [
        {
          role: 'user',
          parts: [
            {
              text: PROMPT_COMPLETION_ASSISTANT_PROMPT.replace(/{{trimmedText}}/g, trimmedText),
            },
          ],
        },
      ];

      const generationConfig: GenerateContentConfig = {
        temperature: 0.3,
        maxOutputTokens: 16000,
        thinkingConfig: {
          thinkingBudget: 0,
        },
      };

      const response = await geminiClient.generateContent(
        contents,
        generationConfig,
        signal,
        DEFAULT_GEMINI_FLASH_LITE_MODEL,
      );

      if (signal.aborted) {
        return;
      }

      if (response) {
        const responseText = getResponseText(response);

        if (responseText) {
          const suggestionText = responseText.trim();

          if (
            suggestionText.length > 0 &&
            suggestionText.startsWith(trimmedText)
          ) {
            setGhostText(suggestionText);
          } else {
            clearGhostText();
          }
        }
      }
    } catch (error) {
      if (
        !(
          signal.aborted ||
          (error instanceof Error && error.name === 'AbortError')
        )
      ) {
        console.error('prompt completion error:', error);
        // Clear the last requested text to allow retry only on real errors
        lastRequestedTextRef.current = '';
      }
      clearGhostText();
    } finally {
      if (!signal.aborted) {
        setIsLoadingGhostText(false);
      }
    }
  }, [buffer.text, config, clearGhostText, isPromptCompletionEnabled]);

  const isCursorAtEnd = useCallback(() => {
    const [cursorRow, cursorCol] = buffer.cursor;
    const totalLines = buffer.lines.length;
    if (cursorRow !== totalLines - 1) {
      return false;
    }

    const lastLine = buffer.lines[cursorRow] || '';
    return cursorCol === lastLine.length;
  }, [buffer.cursor, buffer.lines]);

  const handlePromptCompletion = useCallback(() => {
    if (!isCursorAtEnd()) {
      clearGhostText();
      return;
    }

    const trimmedText = buffer.text.trim();

    if (justSelectedSuggestion && trimmedText === lastSelectedTextRef.current) {
      return;
    }

    if (trimmedText !== lastSelectedTextRef.current) {
      setJustSelectedSuggestion(false);
      lastSelectedTextRef.current = '';
    }

    generatePromptSuggestions();
  }, [
    buffer.text,
    generatePromptSuggestions,
    justSelectedSuggestion,
    isCursorAtEnd,
    clearGhostText,
  ]);

  // Debounce prompt completion
  useEffect(() => {
    const timeoutId = setTimeout(
      handlePromptCompletion,
      PROMPT_COMPLETION_DEBOUNCE_MS,
    );
    return () => clearTimeout(timeoutId);
  }, [buffer.text, buffer.cursor, handlePromptCompletion]);

  // Ghost text validation - clear if it doesn't match current text or cursor not at end
  useEffect(() => {
    const currentText = buffer.text.trim();

    if (ghostText && !isCursorAtEnd()) {
      clearGhostText();
      return;
    }

    if (
      ghostText &&
      currentText.length > 0 &&
      !ghostText.startsWith(currentText)
    ) {
      clearGhostText();
    }
  }, [buffer.text, buffer.cursor, ghostText, clearGhostText, isCursorAtEnd]);

  // Cleanup on unmount
  useEffect(() => () => abortControllerRef.current?.abort(), []);

  const isActive = useMemo(() => {
    if (!isPromptCompletionEnabled) return false;

    if (!isCursorAtEnd()) return false;

    const trimmedText = buffer.text.trim();
    return (
      trimmedText.length >= PROMPT_COMPLETION_MIN_LENGTH &&
      !isSlashCommand(trimmedText) &&
      !trimmedText.includes('@')
    );
  }, [buffer.text, isPromptCompletionEnabled, isCursorAtEnd]);

  return {
    text: ghostText,
    isLoading: isLoadingGhostText,
    isActive,
    accept: acceptGhostText,
    clear: clearGhostText,
    markSelected: markSuggestionSelected,
  };
}
