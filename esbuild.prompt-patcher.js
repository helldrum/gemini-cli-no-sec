import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const promptPatcherPlugin = {
  name: 'prompt-patcher',
  setup(build) {
    const createFileFilter = (filePath) => {
      const escapedPath = path.resolve(__dirname, filePath).replace(/\\/g, '\\\\');
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
  },
};

export default promptPatcherPlugin;