#!/bin/bash

# claude-rank installer for Unix/macOS
# Installs the claude-rank SEO/GEO/AEO plugin for Claude Code

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
INSTALL_DIR="$HOME/.claude/skills/rank"
AGENTS_DIR="$HOME/.claude/agents"
REPO_URL="https://github.com/Houseofmvps/claude-rank.git"

echo -e "${YELLOW}=== claude-rank Installer ===${NC}"
echo ""

# Check Node.js version
echo -e "${YELLOW}Checking Node.js version...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}✗ Node.js version is ${NODE_VERSION}.x, but 18+ is required${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v) detected${NC}"

# Check git
echo -e "${YELLOW}Checking git...${NC}"
if ! command -v git &> /dev/null; then
    echo -e "${RED}✗ Git is not installed${NC}"
    echo "Please install git from https://git-scm.com/"
    exit 1
fi
echo -e "${GREEN}✓ Git $(git --version | awk '{print $3}') detected${NC}"

# Clone repo
echo -e "${YELLOW}Installing claude-rank to ${INSTALL_DIR}...${NC}"
if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}Directory exists, updating...${NC}"
    cd "$INSTALL_DIR"
    git pull origin main 2>/dev/null || git pull origin master 2>/dev/null
else
    mkdir -p "$(dirname "$INSTALL_DIR")"
    git clone "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

# Install production dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install --production 2>&1 | grep -E "^(added|up to date)" || true

# Copy agents to ~/.claude/agents/
echo -e "${YELLOW}Installing agents to ${AGENTS_DIR}...${NC}"
mkdir -p "$AGENTS_DIR"
if [ -d "$INSTALL_DIR/agents" ]; then
    cp "$INSTALL_DIR/agents"/*.md "$AGENTS_DIR/" 2>/dev/null || true
    echo -e "${GREEN}✓ Agents copied${NC}"
fi

# Summary
echo ""
echo -e "${GREEN}=== Installation Complete ===${NC}"
echo ""
echo "Available commands:"
echo "  claude-rank scan <url>  - Run SEO audit"
echo "  claude-rank geo <url>   - Run GEO (Generative Engine Optimization) audit"
echo "  claude-rank aeo <url>   - Run AEO (Answer Engine Optimization) audit"
echo ""
echo "Access agents at: $AGENTS_DIR"
echo ""
echo "To uninstall, run: bash $INSTALL_DIR/uninstall.sh"
echo ""
