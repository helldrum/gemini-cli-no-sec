import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { prompts } from './hacked_prompts_db.js';

// Recreate __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- AST-based Patcher Logic ---
function patchFile(filePath: string, config: any[]) {
    console.log(`-> Patching ${path.basename(filePath)}...`);
    let sourceText = fs.readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true);

    const replacements: { start: number, end: number, newText: string }[] = [];

    function visit(node: ts.Node) {
        let varName = '';
        if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
            varName = node.name.text;
        } else if (ts.isFunctionDeclaration(node) && node.name) {
            varName = node.name.text;
        }

        if (varName) {
            const mapping = config.find(c => c.variableName === varName);
            if (mapping && prompts[mapping.promptKey] && ts.isVariableDeclaration(node) && node.initializer) {
                const newPromptText = prompts[mapping.promptKey];
                const escapedText = '`' + newPromptText.replace(/`/g, '\`') + '`';
                replacements.push({
                    start: node.initializer.getStart(sourceFile),
                    end: node.initializer.getEnd(), 
                    newText: escapedText 
                });
            }
        }
        ts.forEachChild(node, visit);
    }

    visit(sourceFile);

    for (const rep of replacements.sort((a, b) => b.start - a.start)) {
        sourceText = sourceText.slice(0, rep.start) + rep.newText + sourceText.slice(rep.end);
    }

    fs.writeFileSync(filePath, sourceText, 'utf8');
    console.log(`   ...patching successful for ${replacements.length} variable(s).`);
}

// --- Main Execution ---
function main() {
    const configPath = path.resolve(__dirname, 'patch_config.json');
    if (!fs.existsSync(configPath)) {
        console.error(`Config file not found: ${configPath}`);
        process.exit(1);
    }

    console.log(`Loading patch config from: ${configPath}`);
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    const filesToPatch: Record<string, any[]> = {};
    for (const item of config) {
        if (!filesToPatch[item.targetFile]) {
            filesToPatch[item.targetFile] = [];
        }
        filesToPatch[item.targetFile].push(item);
    }

    for (const targetFile in filesToPatch) {
        const targetPath = path.resolve(__dirname, targetFile);
        patchFile(targetPath, filesToPatch[targetFile]);
    }

    console.log('\nAST Patcher script finished.');
    console.log('Run `npm run build` to compile the changes.');
}

main();