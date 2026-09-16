# README demo assets

Terminal captures in this folder are **real output** from repo fixtures (not mock copy).

| Asset | Command |
| --- | --- |
| `terminal-scan.svg` | `npx repairo-cli scan ./fixtures/consumers --vendors stripe` |
| `terminal-diff.svg` | Baseline `fixtures/breaking-api-demo/specs/old-openapi.json`, then `npx repairo-cli diff --spec ./fixtures/breaking-api-demo/specs/new-openapi.json --target ./fixtures/breaking-api-demo` |

## Regenerate GIFs (optional)

[VHS](https://github.com/charmbracelet/vhs) tapes live beside these files. From the **repo root** on macOS or Linux (ffmpeg + ttyd required):

```bash
vhs docs/assets/demo-scan.tape
vhs docs/assets/demo-diff.tape
```

On Windows, VHS may fail to write GIFs depending on your shell; use the SVGs or run the tapes in CI/Linux.
