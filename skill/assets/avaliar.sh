#!/usr/bin/env bash
# Executa um arquivo .js no portal sem sofrer com quoting do shell.
set -euo pipefail
PORTAL="$1"
ARQ="$2"
CLI="${MAESTRI_CLI:-maestri}"
B64=$(base64 -w0 "$ARQ" 2>/dev/null || base64 "$ARQ" | tr -d '\n')
LOADER="eval(new TextDecoder().decode(Uint8Array.from(atob('$B64'), c => c.charCodeAt(0))))"
"$CLI" portal evaluate "$PORTAL" "$LOADER"
