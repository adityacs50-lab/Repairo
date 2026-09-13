# demo-reset.ps1 — Run this before every demo run
Write-Host ""
Write-Host "=== Repairo Demo Reset ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] Resetting fixture consumer files to clean state..." -ForegroundColor Yellow
git checkout -- fixtures/consumers/
git checkout -- fixtures/breaking-api-demo/
Write-Host "  Done." -ForegroundColor Green

Write-Host "[2/3] Setting payments-v1 as baseline snapshot..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path ".repairo/snapshots" -Force | Out-Null
New-Item -ItemType Directory -Path ".repairo/reports" -Force | Out-Null
Copy-Item -Path "fixtures/apis/payments-v1.openapi.yaml" -Destination ".repairo/snapshots/openapi.json" -Force
Remove-Item -Path ".repairo/reports/latest-diff.json" -ErrorAction SilentlyContinue
Write-Host "  Done." -ForegroundColor Green

Write-Host "[3/3] Sanity test..." -ForegroundColor Yellow
node bin/repairo.js --version
Write-Host ""
Write-Host "=== Ready to demo! ===" -ForegroundColor Green
Write-Host "1. node bin/repairo.js scan ./fixtures/consumers" -ForegroundColor White
Write-Host "2. node bin/repairo.js diff --spec ./fixtures/apis/payments-v2.openapi.yaml --target ./fixtures/consumers" -ForegroundColor White
Write-Host "3. node bin/repairo.js repair --dry-run --target ./fixtures/consumers" -ForegroundColor White
Write-Host ""
