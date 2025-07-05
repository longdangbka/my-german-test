# PowerShell build script for My German Test
Write-Host "Building My German Test for Windows..." -ForegroundColor Green

# Clean previous builds
if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
if (Test-Path "build") { Remove-Item -Recurse -Force "build" }

Write-Host ""
Write-Host "Step 1: Installing dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install dependencies!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 2: Building React application..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to build React application!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 3: Building Windows executable..." -ForegroundColor Yellow
npm run dist-win

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to build Windows executable!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Build complete! Check the 'dist' folder for your executable." -ForegroundColor Green
Write-Host ""

# Show contents of dist folder
if (Test-Path "dist") {
    Write-Host "Generated files:" -ForegroundColor Cyan
    Get-ChildItem "dist" | ForEach-Object { Write-Host "  - $($_.Name)" -ForegroundColor White }
}

Read-Host "Press Enter to continue"
