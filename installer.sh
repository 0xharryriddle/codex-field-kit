#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$ROOT_DIR/agents"
DEST_DIR="$HOME/.codex/agents"

if [ "$#" -eq 0 ]; then
  echo "Usage: ./installer.sh [agent_name1] [agent_name2] ..."
  echo "Example: ./installer.sh reviewer architect worker_mini"
  echo "To copy everything: ./installer.sh all"
  exit 1
fi

mkdir -p "$DEST_DIR"
echo "Destination ready: $DEST_DIR"

if [ "$1" = "all" ]; then
  echo "Copying all agents from $SOURCE_DIR"
  find "$SOURCE_DIR" -type f -name '*.toml' -exec cp {} "$DEST_DIR/" \;
  echo "All agents copied."
  exit 0
fi

for agent in "$@"; do
  if [[ "$agent" != *.toml ]]; then
    agent="${agent}.toml"
  fi

  found_file="$(find "$SOURCE_DIR" -type f -name "$agent" | head -n 1)"

  if [ -z "$found_file" ]; then
    echo "Not found: $agent"
    continue
  fi

  cp "$found_file" "$DEST_DIR/"
  echo "Copied: $(basename "$found_file")"
done

echo "Finished."
