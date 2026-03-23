#!/bin/sh

set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
SOURCE_DIR="$ROOT_DIR/agents"
DEST_DIR="$HOME/.codex/agents"
LEGACY_DIR="$HOME/.codex/.field-kit-legacy"

TMP_DIR=''
AGENT_LIST=''
BASENAME_COUNTS=''
MATCHES_FILE=''
MATCH_COUNT=0

cleanup() {
  if [ -n "$TMP_DIR" ] && [ -d "$TMP_DIR" ]; then
    rm -rf "$TMP_DIR"
  fi
}

trap cleanup EXIT HUP INT TERM

create_temp_dir() {
  TMP_DIR=$(mktemp -d "${TMPDIR:-/tmp}/codex-field-kit-installer.XXXXXX")
  AGENT_LIST="$TMP_DIR/agent-files.txt"
  BASENAME_COUNTS="$TMP_DIR/basename-counts.txt"
  MATCHES_FILE="$TMP_DIR/matches.txt"
  : > "$AGENT_LIST"
  : > "$BASENAME_COUNTS"
  : > "$MATCHES_FILE"
}

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
  find "$SOURCE_DIR" -type f -name '*.toml' | LC_ALL=C sort > "$AGENT_LIST"
  awk -F/ '
    { counts[$NF]++ }
    END {
      for (base in counts) {
        printf "%s\t%d\n", base, counts[base]
      }
    }
  ' "$AGENT_LIST" | LC_ALL=C sort > "$BASENAME_COUNTS"
}

basename_count() {
  target_base=$1
  awk -F '\t' -v target="$target_base" '
    $1 == target { print $2; found = 1; exit }
    END { if (!found) print 0 }
  ' "$BASENAME_COUNTS"
}

relative_agent_path() {
  case "$1" in
    "$SOURCE_DIR"/*) printf '%s\n' "${1#"$SOURCE_DIR"/}" ;;
    *) printf '%s\n' "$1" ;;
  esac
}

normalize_selector() {
  selector=$1
  case "$selector" in
    agents/*) selector=${selector#agents/} ;;
  esac
  case "$selector" in
    *.toml) selector=${selector%.toml} ;;
  esac
  printf '%s\n' "$selector"
}

agent_install_stem() {
  file=$1
  rel=$(relative_agent_path "$file")
  base=$(basename "$rel")
  stem=${rel%.toml}
  base_count=$(basename_count "$base")

  if [ "$base_count" -gt 1 ]; then
    if [ "$rel" = "$base" ]; then
      stem="root__${stem}"
    else
      stem=$(printf '%s\n' "$stem" | sed 's|/|__|g')
    fi
  else
    stem=${base%.toml}
  fi

  printf '%s\n' "$stem"
}

agent_install_name() {
  printf '%s.toml\n' "$(agent_install_stem "$1")"
}

has_non_empty_name() {
  has_top_level_non_empty_field "$1" "name"
}

has_non_empty_description() {
  has_top_level_non_empty_field "$1" "description"
}

has_top_level_field() {
  field_file=$1
  field_key=$2
  awk -v key="$field_key" '
    BEGIN { in_multiline = 0; found = 0 }
    {
      line = $0

      if (in_multiline == 1) {
        if (line ~ /^[[:space:]]*"""/) {
          in_multiline = 0
        }
        next
      }

      if (line ~ /^[[:space:]]*#/ || line ~ /^[[:space:]]*$/) {
        next
      }

      if (line ~ /^[[:space:]]*[A-Za-z0-9_]+[[:space:]]*=[[:space:]]*"""/) {
        key_name = line
        sub(/^[[:space:]]*/, "", key_name)
        sub(/[[:space:]]*=.*/, "", key_name)
        gsub(/[[:space:]]+/, "", key_name)
        if (key_name == key) {
          found = 1
          exit
        }
        in_multiline = 1
        next
      }

      pattern = "^[[:space:]]*" key "[[:space:]]*="
      if (line ~ pattern) {
        found = 1
        exit
      }
    }
    END {
      if (found == 1) {
        exit 0
      }
      exit 1
    }
  ' "$field_file"
}

