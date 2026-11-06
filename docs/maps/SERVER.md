# Server, CLI và logic dùng chung

Từ 0.4.15: `server/role-training.mjs` đọc `server/skills/{dev,marketing,specialists}/` (_team.md + <role>.md),
38 vị trí có workflow mặc định; `team.mjs`/`specialists.mjs` chèn vào prompt thật, rồi nối skill cá nhân.
`GET /api/team` trả `defaultSkills`, `roleSkills`, `specialists`; `/api/team/skills` nhận cả news/video.
Xóa skill cá nhân vẫn giữ mặc định, không đổi việc đang chạy. Test `unit/role-training`, `unit/team`, `e2e/staff-tools`.
`asset-library.mjs` lọc media theo cả cú pháp Windows/Unix để dữ liệu chuyển hệ vẫn giữ đường dẫn trong bài; test `unit/asset-library`.

Từ 0.4.14: `/api/tasks` có `assignment=dev|marketing|session`; giveDepartmentWork dùng chung `/api/team`,
giữ CLI/account theo SID và model/effort. PM/CTO/CMO là manager delegation, các role khác direct.
`shared/department-request.js` nhận lệnh giao quản lý rõ ràng; `cli-environment.mjs` giữ auth/provider, bỏ nested flags;
setup probe lỗi/không hỗ trợ = unknown, không crash. Test `unit/department-request`, `unit/cli-environment`,
`unit/setup`, `unit/team`, `e2e/department-delegation` (fake CLI, không gọi AI thật).

Từ 0.4.13: `/api/desktop-update-status` chỉ loopback, không Origin/forwarded; `shared/update-readiness.js` xét task, team run và specialist render/print để native updater chờ trước khi khởi động lại. Test `unit/updates`.

Từ 0.4.11: `/api/team` nhận `role` để giao riêng, stage `direct` dùng skill đã lưu; thiếu role giữ quy trình đội. `media-tools.mjs` chọn FFmpeg/ffprobe bundled; `video-tools.mjs` tải HTTPS bằng OS CA, render manifest và kiểm MP4 thật. Video chỉ done sau H264/AAC/30fps/ratio hợp lệ; có phục hồi export cũ, trạng thái render. Prompt nội bộ dài gửi stdin. Test: `unit/video-tools`, `unit/task-prompt`, `unit/team`, `e2e/video-export`.

[Chọn nhóm khác](../FEATURE-MAP.md). Đường dẫn tính từ root; test viết gọn `unit/X` = `tests/unit/X.test.mjs`,
`e2e/X` = `tests/e2e/X.spec.ts`. API dưới đây tìm trong `server/index.mjs` trừ khi chỉ rõ khác.

