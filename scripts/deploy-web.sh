#!/usr/bin/env bash
# Deploy the Trove web app to GitHub Pages (gh-pages branch).
# - builds the Expo web bundle at the /Cloes-app base path
# - injects PWA bits (manifest + iOS meta) so Add to Home Screen feels native
# - publishes to gh-pages with SPA fallback
#
# Usage: scripts/deploy-web.sh "commit message"
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${DEPLOY_OUT:-/tmp/trove-pages}"
MSG="${1:-Deploy Trove web app}"
ORIGIN="$(git -C "$REPO_DIR" remote get-url origin)"

cd "$REPO_DIR"

# 1. Base path for GitHub Pages (reverted after export).
python3 - <<'PY'
import json
d = json.load(open('app.json'))
d['expo']['experiments']['baseUrl'] = '/Cloes-app'
json.dump(d, open('app.json', 'w'), indent=2)
PY
trap 'git -C "$REPO_DIR" checkout -- app.json' EXIT

# 2. Build.
rm -rf "$OUT"
npx expo export --platform web --output-dir "$OUT"

# 3. SPA fallback + keep _expo folder (no Jekyll).
cp "$OUT/index.html" "$OUT/404.html"
touch "$OUT/.nojekyll"

# 4. PWA: manifest, icon, iOS standalone meta — makes Add to Home Screen a
#    fullscreen app with its own icon instead of a Safari shortcut.
cp assets/images/icon.png "$OUT/icon.png"
cat > "$OUT/manifest.json" <<'JSON'
{
  "name": "Trove — Family Adventures",
  "short_name": "Trove",
  "start_url": "/Cloes-app/",
  "scope": "/Cloes-app/",
  "display": "standalone",
  "background_color": "#FBF8F2",
  "theme_color": "#1F5A4C",
  "icons": [
    { "src": "/Cloes-app/icon.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/Cloes-app/icon.png", "sizes": "192x192", "type": "image/png" }
  ]
}
JSON
python3 - "$OUT" <<'PY'
import sys, pathlib
out = pathlib.Path(sys.argv[1])
meta = (
    '<link rel="manifest" href="/Cloes-app/manifest.json"/>'
    '<meta name="mobile-web-app-capable" content="yes"/>'
    '<meta name="apple-mobile-web-app-capable" content="yes"/>'
    '<meta name="apple-mobile-web-app-status-bar-style" content="default"/>'
    '<meta name="apple-mobile-web-app-title" content="Trove"/>'
    '<link rel="apple-touch-icon" href="/Cloes-app/icon.png"/>'
    '<meta name="theme-color" content="#1F5A4C"/>'
)
for name in ("index.html", "404.html"):
    p = out / name
    p.write_text(p.read_text().replace("</head>", meta + "</head>"))
print("PWA meta injected")
PY

# 5. Publish.
cd "$OUT"
git init -q
git checkout -q -b gh-pages
git add -A
git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit -q -m "$MSG"
git remote add origin "$ORIGIN"
git push -f -u origin gh-pages
echo "Deployed: $MSG"
