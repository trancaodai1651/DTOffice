# Server, CLI và logic dùng chung

[Chọn nhóm khác](../FEATURE-MAP.md). Đường dẫn tính từ root; test viết gọn `unit/X` = `tests/unit/X.test.mjs`,
`e2e/X` = `tests/e2e/X.spec.ts`. API dưới đây tìm trong `server/index.mjs` trừ khi chỉ rõ khác.

| Chức năng | Code chính | Điểm vào / luồng cần tìm | Test liên quan |
| --- | --- | --- | --- |
| Khởi động/cài/gỡ/doctor | `bin/cli.mjs`, `bin/service.mjs` | CLI command dispatcher, server import; launchd/systemd/Startup | `scripts/smoke.mjs`; `unit/otel-install`, `unit/loop-hook` |
| Chọn CLI, cài và đăng nhập | `server/setup.mjs`, `server/claude-version.mjs` | `/api/setup`, `/api/setup/login`; `claude auth status` | `unit/setup`; `e2e/office` smoke |
| Hook Claude, danh sách phiên, SSE | `hooks/send.mjs`, `hooks/status-line.mjs`, `server/index.mjs` | `/event`, `/hook/*`, `/stream`, `onHook` | `unit/cache-clock`, `unit/loop-hook`; `e2e/office` |
| Phiên Codex và hội thoại | `server/codex-sessions.mjs` | `onHook`, rollout events, `readCodexLog` | `unit/codex-sessions` |
| Tài khoản/hạn mức Claude/Codex | `server/codex-accounts.mjs`, `server/index.mjs` | `createCodexAccounts`, `codex app-server`, auth switching; Claude `/api/accounts` | `unit/codex-accounts`; `e2e/ai-accounts` |
| Tài khoản IDE khác | `server/antigravity-accounts.mjs` | account state/database, quota/switching | `unit/antigravity-accounts`; `e2e/ai-accounts` |
| Giao việc/chọn model/effort | `server/tasks.mjs`, `server/agent-models.mjs` | `/api/tasks`, `memoryWords`, CLI args | `unit/agent-models`; `e2e/bg-tasks` |
| Phiên nền/chen lời | `server/bg-sessions.mjs`, `server/steer.mjs` | background session lifecycle, inbox socket | `unit/bg-sessions`, `unit/steer`; `e2e/bg-tasks`, `e2e/steer` |
| Model điều phối/subagent | `server/models.mjs`, `src/shared/model-name.js` | settings và env model; `/api/models` | `unit/models`; `e2e/models`, `e2e/sub-model` |
| Đội AI Agent (TEAMS: Dev) | `server/team.mjs`, `src/shared/team-roles.js`, `src/office/ui/team-sheet.js`, `src/office/ui/guide-work.js` | `/api/team` (nhận `teams`), `/api/team/route`, `/api/team/stop`, `/api/team/resume`; mỗi vai trò một phiên; PM phân công (`ROLES:`); nhiều đội làm lần lượt; thành viên bận task khác thì `held`, build/fix cùng dự án chờ nhau | `unit/team` |
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
