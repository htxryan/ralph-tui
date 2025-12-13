#!/bin/bash

ENV_BEFORE=$(export -p | sort)

# Run your setup commands that modify the environment
source ~/.nvm/nvm.sh
nvm use 20

if [ -n "$CLAUDE_ENV_FILE" ]; then
  ENV_AFTER=$(export -p | sort)
  comm -13 <(echo "$ENV_BEFORE") <(echo "$ENV_AFTER") >> "$CLAUDE_ENV_FILE"
fi

# TODO RH: "prompt.md" is not right here, it needs to be either orchestrate.md or the project's execute.md
echo -e "\n\nIMPORTANT: You MUST re-read \`./CLAUDE.md\` and \`./.ralph/prompt.md\`\n\n"

exit 0