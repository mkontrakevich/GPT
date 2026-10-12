#!/usr/bin/env bash
set -euo pipefail

rm -rf dist
mkdir -p dist/personal-sign/vendor dist/personal-sign/help

cp project-hub/index.html dist/index.html
cp project-hub/_headers dist/_headers

cp personal-sign/index.html personal-sign/app.js personal-sign/sw.js personal-sign/manifest.webmanifest personal-sign/icon.svg personal-sign/favicon.ico personal-sign/apple-touch-icon.png dist/personal-sign/
cp personal-sign/vendor/* dist/personal-sign/vendor/
cp personal-sign/help/* dist/personal-sign/help/

echo "Built dist:"
find dist -maxdepth 3 -type f | sort
