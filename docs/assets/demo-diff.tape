# Regenerate from repo root: vhs docs/assets/demo-diff.tape
Output docs/assets/demo-diff.gif

Set Shell powershell
Set FontSize 14
Set Width 920
Set Height 560
Set Theme "Catppuccin Mocha"
Set Padding 24

Type "Copy-Item -Force ./fixtures/breaking-api-demo/specs/old-openapi.json ./.repairo/snapshots/openapi.json"
Enter
Sleep 800ms

Type "npx repairo-cli diff --spec ./fixtures/breaking-api-demo/specs/new-openapi.json --target ./fixtures/breaking-api-demo"
Enter
Sleep 5s
