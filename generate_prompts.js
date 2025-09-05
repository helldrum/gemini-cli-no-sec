import { getCoreSystemPrompt, getCompressionPrompt } from './packages/core/dist/src/core/prompts.js';
import { getEnvironmentContext } from './packages/core/dist/src/utils/environmentContext.js';
import { SUMMARIZE_TOOL_OUTPUT_PROMPT } from './packages/core/dist/src/utils/summarizer.js';
import { EDIT_SYS_PROMPT } from './packages/core/dist/src/utils/llm-edit-fixer.js';
// import { DEFAULT_CONTEXT_FILENAME } from './packages/core/dist/src/tools/memoryTool.js'; // Not used
// import { WorkspaceContext } from './packages/core/dist/src/utils/workspaceContext.js'; // Not directly used in MockConfig super
import { Config } from './packages/core/dist/src/config/config.js'; // For config mocking
import fs from 'fs';
import path from 'path';
import os from 'os';

// Mock Config and WorkspaceContext for controlled environment
class MockConfig extends Config {
    constructor(options = {}) {
        const targetDir = options.targetDir ?? '/home/jchardon/projects/gemini-cli-no-sec';
        super({
            targetDir: targetDir, // Pass targetDir explicitly
            sessionId: 'mock-session-id', // sessionId is required by ConfigParameters
            model: 'gemini-pro', // model is required by ConfigParameters
            debugMode: false, // debugMode is required by ConfigParameters
            cwd: process.cwd(), // cwd is required by ConfigParameters
            ...options,
            telemetry: { enabled: false, logPrompts: false }, // Disable telemetry for clean output
        });
        this._isGitRepo = options.isGitRepo ?? false;
        this._ideMode = options.ideMode ?? false;
        this._fullContext = options.fullContext ?? false;
        this._targetDir = targetDir;
        this._workspaceDirs = options.workspaceDirs ?? [this._targetDir];
    }

    isGitRepo() { return this._isGitRepo; }
    getIdeMode() { return this._ideMode; }
    getFullContext() { return this._fullContext; }
    getTargetDir() { return this._targetDir; }
    getWorkspaceContext() {
        // Return a mock WorkspaceContext that uses our controlled directories
        return {
            getDirectories: () => this._workspaceDirs,
            isPathWithinWorkspace: (p) => this._workspaceDirs.some(dir => p.startsWith(dir)),
        };
    }
}

async function generateAndSavePrompt(filename, promptContent) {
    const filePath = path.join(process.cwd(), filename);
    fs.writeFileSync(filePath, promptContent, 'utf8');
    console.log(`Generated: ${filePath}`);
}

async function main() {
    const outputDir = 'generated_prompts';
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }
    process.chdir(outputDir); // Change to output directory

    // --- 1. Main System Prompt (getCoreSystemPrompt) ---

    // Base prompt
    let config = new MockConfig();
    let prompt = getCoreSystemPrompt();
    await generateAndSavePrompt('core_system_prompt_base.txt', prompt);

    // With Git context
    config = new MockConfig({ isGitRepo: true });
    prompt = getCoreSystemPrompt();
    await generateAndSavePrompt('core_system_prompt_git.txt', prompt);

    // With Sandbox context
    process.env.SANDBOX = 'true'; // Simulate sandbox env var
    config = new MockConfig();
    prompt = getCoreSystemPrompt();
    await generateAndSavePrompt('core_system_prompt_sandbox.txt', prompt);
    delete process.env.SANDBOX; // Clean up

    // With User Memory
    const userMemory = `My favorite color is blue.\nMy preferred coding style is functional.`;
    config = new MockConfig();
    prompt = getCoreSystemPrompt(userMemory);
    await generateAndSavePrompt('core_system_prompt_user_memory.txt', prompt);

    // --- 2. Environment Context (getEnvironmentContext) ---
    // This one is dynamic, so we'll generate it with current system info
    config = new MockConfig({ targetDir: '/home/jchardon/projects/gemini-cli-no-sec' });
    const envParts = await getEnvironmentContext(config);
    await generateAndSavePrompt('environment_context_basic.txt', envParts[0].text);

    // With full file context (simulated)
    config = new MockConfig({ fullContext: true, targetDir: '/home/jchardon/projects/gemini-cli-no-sec' });
    // Mock read_many_files tool for getEnvironmentContext to work
    config.getToolRegistry = () => ({
        getTool: (name) => {
            if (name === 'read_many_files') {
                return {
                    call: async (params) => ({
                        llmContent: `--- /path/to/file1.txt ---\nContent of file 1\n--- /path/to/file2.ts ---\nContent of file 2\n--- End of content ---`
                    })
                };
            }
            return null;
        }
    });
    const envPartsFull = await getEnvironmentContext(config);
    await generateAndSavePrompt('environment_context_full_file.txt', envPartsFull[0].text);


    // --- 3. Compression Prompt (getCompressionPrompt) ---
    config = new MockConfig();
    prompt = getCompressionPrompt();
    await generateAndSavePrompt('compression_prompt.txt', prompt);

    // --- 4. Summarize Tool Output Prompt (SUMMARIZE_TOOL_OUTPUT_PROMPT) ---
    await generateAndSavePrompt('summarize_tool_output_prompt.txt', SUMMARIZE_TOOL_OUTPUT_PROMPT);

    // --- 5. LLM Edit Fixer System Prompt (EDIT_SYS_PROMPT) ---
    await generateAndSavePrompt('llm_edit_fixer_sys_prompt.txt', EDIT_SYS_PROMPT);

    console.log(`All prompts generated in ${outputDir}/`);
}

main().catch(console.error);
