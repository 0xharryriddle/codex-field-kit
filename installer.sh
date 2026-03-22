#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$ROOT_DIR/agents"
DEST_DIR="$HOME/.codex/agents"

declare -a AGENT_FILES=()
declare -a MATCHES=()
declare -A BASENAME_COUNTS=()

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

usage() {
  print_banner
  echo "Usage: ./installer.sh [agent_name1] [agent_name2] ..."
  echo "Example: ./installer.sh reviewer worker_mini"
  echo "Qualified duplicate example: ./installer.sh root__architect architecture-orchestration/architect"
  echo "To copy everything: ./installer.sh all"
}

load_agent_index() {
  while IFS= read -r file; do
    AGENT_FILES+=("$file")
    local base
    base="$(basename "$file")"
    if [[ -v BASENAME_COUNTS["$base"] ]]; then
      BASENAME_COUNTS["$base"]=$(( BASENAME_COUNTS["$base"] + 1 ))
    else
      BASENAME_COUNTS["$base"]=1
    fi
  done < <(find "$SOURCE_DIR" -type f -name '*.toml' | sort)
}

relative_agent_path() {
  printf '%s\n' "${1#$SOURCE_DIR/}"
}

normalize_selector() {
  local selector="$1"
  selector="${selector#agents/}"
  selector="${selector%.toml}"
  printf '%s\n' "$selector"
}

agent_install_stem() {
  local file="$1"
  local rel base stem

  rel="$(relative_agent_path "$file")"
  base="$(basename "$rel")"
  stem="${rel%.toml}"

  if (( BASENAME_COUNTS["$base"] > 1 )); then
    if [[ "$rel" == "$base" ]]; then
      stem="root__${stem}"
    else
      stem="${stem//\//__}"
    fi
  else
    stem="${base%.toml}"
  fi

  printf '%s\n' "$stem"
}

agent_install_name() {
  printf '%s.toml\n' "$(agent_install_stem "$1")"
}

archive_legacy_duplicate_copy() {
  local file="$1"
  local base legacy_path backup_dir backup_path backup_stem candidate

  base="$(basename "$file")"
  if (( BASENAME_COUNTS["$base"] <= 1 )); then
    return
  fi

  legacy_path="$DEST_DIR/$base"
  if [[ ! -f "$legacy_path" ]]; then
    return
  fi

  for candidate in "${AGENT_FILES[@]}"; do
    if [[ "$(basename "$candidate")" != "$base" ]]; then
      continue
    fi

    if cmp -s "$legacy_path" "$candidate"; then
      backup_dir="$DEST_DIR/.field-kit-legacy"
      mkdir -p "$backup_dir"
      backup_stem="${base%.toml}.legacy"
      backup_path="$backup_dir/${backup_stem}.toml"

      if [[ -e "$backup_path" ]]; then
        local suffix=1
        while [[ -e "$backup_dir/${backup_stem}-${suffix}.toml" ]]; do
          suffix=$(( suffix + 1 ))
        done
        backup_path="$backup_dir/${backup_stem}-${suffix}.toml"
      fi

      mv "$legacy_path" "$backup_path"
      echo "Archived legacy flat duplicate: $legacy_path -> $backup_path"
      return
    fi
  done

  echo "Warning: leaving existing $legacy_path in place because it does not match any bundled duplicate agent."
}

copy_agent_file() {
  local file="$1"
  local dest_name

  dest_name="$(agent_install_name "$file")"
  archive_legacy_duplicate_copy "$file"
  cp "$file" "$DEST_DIR/$dest_name"
  echo "Copied: $(relative_agent_path "$file") -> $dest_name"
}

collect_matches() {
  local selector="$1"
  local normalized rel rel_stem base_stem install_stem file

  MATCHES=()
  normalized="$(normalize_selector "$selector")"

  for file in "${AGENT_FILES[@]}"; do
    rel="$(relative_agent_path "$file")"
    rel_stem="${rel%.toml}"
    base_stem="$(basename "${rel%.toml}")"
    install_stem="$(agent_install_stem "$file")"

    if [[ "$normalized" == "$rel_stem" || "$normalized" == "$base_stem" || "$normalized" == "$install_stem" ]]; then
      MATCHES+=("$file")
    fi
  done
}

print_ambiguous_matches() {
  local selector="$1"
  local file rel

  echo "Ambiguous agent selector: $selector"
  echo "Use one of:"
  for file in "${MATCHES[@]}"; do
    rel="$(relative_agent_path "$file")"
    echo "  - ${rel%.toml} -> $(agent_install_stem "$file")"
  done
}

install_all_agents() {
  local file count

  count=0
  echo "Copying all agents from $SOURCE_DIR"
  for file in "${AGENT_FILES[@]}"; do
    copy_agent_file "$file"
    count=$(( count + 1 ))
  done
  echo "Installed $count agent files into $DEST_DIR"
}

if [ "$#" -eq 0 ]; then
  usage
  exit 1
fi

load_agent_index
print_banner
mkdir -p "$DEST_DIR"
echo "Destination ready: $DEST_DIR"

if [ "$1" = "all" ]; then
  install_all_agents
  echo "Finished."
  exit 0
fi

status=0
for agent in "$@"; do
  collect_matches "$agent"

  if [ "${#MATCHES[@]}" -eq 0 ]; then
    echo "Not found: $agent"
    status=1
    continue
  fi

  if [ "${#MATCHES[@]}" -gt 1 ]; then
    print_ambiguous_matches "$agent"
    status=1
    continue
  fi

  copy_agent_file "${MATCHES[0]}"
done

echo "Finished."
exit "$status"
