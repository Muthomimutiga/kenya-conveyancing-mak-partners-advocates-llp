#!/usr/bin/env bash
# Build the self-contained document generator. The plugin directory is read only in the CoWork
# sandbox, so dependencies are inlined here and the bundle is committed.
#   ./build-bundle.sh          build
#   ./build-bundle.sh --check  exit 1 if the bundle is older than any of its sources
set -euo pipefail
cd "$(dirname "$0")"
for cand in . ./kenya-conveyancing ./plugins/kenya-conveyancing; do
  [[ -f "$cand/scripts/generate-conveyancing-document.js" ]] && { PLUGIN_DIR="$cand"; break; }
done
: "${PLUGIN_DIR:?no plugin directory found beside this script}"
S="$PLUGIN_DIR/scripts"; SRC="generate-conveyancing-document.js"; BUNDLE="$S/${SRC%.js}.bundle.js"
if [[ "${1:-}" == "--check" ]]; then
  [[ -f "$BUNDLE" ]] || { echo "MISSING  $BUNDLE"; exit 1; }
  for f in "$S/$SRC" "$S/firm-letter.js" "$S/config.js"; do
    [[ "$f" -nt "$BUNDLE" ]] && { echo "STALE    $BUNDLE is older than $(basename "$f")"; exit 1; }
  done
  echo "OK       $BUNDLE"; exit 0
fi
( cd "$S" && ( [[ -d node_modules ]] || npm install --no-audit --no-fund --silent ) )
( cd "$S" && npx --yes esbuild "$SRC" --bundle --platform=node --target=node18 --outfile="${SRC%.js}.bundle.js" --log-level=warning )
echo "built $BUNDLE"
