# My Office 0.4.1

- Windows x64 installer and macOS Universal app (Intel + Apple Silicon), with bundled Node.js.
- Claude Code and Codex CLI connections and first-run setup.
- Choose a CLI, model and reasoning effort when assigning work.
- Project session memory and the Mai guide, in Vietnamese and English.
- Windows CLI discovery and hook compatibility fixes.

Download the Windows `-setup.exe` or the macOS `universal.dmg`. The `.app.tar.gz` contains the same macOS app. `SHA256SUMS.txt` lists file checksums.

The macOS build is ad-hoc signed, without Apple notarization. On first launch, macOS may require approval in System Settings → Privacy & Security. Windows may show a SmartScreen prompt for the unsigned installer.

App data stays in `~/.my-office` when updating. Node.js is included; Claude Code and Codex require their own account login.