has_top_level_non_empty_field() {
  field_file=$1
  field_key=$2
  awk -v key="$field_key" '
    BEGIN { in_multiline = 0; found = 0; valid = 0 }
    {
      line = $0

      if (in_multiline == 1) {
        if (line ~ /^[[:space:]]*"""/) {
          in_multiline = 0
        }
        next
      }

      if (line ~ /^[[:space:]]*#/ || line ~ /^[[:space:]]*$/) {
        next
      }

      if (line ~ /^[[:space:]]*[A-Za-z0-9_]+[[:space:]]*=[[:space:]]*"""/) {
        key_name = line
        sub(/^[[:space:]]*/, "", key_name)
        sub(/[[:space:]]*=.*/, "", key_name)
        gsub(/[[:space:]]+/, "", key_name)
        if (key_name == key) {
          found = 1
          valid = 1
          exit
        }
        in_multiline = 1
        next
      }

      pattern = "^[[:space:]]*" key "[[:space:]]*="
      if (line ~ pattern) {
        value = line
        found = 1
        sub(pattern "[[:space:]]*", "", value)
        gsub(/^[[:space:]]+/, "", value)
        gsub(/[[:space:]]+$/, "", value)
        if (value ~ /^".*"$/) {
          sub(/^"/, "", value)
          sub(/"$/, "", value)
        }
        if (value != "") {
          valid = 1
        }
        exit
      }
    }
    END {
      if (found == 1 && valid == 1) {
        exit 0
      }
      exit 1
    }
  ' "$field_file"
}

has_developer_instructions() {
  has_top_level_field "$1" "developer_instructions"
}

has_model_field() {
  has_top_level_field "$1" "model"
}

is_installable_agent_role() {
  role_file=$1
  if has_developer_instructions "$role_file"; then
    return 0
  fi

  if has_model_field "$role_file"; then
    return 0
  fi

  return 1
}

write_normalized_agent_file() {
  source_file=$1
  dest_file=$2
  normalized_name=$3
  needs_name=0
  needs_description=0
  needs_instructions=0

  if ! has_non_empty_name "$source_file"; then
    needs_name=1
  fi

  if ! has_non_empty_description "$source_file"; then
    needs_description=1
  fi

  if ! has_developer_instructions "$source_file"; then
    needs_instructions=1
  fi

  if [ "$needs_name" -eq 0 ] && [ "$needs_description" -eq 0 ] && [ "$needs_instructions" -eq 0 ]; then
    cp "$source_file" "$dest_file" || return 1
    return
  fi

  {
    if [ "$needs_name" -eq 1 ]; then
      printf 'name = "%s"\n' "$normalized_name"
    fi

    if [ "$needs_description" -eq 1 ]; then
      printf 'description = "Auto-generated role for %s."\n' "$normalized_name"
    fi

    cat "$source_file"

    if [ "$needs_instructions" -eq 1 ]; then
      printf '\n'
      printf 'developer_instructions = """\n'
      printf 'You are the %s agent. Complete tasks directly, keep changes focused, and follow repository instructions.\n' "$normalized_name"
      printf '"""\n'
    fi
  } > "$dest_file" || return 1
}

archive_legacy_duplicate_copy() {
  file=$1
  base=$(basename "$file")
  base_count=$(basename_count "$base")

  if [ "$base_count" -le 1 ]; then
    return
  fi

  legacy_path="$DEST_DIR/$base"
  if [ ! -f "$legacy_path" ]; then
    return
  fi

  while IFS= read -r candidate; do
    [ -n "$candidate" ] || continue
    if [ "$(basename "$candidate")" != "$base" ]; then
      continue
    fi

    if cmp -s "$legacy_path" "$candidate"; then
      backup_dir="$LEGACY_DIR/flat-duplicates"
      backup_stem="${base%.toml}.legacy"
      backup_path="$backup_dir/${backup_stem}.toml"

      mkdir -p "$backup_dir"
      if [ -e "$backup_path" ]; then
        suffix=1
        while [ -e "$backup_dir/${backup_stem}-${suffix}.toml" ]; do
          suffix=$(( suffix + 1 ))
        done
        backup_path="$backup_dir/${backup_stem}-${suffix}.toml"
      fi

      mv "$legacy_path" "$backup_path"
      echo "Archived legacy flat duplicate: $legacy_path -> $backup_path"
      return
    fi
  done < "$AGENT_LIST"

  echo "Warning: leaving existing $legacy_path in place because it does not match any bundled duplicate agent."
}

archive_existing_non_role_file() {
  non_role_source=$1
  non_role_dest_name=$(agent_install_name "$non_role_source")
  non_role_dest_path="$DEST_DIR/$non_role_dest_name"

  if [ ! -f "$non_role_dest_path" ]; then
    return
  fi

  non_role_backup_dir="$LEGACY_DIR/non-role"
  non_role_backup_stem="${non_role_dest_name%.toml}.legacy"
  non_role_backup_path="$non_role_backup_dir/${non_role_backup_stem}.toml"

  mkdir -p "$non_role_backup_dir"
  if [ -e "$non_role_backup_path" ]; then
    non_role_suffix=1
    while [ -e "$non_role_backup_dir/${non_role_backup_stem}-${non_role_suffix}.toml" ]; do
      non_role_suffix=$(( non_role_suffix + 1 ))
    done
    non_role_backup_path="$non_role_backup_dir/${non_role_backup_stem}-${non_role_suffix}.toml"
  fi

  mv "$non_role_dest_path" "$non_role_backup_path"
  echo "Archived existing non-role file: $non_role_dest_path -> $non_role_backup_path"
}

migrate_legacy_archive_location() {
  old_legacy_dir="$DEST_DIR/.field-kit-legacy"
  new_legacy_dir="$LEGACY_DIR/from-agents"

  if [ ! -d "$old_legacy_dir" ]; then
    return
  fi

  mkdir -p "$new_legacy_dir"
  for old_item in "$old_legacy_dir"/*; do
    [ -e "$old_item" ] || continue
    old_base=$(basename "$old_item")
    new_item="$new_legacy_dir/$old_base"

    if [ -e "$new_item" ]; then
      old_suffix=1
      while [ -e "$new_legacy_dir/${old_base}-${old_suffix}" ]; do
        old_suffix=$(( old_suffix + 1 ))
      done
      new_item="$new_legacy_dir/${old_base}-${old_suffix}"
    fi

    mv "$old_item" "$new_item"
  done

  rmdir "$old_legacy_dir" 2>/dev/null || true
  echo "Migrated legacy archive directory: $old_legacy_dir -> $new_legacy_dir"
}

copy_agent_file() {
  file=$1
  dest_stem=$(agent_install_stem "$file")
  dest_name="${dest_stem}.toml"

  if ! is_installable_agent_role "$file"; then
    archive_existing_non_role_file "$file"
    echo "Skipped non-role TOML: $(relative_agent_path "$file")"
    return 1
  fi

  archive_legacy_duplicate_copy "$file"
  if ! write_normalized_agent_file "$file" "$DEST_DIR/$dest_name" "$dest_stem"; then
    echo "Failed to copy: $(relative_agent_path "$file") -> $dest_name" >&2
    return 1
  fi
  echo "Copied: $(relative_agent_path "$file") -> $dest_name"
  return 0
}

collect_matches() {
  selector=$1
  normalized=$(normalize_selector "$selector")
  : > "$MATCHES_FILE"

  while IFS= read -r file; do
    [ -n "$file" ] || continue
    rel=$(relative_agent_path "$file")
    rel_stem=${rel%.toml}
    base_stem=$(basename "$rel_stem")
    install_stem=$(agent_install_stem "$file")

    if [ "$normalized" = "$rel_stem" ] || [ "$normalized" = "$base_stem" ] || [ "$normalized" = "$install_stem" ]; then
      printf '%s\n' "$file" >> "$MATCHES_FILE"
    fi
  done < "$AGENT_LIST"

  MATCH_COUNT=$(wc -l < "$MATCHES_FILE" | tr -d '[:space:]')
  if [ -z "$MATCH_COUNT" ]; then
    MATCH_COUNT=0
  fi
}

print_ambiguous_matches() {
  selector=$1
  echo "Ambiguous agent selector: $selector"
  echo "Use one of:"

  while IFS= read -r file; do
    [ -n "$file" ] || continue
    rel=$(relative_agent_path "$file")
    echo "  - ${rel%.toml} -> $(agent_install_stem "$file")"
  done < "$MATCHES_FILE"
}

install_all_agents() {
  installed_count=0
  skipped_count=0
  echo "Copying all agents from $SOURCE_DIR"
  while IFS= read -r file; do
    [ -n "$file" ] || continue
    if copy_agent_file "$file"; then
      installed_count=$(( installed_count + 1 ))
    else
      skipped_count=$(( skipped_count + 1 ))
    fi
  done < "$AGENT_LIST"
  echo "Installed $installed_count agent files into $DEST_DIR"
  if [ "$skipped_count" -gt 0 ]; then
    echo "Skipped $skipped_count non-role TOML files."
  fi
}

if [ "$#" -eq 0 ]; then
  usage
  exit 1
fi

if [ ! -d "$SOURCE_DIR" ]; then
  echo "Missing source directory: $SOURCE_DIR" >&2
  exit 1
fi

create_temp_dir
load_agent_index
print_banner
mkdir -p "$DEST_DIR"
migrate_legacy_archive_location
echo "Destination ready: $DEST_DIR"

if [ "$1" = "all" ]; then
  install_all_agents
  echo "Finished."
  exit 0
fi

status=0
for agent in "$@"; do
  collect_matches "$agent"

  if [ "$MATCH_COUNT" -eq 0 ]; then
    echo "Not found: $agent"
    status=1
    continue
  fi

  if [ "$MATCH_COUNT" -gt 1 ]; then
    print_ambiguous_matches "$agent"
    status=1
    continue
  fi

  if ! copy_agent_file "$(sed -n '1p' "$MATCHES_FILE")"; then
    status=1
  fi
done

echo "Finished."
exit "$status"
