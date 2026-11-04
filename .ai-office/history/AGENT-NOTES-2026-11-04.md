# Lịch sử ghi chú trước khi tách ngữ cảnh

Chỉ tra khi cần. Nội dung ghi chú cũ được giữ nguyên bên dưới.

## Ghi chú của agent

_Các agent (và bạn) ghi ở đây: quyết định đã chốt, quy ước, lỗi đã gặp, việc còn dở. Mới nhất ở dưới cùng._

### 04/11/2026 10:20 · Ai làm: phiên "My Office setup và Codex CLI integration" · CLI: Claude Code · Model: claude-opus-5-5
- Đã làm: thêm hỗ trợ Codex CLI (server/codex-sessions.mjs), app Tauri v2 (src-tauri/, scripts/build-desktop.mjs), màn hình chọn CLI lần đầu (server/setup.mjs), hạn mức 5 giờ/tuần Claude + Codex, giao việc 2 bước chọn CLI/model/effort (server/agent-models.mjs), bộ nhớ phiên (server/memory.mjs) và file bộ nhớ này (server/memory-file.mjs), chị Mai hướng dẫn (src/office/ui/guide.js), Đội AI 15 agent (server/team.mjs, src/office/ui/team-sheet.js), tự mở rộng văn phòng thành Trụ sở (src/office/ui/expand.js).
- Quyết định & lưu ý:
  - Mọi chữ hiển thị phải qua i18n, có đủ cả vi và en (src/i18n/locales/{vi,en}); số khóa hai bên phải bằng nhau.
  - Trên Windows, hook của Claude Code ghi dạng "command" + "args" (không qua shell). Dạng chuỗi cũ cần Git Bash và từng chặn mọi lệnh.
  - Đăng nhập Claude Code CLI kiểm tra bằng `claude auth status`. Ứng dụng Claude desktop đăng nhập riêng; `.credentials.json` có thể chỉ chứa mcpOAuth.
  - Đội AI: mỗi bước là một phiên CLI, dùng chung model; verify ghi "VERDICT: PASS|FAIL"; FAIL thì sửa tối đa 2 vòng; bước ship không push hay publish trừ khi mục tiêu yêu cầu.
  - Chạy thử server ở cổng 4311 với OFFICE_DATA_DIR riêng. Cổng 4310 có thể là app My Office mà người dùng đã cài: không tắt nó.
  - Kiểm tra trước khi commit: `npx eslint .`, `npx tsc --noEmit`, `node --test`, `npx next build`.
- Còn dở: chưa thêm phòng mới ngoài 4 phòng ban của Trụ sở (DEPTS trong src/office/world/layout.js là chỗ để thêm sau).

### 04/11/2026 11:30 · Ai làm: phiên "My Office setup và Codex CLI integration" · CLI: Claude Code · Model: claude-opus-5-5
- Đã làm: Phòng AI 15 Agent DEV (DEPTS[3] có `team: true`, 4 cụm bàn, 16 bàn, biển tên vai trò); nhân sự của đội mang tên vai trò (server/index.mjs teamRole); người rảnh không ngủ mà ra phòng nghỉ hoặc lái xe máy dạo (people/workers.js unwind); hóa thân lái xe máy và ô tô VF3 (interact/first-person.js); nút camera "Phòng AI".
- Quyết định & lưu ý:
  - Thứ tự bàn trong phòng AI lấy từ src/shared/team-roles.js TEAM_SEATS, phải trùng với ROLES trong server/team.mjs (có test kiểm tra).
  - Cụm bàn có thể khai báo [x, z, aisle] để chỉnh khoảng lối đi.
  - Thử giao diện khi không mở được khung trình duyệt: Playwright với Edge (channel 'msedge', --use-angle=d3d11), trang ?debug (window.__office.upsert / rides / fp).
- Còn dở: chưa thêm phòng mới ngoài 4 phòng ban.

### 04/11/2026 11:30 · Ai làm: phiên kiểm tra bộ nhớ và phát hành · CLI: Codex CLI · Model: GPT-6 (Codex)
- Đã làm: đọc AGENTS.md và bộ nhớ chung; xác nhận server/memory-file.mjs, server/memory.mjs và giao diện bộ nhớ đã có trong Git; chạy 9 test bộ nhớ, tất cả đạt.
- Quyết định & lưu ý: file .ai-office/MEMORY.md đã tồn tại và có ghi chú của agent; nhật ký tự động hiện chưa ghi phiên kết thúc nào. Bản Release v0.4.1 trước đó được build từ c5c37ea, trước các commit bổ sung file bộ nhớ chung c0d06ff và 0435308.
- Còn dở: nếu cần tính năng file bộ nhớ chung trong bản cài, phải build và phát hành bản mới từ code hiện tại.

### 04/11/2026 11:43 · Ai làm: tư vấn bộ nhớ dùng chung và tối ưu ngữ cảnh · CLI: Codex CLI · Model: GPT-6 (Codex)
- Đã làm: kiểm tra hướng dẫn hiện có, bộ nhớ chung và bản đồ kiến trúc; soạn yêu cầu thiết lập cách đọc tài liệu theo nhu cầu cho Claude/Codex khi đổi tài khoản.
- Quyết định & lưu ý: đề xuất dùng chỉ mục dự án ngắn, bản đồ chức năng tra cứu riêng và trạng thái bàn giao gọn; khi triển khai phải sửa cả mẫu sinh hướng dẫn trong server/memory-file.mjs để không bị ghi đè. Đây là đề xuất, chưa triển khai.
- Còn dở: người dùng có thể dùng câu lệnh thiết lập để yêu cầu triển khai; hiện chỉ bổ sung ghi chú tư vấn vào bộ nhớ.

