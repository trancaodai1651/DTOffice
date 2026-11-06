# Công cụ, đóng gói và kiểm tra

[Chọn nhóm khác](../FEATURE-MAP.md). Đường dẫn tính từ root repo.

| Chức năng | Code/thư mục | Điểm vào | Kiểm tra liên quan |
| --- | --- | --- | --- |
| Desktop mở/đóng server | `src-tauri/src/main.rs`, `src-tauri/loading/index.html` | Tauri setup, `start_server`, resource Node/office | `scripts/verify-desktop.mjs`; mở/đóng app cần kiểm tra thực tế |
| Codex Bot trên desktop | `src-tauri/loading/bot.html`, `src-tauri/src/main.rs`, `src-tauri/capabilities/`, `src/shared/desktop-bot.js`, `src/office/ui/settings.js` | Cửa sổ trong suốt, luôn nổi, kéo/ẩn/mở văn phòng; `/api/desktop-bot` chỉ loopback; Cài đặt → Khác → hiện lại | `unit/desktop-bot`; `e2e/personnel-graphics`; kiểm tra native trên Windows |
| Cấu hình/build Rust | `src-tauri/tauri.conf.json`, `src-tauri/tauri.macos.conf.json`, `src-tauri/build.rs`, `src-tauri/Cargo.toml` | `npx tauri build` và cấu hình từng OS | desktop-release workflow |
| Chuẩn bị server/Node desktop | `scripts/build-desktop.mjs`, `scripts/desktop-universal.mjs` | `npm run desktop:prepare`, `OFFICE_DIST_DIR` chọn build cách ly (đóng gói thành `.next`); Mac thêm `-- --universal` | `node scripts/verify-desktop.mjs`; Mac lipo/architecture checks |
| Menu bar macOS | `menubar/MyOfficeBar.swift`, `bin/service.mjs` | install/swiftc, `/api/panel` | `tests/unit/menubar.test.mjs` |
| Extension IDE | `vscode-extension/extension.js`, `vscode-extension/package.json`, `server/vsix.mjs` | VS Code activation, webview `/panel` | `tests/unit/vsix.test.mjs`, `tests/e2e/panel.spec.ts` |
| Plugin/hook Claude | `.claude-plugin/plugin.json`, `hooks/hooks.json`, `hooks/send.mjs`, `hooks/status-line.mjs` | plugin metadata/hook install từ CLI | `tests/unit/loop-hook.test.mjs`, `tests/unit/cache-clock.test.mjs`, doctor |
| Bản đồ module | `scripts/module-map.mjs`, `docs/ARCHITECTURE.md` | module comment → bảng Module map; chấp nhận LF/CRLF | `node scripts/module-map.mjs --check`, `tests/unit/module-map.test.mjs` |
| Demo public | `scripts/build-demo.mjs`, `scripts/make-thumbs.mjs`, `.github/workflows/pages.yml` | demo build/Pages | workflow/build; README hướng dẫn |
| Asset xe/clip | `scripts/build-cars.mjs`, `scripts/record-gif.mjs`, `public/` | asset generation/Playwright recording | build và kiểm tra trực quan, chưa có unit chuyên biệt |
| Gói npm | `scripts/prepack.mjs`, `package.json` | `npm pack`/prepack, danh sách files | `npm run build`, `npm run smoke` |
| Unit | `tests/unit/`, `src/shared/`, `server/` | `node --test` | npm test; không nạp fixture/mock vào ngữ cảnh mặc định |
| E2E/fixture | `tests/e2e/`, `playwright.config.ts` | Playwright demo/server, fake CLI/gh fixtures | `npm run test:e2e:smoke`, test spec đúng chức năng |
| CI đa nền tảng | `.github/workflows/ci.yml`, `.github/workflows/e2e-full.yml` | lint/typecheck/test/module-map/build; OS smoke; e2e shards | xem kết quả từng job, không suy từ lint |
| Phát hành Windows/Mac | `.github/workflows/desktop-release.yml`, `scripts/verify-desktop.mjs` | tag hoặc workflow_dispatch, NSIS và Universal app/DMG | smoke bundled Node, kiểm tra Mac arm64/Intel, checksum |
| Kiến thức/bàn giao | `.ai-office/`, `AGENTS.md`, `CLAUDE.md`, `server/memory-file.mjs` | INDEX → STATE → MEMORY core → bản đồ liên quan | `tests/unit/memory-file.test.mjs`, `tests/unit/memory.test.mjs` |

## Lệnh đóng gói cần tra khi phát hành

- Windows: `npm run desktop:prepare` rồi `npx tauri build --bundles nsis`.
- Mac Universal (trên macOS): cài hai Rust target `aarch64-apple-darwin`, `x86_64-apple-darwin`;
  `npm run desktop:prepare -- --universal`, rồi `npx tauri build --target universal-apple-darwin --bundles app,dmg`.
- `node scripts/verify-desktop.mjs` kiểm tra Node, native dependency và trang/server đi kèm.
- Desktop build dùng `.next` sẵn có; sau khi sửa UI phải build trang lại trước khi đóng gói.
- Tên phát hành DT Office; giữ binary `my-office` và thư mục dữ liệu cũ để tương thích nâng cấp.
- Tag/version package/Tauri/Cargo phải khớp; ghi chú phát hành ở `docs/RELEASE-<version>.md`.
- Không push/publish nếu nhiệm vụ không yêu cầu. Test app không đồng nghĩa đã kiểm tra UI trên máy người dùng.
