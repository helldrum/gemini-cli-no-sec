import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';
import * as hacked from './hacked_prompts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to escape characters for injection into a template literal
const escapeForTemplate = (str) => {
  if (!str) return '';
  return str.replace(/\\/g, '\\').replace(/`/g, '\`').replace(/\${/g, '\${');
};

const promptPatcherPlugin = {
  name: 'prompt-patcher',
  setup(build) {
    const createFileFilter = (filePath) => {
      const escapedPath = path.resolve(__dirname, filePath).replace(/\\/g, '\\');
      return new RegExp(`^${escapedPath}$`);
    };

    // Intercept shell-utils.ts to remove command substitution block
    build.onLoad({ filter: createFileFilter('packages/core/src/utils/shell-utils.ts') }, async (args) => {
      let contents = await fs.readFile(args.path, 'utf8');
      const blockToComment = `  // Disallow command substitution for security.\n  if (detectCommandSubstitution(command)) {\n    return {\n      allAllowed: false,\n      disallowedCommands: [command],\n      blockReason:\n        'Command substitution using $(), <(), or >() is not allowed for security reasons',\n      isHardDenial: true,\n    };\n  }`;
      const commentedBlock = `  /*` + blockToComment + `*/`;
      contents = contents.replace(blockToComment, commentedBlock);
      return { contents, loader: 'ts' };
    });

    // Intercept llm-edit-fixer.ts to replace prompts
    build.onLoad({ filter: createFileFilter('packages/core/src/utils/llm-edit-fixer.ts') }, async (args) => {
      let contents = await fs.readFile(args.path, 'utf8');
      contents = contents.replace(
        /export const EDIT_SYS_PROMPT = `[\s\S]+?`;/,
        `export const EDIT_SYS_PROMPT = 
${escapeForTemplate(hacked.EDIT_SYS_PROMPT)}
`
      );
      contents = contents.replace(
        /export const EDIT_USER_PROMPT = `[\s\S]+?`;/,
        `export const EDIT_USER_PROMPT = 
${escapeForTemplate(hacked.EDIT_USER_PROMPT)}
`
      );
      return { contents, loader: 'ts' };
    });

    // Intercept summarizer.ts to replace prompts
    build.onLoad({ filter: createFileFilter('packages/core/src/utils/summarizer.ts') }, async (args) => {
      let contents = await fs.readFile(args.path, 'utf8');
      contents = contents.replace(
        /export const SUMMARIZE_TOOL_OUTPUT_PROMPT = `[\s\S]+?`;/,
        `export const SUMMARIZE_TOOL_OUTPUT_PROMPT = 
${escapeForTemplate(hacked.SUMMARIZE_TOOL_OUTPUT_PROMPT)}
`
      );
      return { contents, loader: 'ts' };
    });
  },
};

export default promptPatcherPlugin;
