#!/usr/bin/env bash
# Puts an APK on the website: docs/download/castle-cascade.apk, plus the version
# and size shown in the download section. Commits and pushes to main.
# Usage: tools/publish-website-apk.sh <file.apk> <version>   (run from the repo root on main)
set -euo pipefail
apk="$1"
version="${2#v}"

# An APK is a zip file: refuse anything else.
head -c 2 "$apk" | grep -q PK || { echo "::error::$apk is not an APK"; exit 1; }

# Decimal megabytes, as Android's file manager shows them.
size_mb=$(( $(stat -c %s "$apk") / 1000000 ))
cp "$apk" docs/download/castle-cascade.apk
for f in site/index.html docs/index.html; do
  sed -i -E "s/Version [0-9][0-9A-Za-z.+-]*/Version ${version}/; s/about [0-9]+ MB/about ${size_mb} MB/" "$f"
done
echo "Website: version $version, about $size_mb MB"

if git diff --quiet; then echo "Website already has $version; nothing to do."; exit 0; fi
# Authored as the repo owner so Vercel accepts the deployment.
git -c user.name="github-actions[bot]" -c user.email="41898282+github-actions[bot]@users.noreply.github.com" \
  commit -a --author="ASHUTOSH ROY <92113396+ashutoshroy02@users.noreply.github.com>" \
  -m "Publish Android v$version on the website"
git push origin HEAD:main
