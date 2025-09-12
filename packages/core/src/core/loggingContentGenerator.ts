/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  Content,
  CountTokensParameters,
  CountTokensResponse,
  EmbedContentParameters,
  EmbedContentResponse,
  GenerateContentParameters,
  GenerateContentResponseUsageMetadata,
  GenerateContentResponse,
} from '@google/genai';
import { DeepRedact } from '@hackylabs/deep-redact';
import {
  ApiRequestEvent,
  ApiResponseEvent,
  ApiErrorEvent,
} from '../telemetry/types.js';
import type { Config } from '../config/config.js';
import {
  logApiError,
  logApiRequest,
  logApiResponse,
} from '../telemetry/loggers.js';
import type { ContentGenerator } from './contentGenerator.js';
import { toContents } from '../code_assist/converter.js';
import { isStructuredError } from '../utils/quotaErrorDetection.js';

interface StructuredError {
  status: number;
}

/**
 * A decorator that wraps a ContentGenerator to add logging to API calls.
 */
export class LoggingContentGenerator implements ContentGenerator {
  constructor(
    private readonly wrapped: ContentGenerator,
    private readonly config: Config,
  ) {}

  getWrapped(): ContentGenerator {
    return this.wrapped;
  }

  private logApiRequest(
    contents: Content[],
    model: string,
    promptId: string,
  ): void {
    const requestText = JSON.stringify(contents);
    logApiRequest(
      this.config,
      new ApiRequestEvent(model, promptId, requestText),
    );
  }

  private _logApiResponse(
    durationMs: number,
    model: string,
    prompt_id: string,
    usageMetadata?: GenerateContentResponseUsageMetadata,
    responseText?: string,
  ): void {
    logApiResponse(
      this.config,
      new ApiResponseEvent(
        model,
        durationMs,
        prompt_id,
        this.config.getContentGeneratorConfig()?.authType,
        usageMetadata,
        responseText,
      ),
    );
  }

  private _logApiError(
    durationMs: number,
    error: unknown,
    model: string,
    prompt_id: string,
  ): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorType = error instanceof Error ? error.name : 'unknown';

    logApiError(
      this.config,
      new ApiErrorEvent(
        model,
        errorMessage,
        durationMs,
        prompt_id,
        this.config.getContentGeneratorConfig()?.authType,
        errorType,
        isStructuredError(error)
          ? (error as StructuredError).status
          : undefined,
      ),
    );
  }

  private anonymizeRequest(
    req: GenerateContentParameters,
  ): GenerateContentParameters {
    if (!this.config.isAnonymizationEnabled()) {
      return req;
    }

    const redactor = new DeepRedact({});
    return redactor.redact(req) as GenerateContentParameters;
  }

  async generateContent(
    req: GenerateContentParameters,
    userPromptId: string,
  ): Promise<GenerateContentResponse> {
    const anonymizedReq = this.anonymizeRequest(req);
    const startTime = Date.now();
    this.logApiRequest(
      toContents(anonymizedReq.contents),
      anonymizedReq.model,
      userPromptId,
    );
    try {
      const response = await this.wrapped.generateContent(
        anonymizedReq,
        userPromptId,
      );
      const durationMs = Date.now() - startTime;
      this._logApiResponse(
        durationMs,
        response.modelVersion || '',
        userPromptId,
        response.usageMetadata,
        JSON.stringify(response),
      );
      return response;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this._logApiError(durationMs, error, anonymizedReq.model, userPromptId);
      throw error;
    }
  }

  async generateContentStream(
    req: GenerateContentParameters,
    userPromptId: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    const anonymizedReq = this.anonymizeRequest(req);
    const startTime = Date.now();
    this.logApiRequest(
      toContents(anonymizedReq.contents),
      anonymizedReq.model,
      userPromptId,
    );

    let stream: AsyncGenerator<GenerateContentResponse>;
    try {
      stream = await this.wrapped.generateContentStream(
        anonymizedReq,
        userPromptId,
      );
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this._logApiError(durationMs, error, anonymizedReq.model, userPromptId);
      throw error;
    }

    return this.loggingStreamWrapper(stream, startTime, userPromptId);
  }

  private async *loggingStreamWrapper(
    stream: AsyncGenerator<GenerateContentResponse>,
    startTime: number,
    userPromptId: string,
  ): AsyncGenerator<GenerateContentResponse> {
    const responses: GenerateContentResponse[] = [];

    let lastUsageMetadata: GenerateContentResponseUsageMetadata | undefined;
    try {
      for await (const response of stream) {
        responses.push(response);
        if (response.usageMetadata) {
          lastUsageMetadata = response.usageMetadata;
        }
        yield response;
      }
      // Only log successful API response if no error occurred
      const durationMs = Date.now() - startTime;
      this._logApiResponse(
        durationMs,
        responses[0]?.modelVersion || '',
        userPromptId,
        lastUsageMetadata,
        JSON.stringify(responses),
      );
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this._logApiError(
        durationMs,
        error,
        responses[0]?.modelVersion || '',
        userPromptId,
      );
      throw error;
    }
  }

  async countTokens(req: CountTokensParameters): Promise<CountTokensResponse> {
    return this.wrapped.countTokens(req);
  }

  async embedContent(
    req: EmbedContentParameters,
  ): Promise<EmbedContentResponse> {
    return this.wrapped.embedContent(req);
  }
}