# README demo assets

| File | What it shows |
| --- | --- |
| `demo-scan.gif` | `npx repairo-cli scan ./fixtures/consumers --vendors stripe` |
| `demo-diff.gif` | OpenAPI diff + impact on `fixtures/breaking-api-demo` |
| `demo-*.tape` | Optional [VHS](https://github.com/charmbracelet/vhs) tapes (Linux/macOS) |
| `terminal-*.svg` | Static fallbacks (same text as the GIFs) |

## Regenerate GIFs

From repo root (Python 3 + Pillow):

```bash
pip install pillow
python scripts/generate-readme-gifs.py
```

Or on Linux/macOS with VHS installed:

```bash
vhs docs/assets/demo-scan.tape
vhs docs/assets/demo-diff.tape
```
