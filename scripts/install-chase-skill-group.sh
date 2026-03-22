#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE_DIR="$ROOT_DIR/archive/upstream/chasebuild-agent-skills"
FORCE=0
TARGET_SCOPE="project"
PROJECT_PATH="$(pwd)"
PASS_THROUGH_ARGS=()
HAS_YES=0

usage() {
  cat <<'EOF'
Usage:
  ./scripts/install-chase-skill-group.sh <group> [options] [skills-add-args...]

Groups:
  context-engineering
  git
  react
  rust
  web3

Examples:
  ./scripts/install-chase-skill-group.sh git -g
  ./scripts/install-chase-skill-group.sh react
  ./scripts/install-chase-skill-group.sh rust -g -y
  ./scripts/install-chase-skill-group.sh context-engineering --project ./my-repo

This wrapper delegates to:
  npx skills add <local-group-path> ...

Behavior:
  - Existing installed skills are skipped by default.
  - Use --force to reinstall the whole group.
  - This wrapper runs non-interactively by default.
EOF
}

if [ "$#" -eq 0 ]; then
  usage
  exit 1
fi

case "${1:-}" in
  -h|--help)
    usage
    exit 0
    ;;
esac

GROUP="$1"
shift

case "$GROUP" in
  context-engineering|git|react|rust|web3)
    ;;
  *)
    echo "Unknown group: $GROUP" >&2
    usage >&2
    exit 1
    ;;
esac

GROUP_PATH="$BASE_DIR/$GROUP"

if [ ! -d "$GROUP_PATH" ]; then
  echo "Group path not found: $GROUP_PATH" >&2
  exit 1
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "npx is required to install Chasebuild skill groups." >&2
  exit 1
fi

while [ "$#" -gt 0 ]; do
  case "$1" in
    -g|--global)
      TARGET_SCOPE="user"
      PASS_THROUGH_ARGS+=("$1")
      shift
      ;;
    --project)
      TARGET_SCOPE="project"
      PROJECT_PATH="${2:-}"
      if [ -z "$PROJECT_PATH" ]; then
        echo "Missing path for --project" >&2
        exit 1
      fi
      shift 2
      ;;
    --force)
      FORCE=1
      shift
      ;;
    -y|--yes)
      HAS_YES=1
      PASS_THROUGH_ARGS+=("$1")
      shift
      ;;
    *)
      PASS_THROUGH_ARGS+=("$1")
      shift
      ;;
  esac
done

TARGET_ROOT="$PROJECT_PATH/.agents/skills"
if [ "$TARGET_SCOPE" = "user" ]; then
  TARGET_ROOT="$HOME/.agents/skills"
fi

if [ "$HAS_YES" -eq 0 ]; then
  PASS_THROUGH_ARGS+=("-y")
fi

mapfile -t GROUP_SKILLS < <(find "$GROUP_PATH/skills" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort)

if [ "${#GROUP_SKILLS[@]}" -eq 0 ]; then
  echo "No skills found in group: $GROUP" >&2
  exit 1
fi

missing_count=0
tmp_group=""

cleanup() {
  if [ -n "$tmp_group" ] && [ -d "$tmp_group" ]; then
    rm -rf "$tmp_group"
  fi
}

trap cleanup EXIT

if [ "$FORCE" -eq 0 ]; then
  mkdir -p "$TARGET_ROOT"
  tmp_group="$(mktemp -d)"
  cp -r "$GROUP_PATH"/. "$tmp_group"/

  for skill in "${GROUP_SKILLS[@]}"; do
    if [ -d "$TARGET_ROOT/$skill" ]; then
      rm -rf "$tmp_group/skills/$skill"
    else
      missing_count=$((missing_count + 1))
    fi
  done

  if [ "$missing_count" -eq 0 ]; then
    echo "All skills from '$GROUP' are already installed in $TARGET_ROOT"
    exit 0
  fi

  echo "Installing $missing_count missing skill(s) from '$GROUP' into $TARGET_ROOT"
  if [ "$TARGET_SCOPE" = "project" ]; then
    cd "$PROJECT_PATH"
  fi
  exec npx skills add "$tmp_group" "${PASS_THROUGH_ARGS[@]}"
fi

echo "Reinstalling full group '$GROUP'"
if [ "$TARGET_SCOPE" = "project" ]; then
  cd "$PROJECT_PATH"
fi
exec npx skills add "$GROUP_PATH" "${PASS_THROUGH_ARGS[@]}"
