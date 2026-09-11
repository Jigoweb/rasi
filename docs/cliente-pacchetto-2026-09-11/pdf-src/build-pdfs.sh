#!/usr/bin/env bash
set -euo pipefail
SRC="$(cd "$(dirname "$0")" && pwd)"
OUT="$SRC/../pdf"
mkdir -p "$OUT"

print_pdf() {
  local html_stem="$1"
  local pdf_stem="$2"
  local port="$3"
  local dir="/tmp/chrome-pdf-${pdf_stem}"
  rm -rf "$dir"
  mkdir -p "$dir"
  google-chrome \
    --headless=new \
    --disable-gpu \
    --no-sandbox \
    --disable-dev-shm-usage \
    --user-data-dir="$dir" \
    --remote-debugging-port="$port" \
    --no-first-run \
    --no-pdf-header-footer \
    --hide-scrollbars \
    --print-to-pdf="$OUT/${pdf_stem}.pdf" \
    "file://${SRC}/${html_stem}.html"
}

print_pdf "A-algoritmo-individuazione" "A-Algoritmo-di-individuazione" 9331
print_pdf "B-report-casistiche-sky" "B-Report-casistiche-Sky-e-proposta" 9332
print_pdf "C-differenze-noco-catalogo" "C-Differenze-Noco-catalogo-attuale" 9333
ls -la "$OUT"