| Chức năng | Code chính | Điểm vào / luồng cần tìm | Test liên quan |
| --- | --- | --- | --- |
| Khởi động/cài/gỡ/doctor | `bin/cli.mjs`, `bin/service.mjs` | CLI command dispatcher, server import; launchd/systemd/Startup | `scripts/smoke.mjs`; `unit/otel-install`, `unit/loop-hook` |
| Chọn CLI, cài và đăng nhập | `server/setup.mjs`, `server/claude-version.mjs` | `/api/setup`, `/api/setup/login`; `claude auth status` | `unit/setup`; `e2e/office` smoke |
| Hook Claude, danh sách phiên, SSE | `hooks/send.mjs`, `hooks/status-line.mjs`, `server/index.mjs` | `/event`, `/hook/*`, `/stream`, `onHook` | `unit/cache-clock`, `unit/loop-hook`; `e2e/office` |
| Phiên Codex và hội thoại | `server/codex-sessions.mjs` | `onHook`, rollout events, `readCodexLog`; Codex Desktop giữ chat chính gần nhất mỗi dự án khi app chạy; metadata tổ tiên không thay danh tính fork | `unit/codex-sessions` |
| Tài khoản/hạn mức Claude/Codex | `server/codex-accounts.mjs`, `server/index.mjs` | `createCodexAccounts`, `codex app-server`, auth switching; Claude `/api/accounts` | `unit/codex-accounts`; `e2e/ai-accounts` |
| Tài khoản IDE khác | `server/antigravity-accounts.mjs` | account state/database, quota/switching | `unit/antigravity-accounts`; `e2e/ai-accounts` |
| Giao việc/chọn model/effort | `server/tasks.mjs`, `server/agent-models.mjs`, `src/shared/specialist-request.js` | `/api/tasks`, `memoryWords`, CLI args; `specialistRequest` nhận lệnh đọc báo trước khi chọn phiên thường; câu hỏi, phủ định và yêu cầu sửa phần mềm không tạo việc báo chí | `unit/agent-models`, `unit/specialist-request`; `e2e/bg-tasks`, `e2e/specialists-routing` |
| Phiên nền/chen lời | `server/bg-sessions.mjs`, `server/steer.mjs` | background session lifecycle, inbox socket | `unit/bg-sessions`, `unit/steer`; `e2e/bg-tasks`, `e2e/steer` |
| Model điều phối/subagent | `server/models.mjs`, `src/shared/model-name.js` | settings và env model; `/api/models` | `unit/models`; `e2e/models`, `e2e/sub-model` |
| Đội AI Agent (Dev/Marketing) | `server/team.mjs`, `src/shared/team-roles.js`, `src/office/ui/{lite,team-sheet,role-skills}.js`, `server/role-training.mjs` | `/api/team` (nhận `teams`), `/api/team/route`, `/api/team/stop`, `/api/team/resume`; mỗi vai trò một phiên; lead phân công (`ROLES:`); nhiều đội làm lần lượt; thành viên bận task khác thì `held`, build/fix cùng dự án chờ nhau; `/api/team/skills` lưu skill theo role vào data-dir/role-skills.json và chèn prompt lúc launch | `unit/team`; `e2e/staff-tools` |
| Kho dữ liệu + tài khoản MXH (Marketing) | `server/asset-library.mjs`, `server/social-accounts.mjs`, `server/skills/marketing/` (skill dựng sẵn theo vị trí), `src/office/ui/library-panel.js` | GET `/api/library`; POST `/api/library/{root,source,unsource,open,posted}`, `/api/social/{add,remove,login,visit,publish}` (chỉ máy này). Kho mặc định `~/DT Office/Kho du lieu` (san-pham/, bo-anh/, bai-dang/, marketing/); mỗi tài khoản một hồ sơ Edge/Chrome ở data-dir/social-profiles/<id>, không lưu mật khẩu; Đăng = mở trang đăng của tài khoản + chép caption + mở thư mục media, CEO bấm đăng. Team marketing không dự án làm trong kho; `createTeam({ context })` chèn kho + tài khoản vào prompt | `unit/asset-library`, `unit/team` |
| Nhân sự chuyên trách | `server/specialists.mjs`, `src/shared/specialist-request.js`, `server/skills/video/` (9 skill), `src/office/ui/specialists.js`, `src/office/people/specialists.js` | `/api/specialists`, POST `/api/specialists/{news,video,stop,open,ffmpeg}`; lệnh đọc báo từ 2D/Giao việc/chat/team → News reader; mỗi chuyên viên chỉ nhận một việc đang chạy/in; lưu task/SID, `teamRole` ưu tiên SID chính xác kể cả task đã xong, fallback thư mục chỉ cho job đang chạy chưa gắn SID; tái dùng resident và tên vai trò; WebSearch / `web_search="live"`, PDF qua Edge/Chrome | `unit/specialists`, `unit/specialist-request`; `e2e/specialists-routing` |
| Dự án của người dùng | `server/index.mjs` (`editProjects`, `projects.json`, `projects-hidden.json`), `src/office/ui/projects.js` | `/api/projects` GET, POST `{op: add|del, dir}` chỉ loopback + cùng origin | — |
| Bộ nhớ phiên/JSON, context hook | `server/memory.mjs` | `createMemory`, `observe/end/finish/context`, `/hook/memory`, `/api/memory` | `unit/memory`; `e2e/memory` kiểm tra giao diện, không thay thế unit memory |
| File nhớ/bàn giao dùng chung | `server/memory-file.mjs` | `writeProjectMemory`, `projectContext`, `rulesBlock`; AGENTS/CLAUDE managed block | `unit/memory-file`, `unit/memory` |
| Duyệt quyền, loop, trùng file/cổng | `server/loops.mjs`, `server/overlap.mjs`, `src/shared/danger.js` | `/hook/loop`, PreToolUse và pending permissions | `unit/loops`, `unit/loop-hook`, `unit/overlap`; `e2e/denied`, `e2e/stuck`, `e2e/overlap` |
| Hoàn tác lượt sửa | `server/undo.mjs` | snapshot/restore theo lượt, `/api/undo` | `unit/undo`; `e2e/undo` |
| Máy/RAM/tiến trình/dọn dẹp | `server/system.mjs`, `server/platform/` | `/api/sys`; `platform/index.mjs` chọn darwin/linux/win32; `shared.mjs` hỗ trợ | `unit/platform`; `scripts/smoke.mjs` |
| Git/CI/release/worktree bỏ quên | `server/git.mjs`, `server/stranded.mjs` | git polling, gh checks, `/api/stranded` | `unit/git-release`, `unit/stranded`; `e2e/ci-fix`, `e2e/stranded` |
| Chi phí/cache/telemetry | `server/usage.mjs`, `server/otel.mjs`, `server/otel-setup.mjs`, `server/codex-burn.mjs`, `src/shared/burn.js`, `src/shared/cache-clock.js` | `/v1/metrics`, `/v1/logs`, `/api/burn`, `/api/burn?agent=codex` (rollout Codex), status line | `unit/otel`, `unit/otel-install`, `unit/burn-roles`, `unit/codex-burn`, `unit/cache-clock`; `e2e/burn`, `e2e/cache` |
| Kho hội thoại/báo cáo prompt | `server/vault.mjs`, `server/prompt-report.mjs`, `server/rewrite.mjs`, `src/shared/prompt-coach.js` | `/api/vault`, prompt report/rewrite | `unit/vault`, `unit/prompt-report`, `unit/prompt-coach`, `unit/rewrite`; `e2e/vault`, `e2e/prompt-coach` |
| Replay/tổng kết/cột mốc | `server/wrapped.mjs`, `server/trophies.mjs`, `server/testrun.mjs`, `src/shared/timeline.js` | replay persistence, wrapped/trophies, test summary | `unit/wrapped`, `unit/trophies`, `unit/testrun`, `unit/timeline` |
| Lịch, thâm niên, hoạt động | `server/tenure.mjs`, `server/lift-service.mjs`, `src/shared/workdays.js`, `src/shared/comnha.js`, `src/shared/duty.js` | lifecycle/events gửi qua SSE | `unit/tenure`, `unit/lift-service`, `unit/workdays`, `unit/comnha`, `unit/duty` |
| Điện thoại/thông báo/chụp ảnh | `server/push.mjs`, `server/shots.mjs`, `server/index.mjs` | LAN/PIN, `/api/push`, shots | `unit/push`; `e2e/phone`; shots chưa có unit chuyên biệt |
| Data/config/che bí mật | `server/data-dir.mjs`, `server/prefs.mjs`, `server/redact.mjs` | `DATA_DIR`, `OFFICE_DATA_DIR`, `.office-app`, `redact` | `unit/data-dir`, `unit/redact` |

Chọn route bằng `rg -n '/api/memory|createMemory' server/index.mjs`; không in toàn bộ server monolith.
Giới hạn/định dạng context hiện tại xem code `context()`; không suy ra chỉ từ file tài liệu.
