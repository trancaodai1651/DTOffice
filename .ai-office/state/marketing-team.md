# Đội AI Agent Marketing · 06/11/2026 · Claude Code

## Mục tiêu
Một phòng Marketing đủ vị trí (mỗi agent một vị trí), có Marketing Manager nhận việc từ CEO rồi phân công cho vị trí phù hợp.

## Đã làm
- `server/team.mjs`: `MARKETING_ROLES` (18: cmo, research, strategist, brand, product, content, copywriter, designer, motion, seo, ads, social, email, pr, kol, events, editor, analytics), `MARKETING_GROUPS`, `MARKETING_STAGES` (mplan → mstrategy → mproduce → mreview, sửa `mfix`, báo cáo bởi cmo). Team `marketing` trong `TEAMS` (lead `cmo`, từ khóa định tuyến).
- Tổng quát hóa vòng chạy: `isCheck/isFix/isPlan`, `fixOf/checkOf/fallbackOf`, `leadOf`; prompt dùng tên đội. CMO phân công bằng dòng `ROLES:`; không ghi ai → copywriter, designer, social.
- Marketing chỉ tạo file trong `marketing/<run>/`, không sửa code, không đăng/gửi/chi tiền.
- `server/index.mjs`: `/api/team` trả `teams[].stages/lead` và `marketing.{roles,groups}`; chat assignedMk/passMk/failMk.
- UI: `team-sheet.js` thêm "Marketing Manager · Đội AI Agent Marketing" ở "Giao cho" + sơ đồ phòng; `guide-work.js` tên lead; `team-brief.js` chỉ gọi họp resident có bàn. i18n vi/en `team.js`, `chat.js`; CSS `group-chat.css`.

## Phòng 3D Marketing (HQ)
- `layout.js`: DEPTS[0] và DEPTS[2] (bên trái hành lang B) có `mk: true`; DEPTS[2] `big: true` (4 pod như phòng AI) → 8 + 16 = 24 bàn. Tường thấp giữa hai phòng có cửa thông; nút mạng `MKg` nối hai phòng (`navigation.js`). `teamRoom` dùng cho mọi phòng 4 pod, cửa phía đông nối pod bên phải.
- `team-roles.js`: `MARKETING_SEATS` (thứ tự bàn: phòng sau = quản lý, nghiên cứu/chiến lược, kiểm duyệt; ô `null` = bàn CEO; phòng trước = nội dung + kênh), `MARKETING_ROLE_IDS`.
- `ai-team.js`: resident Marketing luôn ngồi bàn (`data-mk-role`, không `data-dev-role`); hook debug `teamRoster` chỉ Dev (15), `marketingRoster` (18). `team-presence.js` nhận `seats`.
- `live.js`: phiên vai trò marketing ngồi bàn của mình; khu marketing không nhận dự án thường. `wing.js`: biển "PHÒNG MARKETING", thảm/màu riêng, biển tên từng bàn. Camera: nút "Phòng Marketing" (`CameraToolbar.tsx`, `camera-bar.js`).
- Hệ quả: HQ còn 1 phòng ban (DEPTS[1]) + 6 khu tầng chính cho dự án thường.

## Quyết định
- `ROLES`/`TEAM_SEATS` giữ 15 vị trí Dev; Marketing tách riêng để roster/E2E Dev không đổi.

## Kiểm tra
- lint, typecheck đạt; unit 238 (231 đạt, 7 bỏ qua, 0 lỗi), 4 test marketing mới.
- Xem tay ở cổng 4311 (?layout=hq): 18 nhân sự ngồi đúng bàn, phòng AI không đổi, console không lỗi; Dev roster 15, Marketing 18.
- E2E không chạy được trên máy này: server test lỗi `spawn EFTYPE` khi gọi `tests/e2e/fake-claude.sh` (server/setup.mjs claudeAuth), có sẵn, không do thay đổi này.
- Chưa commit.

## Bước tiếp
- Chạy E2E team-office/team-presence ở môi trường chạy được .sh (CI/macOS).
