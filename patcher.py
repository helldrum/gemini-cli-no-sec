import sys
import os
import re
import json

def parse_simple_yaml(file_content):
    """Parses our specific YAML format."""
    prompts = {}
    regex = re.compile(r"^([a-zA-Z_]+):\s*|\n((?:^  .*\n?)*)", re.MULTILINE)
    matches = regex.finditer(file_content)
    for match in matches:
        key = match.group(1)
        value = re.sub(r"^  ", "", match.group(2), flags=re.MULTILINE).strip()
        prompts[key] = value
    return prompts

def monkey_patch(file_path, variable_name, new_content):
    """Inserts a re-declaration of a variable after its original declaration."""
    print(f"-> Patching variable '{variable_name}' in {os.path.basename(file_path)}...")

    if not os.path.exists(file_path):
        print(f"   ERROR: Target file not found: {file_path}")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Escape backticks and backslashes for the final string
    escaped_content = new_content.replace('\\', '\\\\').replace('`', '\`')
    patch_line = f"\n{variable_name} = `{escaped_content}`; // Injected by patcher.py\n"

    # Find the line where the variable is declared
    # This is brittle, but it's the core of the user's request
    # We look for `const variableName =` or `let variableName =`
    target_line_index = -1
    for i, line in enumerate(lines):
        if re.search(f"(const|let)\s+{variable_name}\s*=", line):
            target_line_index = i
            break
    
    if target_line_index == -1:
        print(f"   WARN: Could not find declaration for '{variable_name}'. Skipping.")
        return

    # Find the end of the declaration statement (the next semicolon)
    end_of_statement_index = -1
    for i in range(target_line_index, len(lines)):
        if ';' in lines[i]:
            end_of_statement_index = i
            break
    
    if end_of_statement_index == -1:
        print(f"   WARN: Could not find end of statement for '{variable_name}'. Skipping.")
        return

    # Insert the patch line after the statement
    lines.insert(end_of_statement_index + 1, patch_line)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    
    print(f"   ...patch successful.")

def main():
    """Main execution block."""
    if len(sys.argv) < 2:
        print("Usage: python3 patcher.py <path_to_prompts.yaml>")
        sys.exit(1)

    input_file = sys.argv[1]
    if not os.path.exists(input_file):
        print(f"Input file not found: {input_file}")
        sys.exit(1)

    config_path = os.path.join(os.path.dirname(__file__), 'patch_config.json')
    if not os.path.exists(config_path):
        print(f"Config file not found: {config_path}")
        sys.exit(1)

    print(f"Loading prompts from: {input_file}")
    with open(input_file, 'r', encoding='utf-8') as f:
        yaml_content = f.read()
    prompts = parse_simple_yaml(yaml_content)

    print(f"Loading patch config from: {config_path}")
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)

    for item in config:
        prompt_content = prompts.get(item['promptKey'])
        if prompt_content:
            target_path = os.path.join(os.path.dirname(__file__), item['targetFile'])
            # This approach has a major flaw: it can't patch local variables inside functions.
            # The user's idea is good but only works for top-level variables.
            # I will have to tell the user about this limitation.
            # For now, let's just try to patch the ones that are top-level.
            if item["variableName"] in ["SUMMARIZE_TOOL_OUTPUT_PROMPT", "EDIT_SYS_PROMPT"]:
                 monkey_patch(target_path, item['variableName'], prompt_content)
            else:
                print(f"-> Skipping '{item['variableName']}' as it is not a top-level variable that can be patched this way.")

    print("\nPatching script finished.")
    print("Run `npm run build` to compile the changes.")
