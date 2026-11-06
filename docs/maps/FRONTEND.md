# Giao diện và văn phòng

Từ 0.4.15: `ui/lite.js` giao việc ngay trong 2D, nhúng `team-roster.js`: 38 vị trí Dev/Marketing/đọc báo/video,
chỉ mở SID thật, không tạo phiên giả cho người chưa làm việc. Hiện đầy đủ subagent của phiên.
`settings.js`/`streamer.css` giải thích chế độ làm mờ và cho tắt ngay. `role-skills.js` xem skill mặc định
và sửa phần bổ sung cho cả 38 vị trí. `main.js` không boot hướng dẫn viên; giữ `guide.css` cho form chuyên trách dùng chung.
Test: `e2e/lite-workspace`, `e2e/team-presence`, `e2e/specialists-routing`, `e2e/staff-tools`.

Từ 0.4.14: `ui/team-sheet.js` có nút quản lý Dev/Marketing; chọn pm/cto/cmo gọi quy trình đội.
`ui/task-sheet.js` cho chọn quản lý phòng hoặc một phiên ở bước CLI/model, mặc định theo route nội dung;
SID giữ CLI của phiên gốc. Test `e2e/department-delegation`, ảnh UI nằm trong output test.

Từ 0.4.13: `ui/updates.js` kiểm bản desktop sau mở app/6 giờ/online, dialog đồng ý/để sau/tiến độ/thử lại; Cài đặt → Khác. Chỉ native IPC được cài, web/phone không có nút. Test `e2e/updates`.

[Chọn nhóm khác](../FEATURE-MAP.md). Đường dẫn tính từ root; `unit/X` = `tests/unit/X.test.mjs`,
`e2e/X` = `tests/e2e/X.spec.ts`. Danh sách từng module nằm ở `docs/ARCHITECTURE.md` → Module map.

Từ 0.4.10: `ui/role-skills.js` nhập/lưu skill theo vị trí Dev/Marketing; `shared/api-money.js` định dạng USD/VND và ước tính API Codex theo model, tỷ giá chỉnh ở burn. Bida xét cả workers và residents theo trạng thái đã đồng bộ (`ai-team.js` → `leisureSession`), giữ roaming đến khi về bàn. Bot native (`src-tauri/loading/bot.html`) mở laptop/gõ khi một trong hai CLI làm việc. Kiểm tra: `unit/api-money`, `unit/desktop-bot`, `unit/team`, `e2e/staff-tools`.

