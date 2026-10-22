#!/usr/bin/env bash
# Assembles the Lovable / Google AI Studio build pack into dist/build-pack and dist/build-pack.zip
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/dist/build-pack"
rm -rf "$OUT" "$ROOT/dist/build-pack.zip"
mkdir -p "$OUT/content/topics" "$OUT/assets" "$OUT/reference-code"
cp "$ROOT"/docs/ai-builders/*.md "$OUT/"
node "$ROOT/scripts/build-handbook.js" "$OUT/content" >/dev/null
cp "$ROOT/content/courses.json" "$OUT/content/"
cp "$ROOT"/content/topics/*.json "$OUT/content/topics/"
cp "$ROOT/public/mr-garry.webp" "$OUT/assets/"
[ -f "$ROOT/public/mr-garry.png" ] && cp "$ROOT/public/mr-garry.png" "$OUT/assets/"
git -C "$ROOT" archive --format=tar HEAD | tar -x -C "$OUT/reference-code"
(cd "$ROOT/dist" && zip -qr build-pack.zip build-pack)
echo "Wrote dist/build-pack and dist/build-pack.zip"
