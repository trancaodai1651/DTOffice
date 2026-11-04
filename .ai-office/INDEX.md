# DT Office · đọc nhanh

Văn phòng 3D/2D theo dõi Claude Code và Codex, giao việc, duyệt quyền, hạn mức và hệ thống máy.
Node.js ESM + Next.js 16/React 19 + three.js; app desktop Tauri v2/Rust mang theo Node.

## Nạp ngữ cảnh

- Phiên mới/mất ngữ cảnh: đọc file này, [STATE.md](STATE.md), phần **Cốt lõi** trong [MEMORY.md](MEMORY.md).
- Cùng phiên: chỉ đọc lại khi file đổi. Xem `git status --short` và `git diff --stat` trước khi sửa.
- Tra [bản đồ chức năng](../docs/FEATURE-MAP.md), chọn đúng nhóm rồi mở code/test liên quan.
- [ARCHITECTURE.md](../docs/ARCHITECTURE.md): chi tiết kiến trúc và bảng từng module; không nạp toàn bộ mặc định.
- [SESSION-LOG.md](SESSION-LOG.md), [lịch sử ghi chú](history/AGENT-NOTES-2026-11-04.md): chỉ tra khi cần.

## Điểm khởi động

| Phần | Điểm vào |
| --- | --- |
| CLI/server | `bin/cli.mjs` → `server/index.mjs` → hook/API/SSE và Next |
| Trang chính | `app/page.tsx` → `src/components/OfficeBoot.tsx` → `src/office/main.js` |
| Panel nhỏ | `app/panel/page.tsx` → `src/components/PanelBoot.tsx` → `src/panel/main.js` |
| Desktop | `src-tauri/src/main.rs` → Node đóng gói → CLI/server |

## Các thư mục chính

| Thư mục | Trách nhiệm |
| --- | --- |
| `app/` | Route App Router, layout, metadata và trang panel |
| `src/components/` | Khung React/TSX, gắn boot vào giao diện JS |
| `src/office/` | Engine 3D/2D và tương tác; xem nhóm bên dưới |
| `src/panel/` | Giao diện nhỏ trong IDE/menu bar, không dựng 3D |
| `src/shared/` | Logic thuần dùng chung server/trình duyệt: chi phí, lịch, vai trò, prompt |
| `src/i18n/` | Hàm dịch + từ điển `locales/vi/`, `locales/en/` |
| `src/styles/` | CSS theo tính năng, font; nạp từ layout |
| `server/` | Phiên CLI, API, giao việc, memory, tài khoản, quyền và hệ thống máy |
| `server/platform/` | Adapter macOS/Windows/Linux |
| `bin/`, `hooks/` | CLI, dịch vụ nền, cài/gỡ hook và gửi sự kiện/status line |
| `src-tauri/` | App Rust, trang loading, cấu hình bundle và icon |
| `menubar/` | App Swift menu bar macOS |
| `vscode-extension/` | Extension mở panel trong VS Code và IDE tương thích |
| `scripts/` | Build tài nguyên/demo/desktop, smoke, kiểm tra bản đồ module |
| `public/` | Tài nguyên tĩnh, service worker và thư viện đóng gói; không quét vendor |
| `tests/unit/`, `tests/e2e/` | Node test và Playwright; tra test theo chức năng |
| `.github/`, `.claude-plugin/` | CI/release và metadata plugin Claude |
| `docs/`, `.ai-office/` | Tài liệu tra cứu, hướng dẫn AI và bàn giao |

`src/office/`: `core` vòng lặp/trạng thái; `scene` render/đèn; `world` bố cục/đồ vật;
`people` nhân sự/đường đi; `interact` camera/hóa thân; `life` hoạt động theo sự kiện;
`ui` bảng/nút; `net` SSE; `replay` phát lại; `demo` dữ liệu mẫu; `audio` âm thanh.

## Chạy và kiểm tra (từ root repo)

- Cài dependency: `npm ci`; dev: `npm run dev`; production: `node bin/cli.mjs` sau build.
- Kiểm tra máy: `npm run doctor`; lint: `npm run lint`; kiểu: `npm run typecheck`.
- Test gọn: `node --test tests/unit/<tính-năng>.test.mjs`; toàn bộ: `npm test`.
- Build trang: `npm run build`; smoke sau build: `npm run smoke`.
- E2E: `npm run test:e2e:smoke` hoặc `npx playwright test tests/e2e/<tính-năng>.spec.ts`.
- Bản đồ module: `node scripts/module-map.mjs --check`; cập nhật: bỏ `--check`.
- Desktop: `npm run desktop:build`; Mac Universal: xem `docs/maps/TOOLING.md`.
- PowerShell: nếu PATH thiếu npm, thêm thư mục Node vào PATH hoặc gọi `npm.cmd`.

## Quy tắc cần nhớ

- Mọi chữ giao diện qua i18n, đủ vi/en; không hardcode chữ hiển thị.
- Render JS tìm DOM bằng id; thứ tự setup trong `src/office/main.js` có ý nghĩa.
- Giải phóng geometry/material; không merge vật động; xem chi tiết trong ARCHITECTURE khi sửa 3D.
- Thử server riêng bằng `OFFICE_PORT=4311` và `OFFICE_DATA_DIR` riêng; không tắt app ở cổng 4310.
- Tài liệu giúp định vị, code xác nhận hành vi. Mở rộng phạm vi đọc khi có bằng chứng.
- Bàn giao cập nhật STATE; chỉ thêm kiến thức bền vững vào MEMORY; giữ nguyên office-log.
- Giữ file ngữ cảnh trong repo để đổi tài khoản; không đưa credential hoặc hội thoại nguyên văn vào đó.
