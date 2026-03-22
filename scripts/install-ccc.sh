#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCOPE="user"
PROJECT_PATH=""
INSTALL_CLI=1
INSTALL_SKILL=1
TOOL="auto"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/install-ccc.sh --user
  ./scripts/install-ccc.sh --project <path>

Options:
  --user           Install the ccc skill into ~/.codex/skills
  --project <path> Install the ccc skill into <path>/.codex/skills
  --skill-only     Install only the local ccc skill
  --cli-only       Install only the cocoindex-code CLI
  --pipx           Prefer pipx for CLI installation
  --uv             Prefer uv for CLI installation
  -h, --help       Show this help
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --user)
      SCOPE="user"
      shift
      ;;
    --project)
      SCOPE="project"
      PROJECT_PATH="${2:-}"
      if [ -z "$PROJECT_PATH" ]; then
        echo "Missing project path for --project" >&2
        exit 1
      fi
      shift 2
      ;;
    --skill-only)
      INSTALL_CLI=0
      shift
      ;;
    --cli-only)
      INSTALL_SKILL=0
      shift
      ;;
    --pipx)
      TOOL="pipx"
      shift
      ;;
    --uv)
      TOOL="uv"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [ "$INSTALL_CLI" -eq 0 ] && [ "$INSTALL_SKILL" -eq 0 ]; then
  echo "Nothing to do." >&2
  exit 1
fi

install_cli_with_pipx() {
  if ! command -v pipx >/dev/null 2>&1; then
    return 1
  fi

  if pipx install cocoindex-code; then
    return 0
  fi

  pipx upgrade cocoindex-code
}

install_cli_with_uv() {
  if ! command -v uv >/dev/null 2>&1; then
    return 1
  fi

  uv tool install --upgrade cocoindex-code --prerelease explicit --with "cocoindex>=1.0.0a24"
}

install_cli() {
  echo "Installing cocoindex-code CLI..."

  case "$TOOL" in
    pipx)
      install_cli_with_pipx || {
        echo "pipx is not available or failed." >&2
        exit 1
      }
      ;;
    uv)
      install_cli_with_uv || {
        echo "uv is not available or failed." >&2
        exit 1
      }
      ;;
    auto)
      if install_cli_with_pipx; then
        :
      elif install_cli_with_uv; then
        :
      else
        echo "Neither pipx nor uv is available. Install one of them, or rerun with --skill-only." >&2
        exit 1
      fi
      ;;
  esac
}

install_skill() {
  echo "Installing local ccc skill..."

  if ! command -v node >/dev/null 2>&1; then
    echo "Node.js is required to install the local skill." >&2
    exit 1
  fi

  if [ "$SCOPE" = "user" ]; then
    node "$ROOT_DIR/bin/codexskills.js" --user "$ROOT_DIR/skills/ccc"
  else
    node "$ROOT_DIR/bin/codexskills.js" --project "$ROOT_DIR/skills/ccc" "$PROJECT_PATH"
  fi
}

if [ "$INSTALL_CLI" -eq 1 ]; then
  install_cli
fi

if [ "$INSTALL_SKILL" -eq 1 ]; then
  install_skill
fi

echo "ccc bootstrap complete."
