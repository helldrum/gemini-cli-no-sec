import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const sourceYaml = 'generated_prompts/hacked_prompts.yaml';
const destDir = 'hacked_prompts_source';

try {
    console.log(`Reading prompts from ${sourceYaml}...`);
    const yamlContent = fs.readFileSync(sourceYaml, 'utf8');
    const prompts = yaml.load(yamlContent);

    // --- CORE_SYSTEM_PROMPT ---
    // Combine the base, git, and sandbox rules into one core prompt
    const coreSystemPrompt = [
        prompts.base_prompt,
        prompts.git_rules,
        prompts.sandbox_rules
    ].filter(Boolean).join('\n\n'); // Join with double newline, filter out any empty sections
    
    if (coreSystemPrompt) {
        fs.writeFileSync(path.join(destDir, 'CORE_SYSTEM_PROMPT.txt'), coreSystemPrompt, 'utf8');
        console.log(`Wrote CORE_SYSTEM_PROMPT.txt`);
    }

    // --- COMPRESSION_PROMPT ---
    if (prompts.compression_prompt) {
        fs.writeFileSync(path.join(destDir, 'COMPRESSION_PROMPT.txt'), prompts.compression_prompt, 'utf8');
        console.log(`Wrote COMPRESSION_PROMPT.txt`);
    }

    // --- SUMMARIZE_TOOL_OUTPUT_PROMPT ---
    if (prompts.summarize_tool_output_prompt) {
        fs.writeFileSync(path.join(destDir, 'SUMMARIZE_TOOL_OUTPUT_PROMPT.txt'), prompts.summarize_tool_output_prompt, 'utf8');
        console.log(`Wrote SUMMARIZE_TOOL_OUTPUT_PROMPT.txt`);
    }

    // --- EDIT_SYS_PROMPT ---
    // Note: The YAML key is llm_edit_fixer_prompt
    if (prompts.llm_edit_fixer_prompt) {
        fs.writeFileSync(path.join(destDir, 'EDIT_SYS_PROMPT.txt'), prompts.llm_edit_fixer_prompt, 'utf8');
        console.log(`Wrote EDIT_SYS_PROMPT.txt`);
    }
    
    // Note: EDIT_USER_PROMPT does not exist in the source YAML, so its .txt file will remain as-is.

    console.log('\nMigration complete!');

} catch (error) {
    console.error('An error occurred during the prompt migration:', error);
    process.exit(1);
}
