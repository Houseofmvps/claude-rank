# claude-rank uninstaller for Windows
# Removes the claude-rank SEO/GEO/AEO plugin from Claude Code
# Usage: powershell -ExecutionPolicy Bypass -File uninstall.ps1

$ErrorActionPreference = "Stop"

# Configuration
$installDir = "$env:USERPROFILE\.claude\skills\rank"
$agentsDir = "$env:USERPROFILE\.claude\agents"

function Write-Status {
    param([string]$Message, [string]$Type = "Info")
    $color = @{
        "Info"    = "Yellow"
        "Success" = "Green"
        "Error"   = "Red"
    }[$Type]
    Write-Host $Message -ForegroundColor $color
}

Write-Status "=== claude-rank Uninstaller ===" "Info"
Write-Host ""

# Confirm uninstall
Write-Status "This will remove claude-rank from your system." "Info"
$response = Read-Host "Are you sure? (y/N)"
if ($response -ne "y" -and $response -ne "Y") {
    Write-Status "Uninstall cancelled" "Error"
    exit 0
}

# Remove installation directory
if (Test-Path $installDir) {
    Write-Status "Removing $installDir..." "Info"
    Remove-Item -Path $installDir -Recurse -Force
    Write-Status "✓ Installation directory removed" "Success"
}
else {
    Write-Status "Installation directory not found at $installDir" "Info"
}

# Remove agent files
if (Test-Path $agentsDir) {
    Write-Status "Removing agent files from $agentsDir..." "Info"
    $agentFiles = @("seo-auditor.md", "geo-auditor.md", "aeo-auditor.md", "schema-auditor.md")
    foreach ($file in $agentFiles) {
        $path = Join-Path $agentsDir $file
        if (Test-Path $path) {
            Remove-Item -Path $path -Force
        }
    }
    Write-Status "✓ Agent files removed" "Success"
}

Write-Host ""
Write-Status "=== Uninstall Complete ===" "Success"
Write-Host ""
