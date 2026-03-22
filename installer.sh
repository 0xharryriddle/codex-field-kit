#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$ROOT_DIR/agents"
DEST_DIR="$HOME/.codex/agents"

print_banner() {
  cat <<'EOF'
   _____          _            ______ _      _     _   _  ___ _
  / ____|        | |          |  ____(_)    | |   | | | ||_  | |
 | |     ___   __| | _____  __| |__   _  ___| | __| | | | _| | |_
 | |    / _ \ / _` |/ _ \ \/ /|  __| | |/ _ \ |/ /| | | ||_  | __|
 | |___| (_) | (_| |  __/>  < | |    | |  __/   < | |_| | / /| |_
  \_____\___/ \__,_|\___/_/\_\|_|    |_|\___|_|\_\ \___/ /___|\__|

  Codex Field Kit
EOF
  echo
}

if [ "$#" -eq 0 ]; then
  print_banner
  echo "Usage: ./installer.sh [agent_name1] [agent_name2] ..."
  echo "Example: ./installer.sh reviewer architect worker_mini"
  echo "To copy everything: ./installer.sh all"
  exit 1
fi

print_banner
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
