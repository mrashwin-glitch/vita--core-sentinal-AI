# Vita-Core Sentinel AI - Full Stack Launcher
Clear-Host
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "         VITA-CORE SENTINEL AI - DEMO LAUNCHER            " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green

# 1. Resolve paths
$ProjectRoot = (Get-Item ".").FullName
$NodeBinPath = Join-Path $ProjectRoot "node_portable\node-v22.12.0-win-x64"

# Set environment PATH for this session
$env:PATH = "$NodeBinPath;$env:PATH"

Write-Host "Node.js Environment: Portable v22.12.0 bound successfully." -ForegroundColor Cyan
Write-Host "Project Directory:   $ProjectRoot" -ForegroundColor Cyan
Write-Host "----------------------------------------------------------" -ForegroundColor Gray

# 2. Launch persistent Python AI server on port 5001 in a new window
Write-Host "[1/3] Launching PyTorch CNN Persistent Model Server..." -ForegroundColor Yellow
Start-Process cmd.exe -ArgumentList "/k title AI-Model-Server & python ai/glow_server.py" -WorkingDirectory $ProjectRoot

# 3. Launch Node.js API backend on port 5000 in a new window
Write-Host "[2/3] Launching Node.js Express API Backend..." -ForegroundColor Yellow
$BackendDir = Join-Path $ProjectRoot "backend"
# Prepend node path inside the spawned cmd shell as well
Start-Process cmd.exe -ArgumentList "/k title Express-API-Backend & set PATH=$NodeBinPath;%PATH% & node server.js" -WorkingDirectory $BackendDir

# 4. Launch React dev server on port 5173 in a new window
Write-Host "[3/3] Launching Vite React Dev Server..." -ForegroundColor Yellow
$FrontendDir = Join-Path $ProjectRoot "frontend"
Start-Process cmd.exe -ArgumentList "/k title Vite-React-Frontend & set PATH=$NodeBinPath;%PATH% & npm run dev" -WorkingDirectory $FrontendDir

Write-Host "----------------------------------------------------------" -ForegroundColor Gray
Write-Host "✅ INITIALIZATION SIGNALS SENT." -ForegroundColor Green
Write-Host "Access Portal Dashboard at: http://localhost:5173/" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green

# Open browser automatically
Start-Process "http://localhost:5173/"

Read-Host "Press Enter to close this launcher menu (services will remain running in their windows)..."
