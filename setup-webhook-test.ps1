<#
  Builds a throwaway repo that triggers the Repairo GitHub App end to end.

  Phase 1  — create the repo, push main (spec v1 + consumer code), stop.
             You then install the App on it via the GitHub UI.
  Phase 2  — push a branch that swaps the spec to v2 and open the PR.

  Usage:
    .\setup-webhook-test.ps1 -Phase 1
    .\setup-webhook-test.ps1 -Phase 2
#>
param(
  [ValidateSet('1','2')] [string]$Phase = '1',
  [string]$Source = 'E:\Projects\Repairooo',
  [string]$Target = 'E:\Projects\repairo-webhook-test',
  [string]$RepoName = 'repairo-webhook-test'
)

$ErrorActionPreference = 'Stop'

function Have-Gh { $null -ne (Get-Command gh -ErrorAction SilentlyContinue) }

if ($Phase -eq '1') {
  if (Test-Path $Target) { throw "$Target already exists. Delete it or pass -Target elsewhere." }

  New-Item -ItemType Directory -Path $Target, "$Target\src" | Out-Null

  # openapi.yaml at the repo root is what isOpenApiSpecPath() matches.
  Copy-Item "$Source\fixtures\apis\payments-v1.openapi.yaml" "$Target\openapi.yaml"
  Copy-Item "$Source\fixtures\consumers\checkout-service\src\*.ts" "$Target\src\"

  @'
{
  "compilerOptions": {
    "target": "es2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": false,
    "skipLibCheck": true,
    "lib": ["es2022", "dom"]
  },
  "include": ["src/**/*"]
}
'@ | Set-Content "$Target\tsconfig.json"

  @'
{ "name": "repairo-webhook-test", "private": true, "version": "1.0.0" }
'@ | Set-Content "$Target\package.json"

  @'
# repairo-webhook-test

Throwaway repo for exercising the Repairo GitHub App.

- `openapi.yaml` — Payments API v1
- `src/` — TypeScript consumer pinned to the v1 shapes

A PR that swaps the spec to v2 should get a breaking-change comment
and an automatic fix PR.
'@ | Set-Content "$Target\README.md"

  Push-Location $Target
  git init -b main | Out-Null
  git add -A
  git commit -m "Payments API v1 spec and consumer code" | Out-Null

  if (Have-Gh) {
    gh repo create $RepoName --private --source=. --push
  } else {
    Write-Host ""
    Write-Host "gh CLI not found. Create an empty repo named '$RepoName' on GitHub, then:" -ForegroundColor Yellow
    Write-Host "  cd $Target"
    Write-Host "  git remote add origin https://github.com/<you>/$RepoName.git"
    Write-Host "  git push -u origin main"
  }
  Pop-Location

  Write-Host ""
  Write-Host "PHASE 1 DONE." -ForegroundColor Green
  Write-Host "Now install the Repairo GitHub App on '$RepoName':"
  Write-Host "  Settings -> Developer settings -> GitHub Apps -> your app -> Install App"
  Write-Host "Watch the app terminal for: 'installation created'"
  Write-Host "Then run:  .\setup-webhook-test.ps1 -Phase 2"
  return
}

# ---- Phase 2 -----------------------------------------------------------------

if (-not (Test-Path $Target)) { throw "$Target not found. Run -Phase 1 first." }

Push-Location $Target
git checkout -b breaking-change | Out-Null
Copy-Item "$Source\fixtures\apis\payments-v2.openapi.yaml" ".\openapi.yaml" -Force
git add openapi.yaml
git commit -m "Upgrade Payments API to v2" | Out-Null
git push -u origin breaking-change

if (Have-Gh) {
  gh pr create --base main --head breaking-change `
    --title "Upgrade Payments API to v2" `
    --body "Swaps openapi.yaml from Payments v1 to v2."
} else {
  Write-Host ""
  Write-Host "Branch pushed. Open the PR on GitHub: main <- breaking-change" -ForegroundColor Yellow
}
Pop-Location

Write-Host ""
Write-Host "PHASE 2 DONE. Watch the app terminal." -ForegroundColor Green
