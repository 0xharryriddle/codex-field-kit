#!/usr/bin/env bash

DEST_DIR="$HOME/.codex/agents"

# Show usage if no arguments are provided
if [ "$#" -eq 0 ]; then
    echo "Usage: ./installer.sh [agent_name1] [agent_name2] ..."
    echo "Example: ./installer.sh backend-developer python-pro"
    echo "To copy everything: ./installer.sh all"
    exit 1
fi

# Ensure destination exists
mkdir -p "$DEST_DIR"
echo "📂 Destination ready: $DEST_DIR"

# Handle the "all" case
if [ "$1" = "all" ]; then
    echo "Copying all agents..."
    # Copy all .toml files from subdirectories, ignoring READMEs
    cp categories/*/*.toml "$DEST_DIR/" 2>/dev/null
    echo "🎉 All agents copied successfully!"
    exit 0
fi

# Loop through all provided arguments
for agent in "$@"; do
    # Automatically add .toml if you forgot to type it
    if [[ "$agent" != *.toml ]]; then
        agent="${agent}.toml"
    fi

    # Search for the file inside the categories folder
    found_file=$(find categories -type f -name "$agent" | head -n 1)

    if [ -z "$found_file" ]; then
        echo "❌ Not found: $agent"
    else
        cp "$found_file" "$DEST_DIR/"
        echo "✅ Copied: $agent"
    fi
done

echo "🚀 Finished installing agents!"
