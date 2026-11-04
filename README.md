# DT Office

[![CI](https://github.com/trancaodai1651/DTOffice/actions/workflows/ci.yml/badge.svg)](https://github.com/trancaodai1651/DTOffice/actions/workflows/ci.yml) [![Desktop release](https://github.com/trancaodai1651/DTOffice/actions/workflows/desktop-release.yml/badge.svg)](https://github.com/trancaodai1651/DTOffice/actions/workflows/desktop-release.yml) [![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

English · [Tiếng Việt](README.vi.md)

DT Office is a local 3D workspace for Claude Code and Codex. See active sessions as people at desks, assign work to an AI team, review approval requests, and carry project context between sessions.

Source, downloads and issue tracking live in **[trancaodai1651/DTOffice](https://github.com/trancaodai1651/DTOffice)**.

## Download the desktop app

Get the installers from **[GitHub Releases](https://github.com/trancaodai1651/DTOffice/releases/latest)**:

| Platform | Download |
| --- | --- |
| Windows x64 | `DT.Office_<version>_x64-setup.exe` |
| macOS 13+ · Intel and Apple Silicon | `DT.Office_<version>_universal.dmg` |
| macOS · archived application | `DT-Office-macos-universal.app.tar.gz` |

The app includes Node.js and the local server. Claude Code and Codex require their own account login; the app guides you through CLI setup. The Windows installer installs for the current user. The macOS app is ad-hoc signed and is not notarized. Release downloads include `SHA256SUMS.txt` for integrity verification.

Existing desktop data continues to use `~/.my-office` so preferences, project memory and history survive an upgrade.

## What you can do

- Follow Claude Code and Codex sessions in a 3D office or a compact 2D view.
- Choose a CLI, model and reasoning effort when assigning a task.
- Organize work across a 15-role AI team, with a separate session for each role.
- Share project context through an index, a handoff state and durable memory.
- Review permission requests, inspect session activity and track plan usage.
- Monitor memory, CPU, disk space and development servers on the host machine.
- Use the IDE panel, macOS menu bar or a phone connected to the local server.
- Switch between Vietnamese and English.

## Run from source

Requirements: Node.js **20.9+**, npm and Git. Install and sign in to the AI CLIs you want to use.

```sh
git clone https://github.com/trancaodai1651/DTOffice.git
cd DTOffice
npm ci
npm run build
node bin/cli.mjs install
node bin/cli.mjs start
```

Open **http://localhost:4310**. To explore with sample sessions, open **http://localhost:4310/?demo**. Source runs keep local state in the ignored `data/` folder.

For development, use `npm run dev`. Useful CLI commands:

```sh
node bin/cli.mjs doctor
node bin/cli.mjs install --service
node bin/cli.mjs uninstall
```

`install` adds the integration hooks; `--service` also starts the server at login. `uninstall` removes those integrations. This repository distributes desktop downloads through GitHub Releases.

## Build and verify

```sh
npm run lint
npm run typecheck
npm test
node scripts/module-map.mjs --check
npm run build
npm run smoke
```

Windows packaging requires the Rust toolchain and the Tauri Windows build prerequisites:

```sh
npm run desktop:prepare
node scripts/verify-desktop.mjs
npx tauri build --bundles nsis
```

Build the Universal app on macOS with both Rust targets:

```sh
rustup target add aarch64-apple-darwin x86_64-apple-darwin
npm run desktop:prepare -- --universal
node scripts/verify-desktop.mjs
npx tauri build --target universal-apple-darwin --bundles app,dmg
```

The [desktop release workflow](.github/workflows/desktop-release.yml) builds Windows and macOS, verifies the bundled server on Intel and Apple Silicon Macs, and publishes installers and checksums. Push a version tag matching `package.json`, the Tauri configuration and `Cargo.toml` to release a new version.

## Project guides

- [Vietnamese user guide](HUONG-DAN.md)
- [Contributing](CONTRIBUTING.md)
- [Feature map](docs/FEATURE-MAP.md) and [architecture](docs/ARCHITECTURE.md)
- [Agent instructions](AGENTS.md) and [project context index](.ai-office/INDEX.md)
- [Report a bug or suggest a feature](https://github.com/trancaodai1651/DTOffice/issues)

## License

[MIT](LICENSE). Copyright and permission notices required by the license are retained.
