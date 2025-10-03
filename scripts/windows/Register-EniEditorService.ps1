<#
Register-EniEditorService.ps1 - Install ENI-Editor as a Windows service using NSSM
Requires: NSSM installed and available in PATH (e.g., via `choco install nssm -y`).
#>
param(
  [string]$Name = "ENI-Editor",
  [string]$WorkDir = (Join-Path $PSScriptRoot "..\..\eni-editor"),
  [string]$NodeExe = "C:\\Program Files\\nodejs\\node.exe",
  [string]$DataDir = "C:\\eni-editor\\data",
  [string]$StdOut = "C:\\eni-editor\\logs\\out.log",
  [string]$StdErr = "C:\\eni-editor\\logs\\err.log"
)

if (-not (Get-Command nssm -ErrorAction SilentlyContinue)) {
  throw "nssm not found in PATH. Install with: choco install nssm -y"
}

if (-not (Test-Path $WorkDir)) { throw "WorkDir not found: $WorkDir" }
New-Item -ItemType Directory -Path (Split-Path $StdOut) -Force | Out-Null
New-Item -ItemType Directory -Path (Split-Path $StdErr) -Force | Out-Null
New-Item -ItemType Directory -Path $DataDir -Force | Out-Null

# Install service
nssm install $Name "$NodeExe" "server.js"
nssm set $Name AppDirectory "$WorkDir"
# Environment variables
nssm set $Name AppEnvironmentExtra "NODE_ENV=production" "SESSION_SECRET=<strong-random>" "SSH_KEYS_SECRET=<strong-random>" "DATA_DIR=$DataDir"
# Optional TLS env var example (uncomment and adjust):
# nssm set $Name AppEnvironmentExtra "TLS_PFX_PATH=C:\\eni-editor\\certs\\server.pfx"

# Logging
nssm set $Name AppStdout "$StdOut"
nssm set $Name AppStderr "$StdErr"

# Start service
nssm start $Name

Write-Host "Service '$Name' installed and started. View logs at: $StdOut / $StdErr"