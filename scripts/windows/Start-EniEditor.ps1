<#
Start-EniEditor.ps1 - Wrapper to launch ENI-Editor in production on Windows
Place this script anywhere (e.g., repo scripts/windows) and provide the WorkDir to the eni-editor folder.
#>
param(
  [string]$WorkDir = (Join-Path $PSScriptRoot "..\..\eni-editor"),
  [string]$NodeExe = "C:\\Program Files\\nodejs\\node.exe"
)

# Set required environment variables (override via external env if defined)
if (-not $env:NODE_ENV) { $env:NODE_ENV = "production" }
if (-not $env:SESSION_SECRET) { $env:SESSION_SECRET = "SET_ME" }
if (-not $env:SSH_KEYS_SECRET) { $env:SSH_KEYS_SECRET = "SET_ME" }
if (-not $env:DATA_DIR) { $env:DATA_DIR = "C:\\eni-editor\\data" }

if (-not (Test-Path $WorkDir)) { throw "WorkDir not found: $WorkDir" }

Push-Location $WorkDir
try {
  Write-Host "Starting ENI-Editor from $WorkDir"
  & "$NodeExe" "server.js"
}
finally {
  Pop-Location
}
