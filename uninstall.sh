#!/bin/bash

# claude-rank uninstaller for Unix/macOS
# Removes the claude-rank SEO/GEO/AEO plugin from Claude Code

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
INSTALL_DIR="$HOME/.claude/skills/rank"
AGENTS_DIR="$HOME/.claude/agents"

echo -e "${YELLOW}=== claude-rank Uninstaller ===${NC}"
echo ""

# Confirm uninstall
echo -e "${YELLOW}This will remove claude-rank from your system.${NC}"
read -p "Are you sure? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Uninstall cancelled${NC}"
    exit 0
fi

# Remove installation directory
if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}Removing $INSTALL_DIR...${NC}"
    rm -rf "$INSTALL_DIR"
    echo -e "${GREEN}✓ Installation directory removed${NC}"
else
    echo -e "${YELLOW}Installation directory not found at $INSTALL_DIR${NC}"
fi

# Remove agent files
if [ -d "$AGENTS_DIR" ]; then
    echo -e "${YELLOW}Removing agent files from $AGENTS_DIR...${NC}"
    rm -f "$AGENTS_DIR/seo-auditor.md" 2>/dev/null || true
    rm -f "$AGENTS_DIR/geo-auditor.md" 2>/dev/null || true
    rm -f "$AGENTS_DIR/aeo-auditor.md" 2>/dev/null || true
    rm -f "$AGENTS_DIR/schema-auditor.md" 2>/dev/null || true
    echo -e "${GREEN}✓ Agent files removed${NC}"
fi

echo ""
echo -e "${GREEN}=== Uninstall Complete ===${NC}"
echo ""
