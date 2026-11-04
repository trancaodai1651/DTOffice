# Đội AI Agent Dev, giao việc qua hướng dẫn viên, dự án của người dùng, gói Codex · Claude Code · 04/11/2026

## Mục tiêu (yêu cầu người dùng)

- Nhân sự AI Agent Dev ngồi ở phòng AI Agent DEV, luôn có mặt; rảnh thì ở phòng nghỉ, ra ngoài phải xin phép CEO.
- "Đội AI" → "Đội AI Agent Dev"; sau này có thêm nhiều đội AI Agent khác mảng.
- Chỉ giao việc cho hướng dẫn viên: hỏi Project nào, tự tìm đội phù hợp; một task có thể nhiều đội phối hợp.
- Task mới cần nhân sự đang bận: đợi xong mới gọi. Nhân sự tới gặp sếp nhận task.
- Người dùng thêm/xóa nhiều project của mình. "Cái gì đang ăn gói" có cả Codex.

## Phối hợp

- Lượt đội AI `2026-11-04-2a506d` (hiện diện mặc định) **đã bị dừng** ở bước build (Frontend `stopped`, không có báo cáo build). Code Frontend để lại trong working tree (resident, team-roster, team-presence, office-layout…) được giữ nguyên, Claude tích hợp lên trên và kiểm tra toàn bộ. Chưa resume lượt đó; QA/Reviewer/DevOps của lượt chưa chạy.
- Phần xin phép ra ngoài là của Codex ([dev-team-exit-permission](dev-team-exit-permission.md)); Claude không sửa, chỉ dùng (resident không bao giờ ra ngoài).

## Đã làm (chưa commit)

- Server: `team.mjs` TEAMS/routeTeams, run `teams`/`ti`, `held` (cùng người hoặc build/fix cùng dự án), ưu tiên task cũ, `job.at`, `whoSid`; `index.mjs` `/api/team/route`, `/api/projects` (add/del, loopback + cùng origin, `projects-hidden.json`), `/api/burn?agent=codex`, chat held/heldCode/nextTeam/called.
- `server/codex-burn.mjs` (mới): rollout Codex → token theo model/dự án/phiên/vai trò/ngày, cửa sổ 5h/tuần (chỉ limit `codex`, bỏ bản "premium" rỗng), bỏ token_count lặp (total không đổi).
- 3D: `people/team-brief.js` (mới) resident được gọi (job bắt đầu ≤90 s) đi tới ghế trước bàn giám đốc, chờ giám đốc về, nhận giấy, về bàn; resident rảnh thỉnh thoảng ra phòng nghỉ và về khi có việc. `workers.js` cho resident `roaming` đi được; `loop.js` update resident khi roaming; `ai-team.js` không ghi đè anim khi roaming; `director.js` `handTo`; `incidents.js` nhân viên thường có prompt → lên gặp sếp nhận việc (fallback giám đốc mang tới).
- UI: `guide-work.js`, `projects.js` (mới); guide/task-sheet/team-sheet (quản lý dự án, chip ⏳ held, đội); burn tab Claude/Codex + dòng Codex ở bảng hạn mức.
- i18n vi/en: projects (mới), burn.codex, guide.work, team (đổi tên, teams, held, chat…), people.brief, incident.takeTask, server.projects; world/ui/server đổi tên đội.
- Tài liệu: HUONG-DAN (dự án của bạn, giao việc qua hướng dẫn viên, nhiều việc cùng lúc, phòng AI luôn có mặt, gói Codex), maps SERVER/FRONTEND, ARCHITECTURE module map.

## Kiểm tra

- `npm run lint`, `tsc --noEmit`: đạt. Unit toàn bộ: 201, 194 đạt, 7 bỏ qua, 0 lỗi (gồm team 11, codex-burn 3). Module map: cập nhật.
- `next build` (dist riêng `.next-claude`, đã xóa) đạt. Server thử cổng 4317, data scratchpad; không động app 4310 và dev server 4311 của phiên khác.
- Edge headless: Backend được gọi đi tới bàn giám đốc (~17 s), chờ giám đốc về, nhận "Development: …", về ngồi bàn. Luồng hướng dẫn viên tới bước chọn đội (đội Dev, lý do "api, lỗi, test, sửa"). Ngăn Codex: 58.9M token hôm nay, 5h 100%, tuần 98%.

## Còn dở / bước tiếp

- Đã commit `6344f4e` và đẩy lên `main` (gồm cả code lượt 2a506d và phần xin phép của Codex). Chưa nâng version, chưa đóng gói app desktop.
- Chưa thử trực quan resident ra phòng nghỉ (logic giống đường đi nhận việc đã thử). Chưa có e2e cho guide-work/projects.
- Lượt `2026-11-04-2a506d` dừng: nếu muốn đội kiểm thử/rà soát phần hiện diện thì bấm Tiếp tục ở bảng đội.