| Chức năng | Code chính | Điểm vào / luồng | Test liên quan |
| --- | --- | --- | --- |
| Trang và layout | `app/layout.tsx`, `app/page.tsx`, `src/components/office/` | route `/`, static markup và DOM id | `e2e/office`; build/typecheck |
| Boot engine | `src/components/OfficeBoot.tsx`, `src/office/main.js`, `src/office/core/` | `startOffice`, setup order, state/world-boot/loop/optimize | `e2e/office`, `e2e/view2d` |
| Renderer/chất lượng/ánh sáng | `src/office/scene/`, `src/shared/graphics-policy.js`, `src/office/world/backdrops/shops.js` | Auto PC giữ ít nhất Medium/1×; lựa chọn chất lượng giữ độ nét; `shadow-focus.js` đưa bóng đổ theo người ra phố và trả về văn phòng; atlas biển hiệu đổi độ nét không dựng lại phòng/người; `?debug` → `__office.graphics` | `unit/graphics-policy`, `unit/shadow-focus`; `e2e/desktop-graphics`, `e2e/look-dispose`; hiệu năng GPU cần đo trên thiết bị thật |
| Bố cục/phòng/đồ vật | `src/office/world/` | `layout.js` DEPTS, `desks.js`, `pro/`, `furniture/`, `props/`, `backdrops/` | `unit/team`; `e2e/shops`, `e2e/shops-b`, `e2e/shops-c`, `e2e/shops-cong` |
| Nhân sự AI/phòng AI/mở rộng | `src/office/people/ai-team.js`, `src/office/people/team-brief.js` (tới gặp sếp nhận việc, nghỉ ở phòng nghỉ), `src/office/people/specialists.js` (đọc báo / edit video ở thư viện), `src/shared/team-presence.js`, `src/shared/office-layout.js`, `src/shared/session-name.js`, `src/office/ui/team-roster.js`, `src/office/ui/team-sheet.js`, `src/office/ui/expand.js` | TEAM_SEATS → roster live độc lập phiên; 15 residents Dev + 21 Marketing (MARKETING_SEATS ở DEPTS[0]/[2], KHO_SEATS ở phòng Kho DEPTS[1]) chỉ ở HQ; roster liệt kê cả Marketing theo MARKETING_ROSTER; workerForSession + parentSessionId; tên nhân sự ổn định theo CLI + session id, tiêu đề chat là ngữ cảnh; layout URL hợp lệ → saved → HQ | `unit/team`, `unit/team-presence`, `unit/session-name`, `unit/exit-requests` (layout); `e2e/personnel-graphics`, `e2e/team-presence`, `e2e/team-office` (live), `e2e/view2d`, `e2e/look-dispose` |
| Trò chơi và kết thúc ván | `src/office/people/{foosball,billiards,gaming,karaoke,pickle}.js`, `src/shared/game-lifecycle.js` | Giữ chore đến kết quả thật; chỉ công việc/duyệt quyền/phiên đóng ngắt được; không khởi động trò khác cho người đang chơi | `unit/game-lifecycle`; `e2e/game-lifecycle`, `e2e/pickle`, `e2e/office` |
| Đồ họa điện thoại/tablet | `src/shared/graphics-policy.js`, `src/office/scene/{renderer,quality}.js`, `src/office/core/loop.js` | Auto theo thiết bị, ngân sách 1,5 triệu điểm ảnh 3D, thích ứng 12–60 fps xuống 0,6× khi cần; nhãn HTML giữ sắc nét; bỏ qua tải khởi động 15 s và lúc nền/panel che kín | `unit/graphics-policy`; `e2e/personnel-graphics`, `e2e/phone` |
| Nhân sự/đường đi/đời sống | `src/office/people/` | `workers.js`, `navigation.js`, `chibi-rig.js`, staff/breaks và module hoạt động | `unit/chibi-dispose`; `e2e/look-dispose`, `e2e/duty`, `e2e/comnha`, `e2e/farewell`, `e2e/interns` |
| Tương tác/hóa thân/lái xe | `src/office/interact/`, `src/office/world/backdrops/street-riders.js` | `first-person.js`, props/place-cards/rings; bàn/xe/camera; xe người dùng lái dùng cùng vùng va chạm với giao thông | `e2e/shops`, `e2e/evswap`, `e2e/street-traffic` |
| Giao thông thành phố | `src/office/world/backdrops/street-life.js`, `src/office/world/backdrops/street-riders.js`, `src/shared/traffic-space.js` | Vùng chữ nhật xoay theo kích thước xe/hàng, quét va chạm liên tục và lưới không gian; chặn xuyên xe tại giao lộ, đỗ/vượt/chuyển ngang và frame dài; debug `street.traffic()` | `unit/traffic-space` (mô phỏng 3 phút, frame dài); `e2e/street-traffic` (giờ cao điểm và xe hóa thân) |
| Đường và cột đèn | `src/office/world/backdrops/city.js`, `src/shared/street-fixtures.js` | Cột giữa đoạn vỉa hè, né đường ngang/vạch qua đường/cửa tiệm/sân; chia sẻ vị trí thật cho cây, dây điện và collision, không tự suy lại lịch cột | `unit/street-fixtures`; `e2e/desktop-graphics` (Pro/HQ, cửa tiệm thật) |
| Sự kiện theo thời gian | `src/office/life/`, `src/shared/workdays.js` | weather/quota/nap/drill/day-swaps/lift-service/trophies | `unit/workdays`, `unit/lift-service`; `e2e/drill`, `e2e/lam-bu`, `e2e/lift-service` |
| Phiên và duyệt quyền | `src/office/ui/`, `src/office/net/live.js` | session-drawer, permissions, live SSE, `/stream` | `e2e/office`, `e2e/denied`, `e2e/pins`, `e2e/overlap` |
| Giao việc/model/tài khoản | `src/office/ui/task-sheet.js`, `src/office/ui/ai-accounts.js`, `src/office/ui/setup.js` | task sheet → `/api/tasks`, setup → `/api/setup` | `e2e/bg-tasks`, `e2e/ai-accounts`, `e2e/models`, `e2e/sub-model` |
| Memory/dự án | `src/office/ui/memory-view.js`, `src/office/ui/projects.js`; `guide.js`/`guide-work.js` là helper cũ không boot từ 0.4.15 | `/api/memory`, `/api/projects`; giao việc qua task-sheet/team-sheet hoặc 2D | `unit/memory`, `unit/memory-file`; `e2e/memory` hiện kiểm tra dispose khi gọi subagent |
| Chat và trợ lý prompt | `src/office/ui/group-chat.js`, `src/shared/chat-engine.js`, `src/shared/prompt-coach.js` | nhóm chat, quick prompts, rewrite | `unit/prompt-coach`, `unit/rewrite`; `e2e/prompt-coach` |
| Replay/timeline/chụp ảnh | `src/office/replay/`, `src/office/ui/photo.js` | replay/timeline, photo export | `unit/timeline`; export ảnh cần smoke thủ công |
| Dữ liệu mẫu/âm thanh | `src/office/demo/`, `src/office/audio/sfx.js` | `?demo`, demo-log, SFX gesture | `unit/demo-log`; `e2e/office` |
| Panel trong IDE/menu bar | `app/panel/page.tsx`, `src/components/PanelBoot.tsx`, `src/panel/` | `/panel` → main, quota/mac/fmt; không dựng 3D | `e2e/panel` |
| Ngôn ngữ | `src/i18n/index.js`, `src/i18n/server.ts`, `src/i18n/locales/vi/`, `src/i18n/locales/en/` | `createT`, `tr`, server locale header, `?lang=vi` | `unit/i18n`; `e2e/office` |
| CSS/mobile/metadata | `src/styles/`, `app/manifest.ts`, `app/icon.svg`, `public/` | layout CSS imports, responsive, static URLs/service worker | `e2e/phone`, `e2e/view2d`; build |

Khi sửa 3D: tra trước các quy tắc dispose/merge/collision trong ARCHITECTURE; khi sửa UI: đối chiếu DOM id
giữa component TSX, module JS, CSS và khóa i18n. `public/assets/vendor/` là thư viện có sẵn, không đọc mặc định.
