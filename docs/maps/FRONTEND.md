# Giao diện và văn phòng

[Chọn nhóm khác](../FEATURE-MAP.md). Đường dẫn tính từ root; `unit/X` = `tests/unit/X.test.mjs`,
`e2e/X` = `tests/e2e/X.spec.ts`. Danh sách từng module nằm ở `docs/ARCHITECTURE.md` → Module map.

| Chức năng | Code chính | Điểm vào / luồng | Test liên quan |
| --- | --- | --- | --- |
| Trang và layout | `app/layout.tsx`, `app/page.tsx`, `src/components/office/` | route `/`, static markup và DOM id | `e2e/office`; build/typecheck |
| Boot engine | `src/components/OfficeBoot.tsx`, `src/office/main.js`, `src/office/core/` | `startOffice`, setup order, state/world-boot/loop/optimize | `e2e/office`, `e2e/view2d` |
| Renderer/chất lượng/ánh sáng | `src/office/scene/` | renderer, quality, lights; geometry trong blocks | `e2e/look-dispose`; performance cần đo thực tế |
| Bố cục/phòng/đồ vật | `src/office/world/` | `layout.js` DEPTS, `desks.js`, `pro/`, `furniture/`, `props/`, `backdrops/` | `unit/team`; `e2e/shops`, `e2e/shops-b`, `e2e/shops-c`, `e2e/shops-cong` |
| Nhân sự AI/phòng AI/mở rộng | `src/office/people/ai-team.js`, `src/office/people/team-brief.js` (tới gặp sếp nhận việc, nghỉ ở phòng nghỉ), `src/shared/team-presence.js`, `src/shared/office-layout.js`, `src/office/ui/team-roster.js`, `src/office/ui/team-sheet.js`, `src/office/ui/expand.js` | TEAM_SEATS → roster live độc lập phiên; 15 residents chỉ ở HQ; workerForSession + parentSessionId; 2D/bố cục nhỏ mở cùng roster; layout URL hợp lệ → saved → HQ | `unit/team`, `unit/team-presence`, `unit/exit-requests` (layout); `e2e/team-presence`, `e2e/team-office` (live), `e2e/view2d`, `e2e/look-dispose` |
| Nhân sự/đường đi/đời sống | `src/office/people/` | `workers.js`, `navigation.js`, `chibi-rig.js`, staff/breaks và module hoạt động | `unit/chibi-dispose`; `e2e/look-dispose`, `e2e/duty`, `e2e/comnha`, `e2e/farewell`, `e2e/interns` |
| Tương tác/hóa thân/lái xe | `src/office/interact/`, `src/office/world/backdrops/street-riders.js` | `first-person.js`, props/place-cards/rings; bàn/xe/camera | `e2e/shops`, `e2e/evswap`; lái xe hóa thân chưa có e2e chuyên biệt |
| Sự kiện theo thời gian | `src/office/life/`, `src/shared/workdays.js` | weather/quota/nap/drill/day-swaps/lift-service/trophies | `unit/workdays`, `unit/lift-service`; `e2e/drill`, `e2e/lam-bu`, `e2e/lift-service` |
| Phiên và duyệt quyền | `src/office/ui/`, `src/office/net/live.js` | session-drawer, permissions, live SSE, `/stream` | `e2e/office`, `e2e/denied`, `e2e/pins`, `e2e/overlap` |
| Giao việc/model/tài khoản | `src/office/ui/task-sheet.js`, `src/office/ui/ai-accounts.js`, `src/office/ui/setup.js` | task sheet → `/api/tasks`, setup → `/api/setup` | `e2e/bg-tasks`, `e2e/ai-accounts`, `e2e/models`, `e2e/sub-model` |
| Memory/hướng dẫn | `src/office/ui/memory-view.js`, `src/office/ui/guide.js`, `src/office/ui/guide-work.js`, `src/office/ui/projects.js` | `/api/memory`, hướng dẫn theo chủ đề; giao việc qua hướng dẫn viên: việc → dự án → đội | `unit/memory`, `unit/memory-file`; `e2e/memory` hiện kiểm tra dispose khi gọi subagent |
| Chat và trợ lý prompt | `src/office/ui/group-chat.js`, `src/shared/chat-engine.js`, `src/shared/prompt-coach.js` | nhóm chat, quick prompts, rewrite | `unit/prompt-coach`, `unit/rewrite`; `e2e/prompt-coach` |
| Replay/timeline/chụp ảnh | `src/office/replay/`, `src/office/ui/photo.js` | replay/timeline, photo export | `unit/timeline`; export ảnh cần smoke thủ công |
| Dữ liệu mẫu/âm thanh | `src/office/demo/`, `src/office/audio/sfx.js` | `?demo`, demo-log, SFX gesture | `unit/demo-log`; `e2e/office` |
| Panel trong IDE/menu bar | `app/panel/page.tsx`, `src/components/PanelBoot.tsx`, `src/panel/` | `/panel` → main, quota/mac/fmt; không dựng 3D | `e2e/panel` |
| Ngôn ngữ | `src/i18n/index.js`, `src/i18n/server.ts`, `src/i18n/locales/vi/`, `src/i18n/locales/en/` | `createT`, `tr`, server locale header, `?lang=vi` | `unit/i18n`; `e2e/office` |
| CSS/mobile/metadata | `src/styles/`, `app/manifest.ts`, `app/icon.svg`, `public/` | layout CSS imports, responsive, static URLs/service worker | `e2e/phone`, `e2e/view2d`; build |

Khi sửa 3D: tra trước các quy tắc dispose/merge/collision trong ARCHITECTURE; khi sửa UI: đối chiếu DOM id
giữa component TSX, module JS, CSS và khóa i18n. `public/assets/vendor/` là thư viện có sẵn, không đọc mặc định.
