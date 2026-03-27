#!/bin/bash
# Record a demo GIF for the README
# Requires: asciinema + agg (or svg-term)
# Install: brew install asciinema && cargo install --git https://github.com/asciinema/agg
#
# Usage:
#   1. Run: bash assets/record-demo.sh
#   2. This creates assets/demo.cast (asciinema recording)
#   3. Convert to GIF: agg assets/demo.cast assets/demo.gif --cols 90 --rows 30 --speed 2
#   4. Or use svg-term: svg-term --in assets/demo.cast --out assets/demo.svg --width 90

set -e

CAST_FILE="assets/demo.cast"

echo "Recording demo to $CAST_FILE..."
echo "Commands will be typed automatically."

# Create a script that types commands with delays
cat > /tmp/claude-rank-demo.sh << 'DEMO'
#!/bin/bash

# Simulate typing
type_cmd() {
  echo ""
  for ((i=0; i<${#1}; i++)); do
    echo -n "${1:$i:1}"
    sleep 0.04
  done
  echo ""
  sleep 0.3
}

clear
echo ""
echo "  claude-rank — SEO/GEO/AEO Toolkit for Claude Code"
echo "  =================================================="
echo ""
sleep 1.5

# SEO Scan
type_cmd "claude-rank scan ./my-saas-landing"
sleep 0.5
node ~/claude-rank/bin/claude-rank.mjs scan ~/mrr-guardian
sleep 3

# GEO Scan
type_cmd "claude-rank geo ./my-saas-landing"
sleep 0.5
node ~/claude-rank/bin/claude-rank.mjs geo ~/mrr-guardian
sleep 3

# AEO Scan
type_cmd "claude-rank aeo ./my-saas-landing"
sleep 0.5
node ~/claude-rank/bin/claude-rank.mjs aeo ~/mrr-guardian
sleep 3

# URL Scan
type_cmd "claude-rank scan https://houseofmvps.com"
sleep 0.5
node ~/claude-rank/bin/claude-rank.mjs scan https://houseofmvps.com
sleep 3

echo ""
echo "  Install: npm install -g @houseofmvps/claude-rank"
echo "  GitHub:  github.com/Houseofmvps/claude-rank"
echo ""
sleep 2
DEMO

chmod +x /tmp/claude-rank-demo.sh

asciinema rec "$CAST_FILE" --command "bash /tmp/claude-rank-demo.sh" --cols 100 --rows 35 --overwrite

echo ""
echo "Recording saved to $CAST_FILE"
echo ""
echo "Convert to GIF:"
echo "  agg $CAST_FILE assets/demo.gif --cols 100 --rows 35 --speed 2"
echo ""
echo "Or convert to SVG:"
echo "  svg-term --in $CAST_FILE --out assets/demo.svg --width 100"
