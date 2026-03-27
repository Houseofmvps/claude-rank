# claude-rank installer for Windows
# Installs the claude-rank SEO/GEO/AEO plugin for Claude Code
# Usage: powershell -ExecutionPolicy Bypass -File install.ps1

param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"

# Configuration
$installDir = "$env:USERPROFILE\.claude\skills\rank"
$agentsDir = "$env:USERPROFILE\.claude\agents"
$repoUrl = "https://github.com/Houseofmvps/claude-rank.git"

function Write-Status {
    param([string]$Message, [string]$Type = "Info")
    $color = @{
        "Info"    = "Yellow"
        "Success" = "Green"
        "Error"   = "Red"
    }[$Type]
    Write-Host $Message -ForegroundColor $color
}

Write-Status "=== claude-rank Installer ===" "Info"
Write-Host ""

# Check Node.js version
Write-Status "Checking Node.js version..." "Info"
$nodePath = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodePath) {
    Write-Status "✗ Node.js is not installed" "Error"
    Write-Host "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
}

$nodeVersion = node -v
$majorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
if ($majorVersion -lt 18) {
    Write-Status "✗ Node.js version is $nodeVersion, but 18+ is required" "Error"
    exit 1
}
Write-Status "✓ Node.js $nodeVersion detected" "Success"

# Check git
Write-Status "Checking git..." "Info"
$gitPath = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitPath) {
    Write-Status "✗ Git is not installed" "Error"
    Write-Host "Please install git from https://git-scm.com/"
    exit 1
}
$gitVersion = git --version
Write-Status "✓ $gitVersion detected" "Success"

# Clone repo
Write-Status "Installing claude-rank to $installDir..." "Info"
if (Test-Path $installDir) {
    Write-Status "Directory exists, updating..." "Info"
    Push-Location $installDir
    try {
        git pull origin main 2>$null
    }
    catch {
        try {
            git pull origin master 2>$null
        }
        catch {
            Write-Status "Warning: Could not update repo" "Info"
        }
    }
    Pop-Location
}
else {
    $parentDir = Split-Path $installDir -Parent
    if (-not (Test-Path $parentDir)) {
        New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
    }
    git clone $repoUrl $installDir
}

# Install production dependencies
Write-Status "Installing dependencies..." "Info"
Push-Location $installDir
npm install --production 2>&1 | Where-Object { $_ -match "(added|up to date)" } | ForEach-Object { Write-Host $_ }
Pop-Location

# Copy agents to ~/.claude/agents/
Write-Status "Installing agents to $agentsDir..." "Info"
if (-not (Test-Path $agentsDir)) {
    New-Item -ItemType Directory -Path $agentsDir -Force | Out-Null
}
if (Test-Path "$installDir\agents") {
    Get-ChildItem "$installDir\agents" -Filter "*.md" | ForEach-Object {
        Copy-Item $_.FullName $agentsDir -Force
    }
    Write-Status "✓ Agents copied" "Success"
}

# Summary
Write-Host ""
Write-Status "=== Installation Complete ===" "Success"
Write-Host ""
Write-Host "Available commands:"
Write-Host "  claude-rank scan <url>  - Run SEO audit"
Write-Host "  claude-rank geo <url>   - Run GEO (Generative Engine Optimization) audit"
Write-Host "  claude-rank aeo <url>   - Run AEO (Answer Engine Optimization) audit"
Write-Host ""
Write-Host "Access agents at: $agentsDir"
Write-Host ""
Write-Host "To uninstall, run: powershell -ExecutionPolicy Bypass -File $installDir\uninstall.ps1"
Write-Host ""
