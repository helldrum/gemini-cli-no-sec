/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  CommandContext,
  SlashCommand,
  SlashCommandActionReturn,
} from './types.js';
import { CommandKind } from './types.js';

declare const __dirname: string;

const INIT_COMMAND_PROMPT = fs.readFileSync(path.join(__dirname, 'hacked_prompts_source/INIT_COMMAND_PROMPT.txt'), 'utf8').trim();

export const initCommand: SlashCommand = {
  name: 'init',
  description: 'Analyzes the project and creates a tailored GEMINI.md file.',
  kind: CommandKind.BUILT_IN,
  action: async (
    context: CommandContext,
    _args: string,
  ): Promise<SlashCommandActionReturn> => {
    if (!context.services.config) {
      return {
        type: 'message',
        messageType: 'error',
        content: 'Configuration not available.',
      };
    }
    const targetDir = context.services.config.getTargetDir();
    const geminiMdPath = path.join(targetDir, 'GEMINI.md');

    if (fs.existsSync(geminiMdPath)) {
      return {
        type: 'message',
        messageType: 'info',
        content:
          'A GEMINI.md file already exists in this directory. No changes were made.',
      };
    }

    // Create an empty GEMINI.md file
    fs.writeFileSync(geminiMdPath, '', 'utf8');

    context.ui.addItem(
      {
        type: 'info',
        text: 'Empty GEMINI.md created. Now analyzing the project to populate it.',
      },
      Date.now(),
    );

    return {
      type: 'submit_prompt',
      content: INIT_COMMAND_PROMPT,
    };
  },
};
