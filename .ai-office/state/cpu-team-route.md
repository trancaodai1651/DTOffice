# CPU máy tính và giao việc cho đội · Claude Haiku 5.5 · 05/11/2026

## Yêu cầu
- Số CPU trên bảng Máy tính sai so với Task Manager (hiện 97%).
- Khi giao việc cho Claude/Codex mà việc thuộc vị trí của đội AI Agent Dev, nhân sự ở vị trí đó phải vào làm.

## Đã làm (commit b0070b0, đã đẩy main)
- `server/system.mjs`: tổng CPU bỏ "System Idle Process" (Windows ghi thời gian rảnh vào đó). Đo lại: tổng từng tiến trình 322% / 12 nhân ≈ 27%, trước đó ≈ 93%.
- `ui/task-sheet.js`: ở bước 2 của 📋 Giao việc, nếu việc khớp từ khóa của đội (routeTeams) thì hiện gợi ý "Giao cho đội"; mặc định vẫn là một phiên. Đội làm theo luồng họp → về bàn đã có.

## Kiểm tra
- Lint, typecheck, 207 test (200 đạt, 0 lỗi), module map đạt, build đạt.
- `/api/team/route` trả đúng đội dev cho "sửa lỗi api đăng nhập".
- Chưa bấm qua giao diện 📋 Giao việc (nút nằm trong menu chat, trình duyệt thử không tới được).

## Còn dở
- Bảng Máy tính đo trung bình vài giây; Task Manager đo ngắn hơn nên số có thể lệch. Ổ đĩa trên bảng là dung lượng trống C:, không phải % hoạt động như Task Manager.
- File chưa commit của phiên khác (không phải của phiên này): `core/loop.js`, `people/workers.js`, `scene/quality.js`, `scene/renderer.js`, `shared/graphics-policy.js`, `shared/session-name.js`, `tests/unit/session-name.test.mjs`, và `.ai-office/SESSION-LOG.md`. Không đụng.
- Chưa phát hành 0.4.8; bản 0.4.7 chưa có phần này.
