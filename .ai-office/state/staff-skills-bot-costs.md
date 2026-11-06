# Bida, bot Claude/Codex, USD/VND và skill theo vị trí · 06/11/2026

- Yêu cầu: sửa AI Agent rảnh không chơi bida; bot nổi theo dõi hai CLI, gõ laptop khi làm; USD/VND; skill theo vai trò; kiểm tra rồi đẩy code mới nhất lên Git.
- Baseline sạch `e9492ca` trên `main` (đã chứa toàn bộ 0.4.8/0.4.9 và Marketing của Claude). Giữ nguyên app người dùng ở 4310; test riêng 4399 và data/home riêng.
- Bida: thêm residents vào người chơi; `leisureSession` từ projection đã đồng bộ (kể cả việc nền), roaming trong ván, về home sau ván. Unknown/stale/work/wait không rảnh. E2E thực tế đi tới bàn, chơi, nhận việc và ngắt đã đạt.
- Bot: snapshot tổng hai CLI và counts từng CLI, không lộ nội dung phiên. Laptop SVG + typing chỉ khi work. HTML native giữ cơ chế drag/open/hide cũ.
- Tiền: `src/shared/api-money.js`; USD/VND cho activity, kế toán và burn; Codex thêm API-equivalent theo model, cache riêng. Rate minh họa 25000 có chỉnh/lưu tại burn; model chưa rõ giá giữ unknown. Giá chuẩn/ngữ cảnh ngắn, chưa tính phụ phí; không coi là hóa đơn thuê bao.
- Skill: `server/team.mjs` lưu `role-skills.json` trong data dir, kiểm tra role/20k ký tự, chèn đúng prompt khi launch; POST `/api/team/skills` cùng bảo vệ origin/auth, chỉ host; `ui/role-skills.js` nhập file hoặc paste, lưu/xóa. Có đủ 15 Dev +18 Marketing.
- Version 0.4.10; ghi chú `docs/RELEASE-0.4.10.md`. Unit toàn bộ 240 test: 232 đạt/8 skip; sau review Claude hook không có agent, thêm fallback đúng như server và 19 test tập trung đạt. Lint/typecheck/Next production/module map/diff check đạt.
- E2E: 8/8 staff-tools + team-presence; 4/4 burn UI (desktop, phone tiếng Việt không tràn, demo, empty) đạt. Đã cập nhật kỳ vọng USD/VND của burn cũ. Receiver/tunnel test cũ không chạy được trên Windows do fake-cloudflared.sh → state error; không sửa code tunnel. Setup overlay trong môi trường trắng được đóng bằng locator handler.
- Đã xem ảnh bot laptop `test-results/staff-bot.png` (ignored). Native release 3m17s đạt; server Node đóng gói + sharp/Next/trang 0.4.10 đạt. Sau compile cập nhật helper bot đóng gói và đối chiếu hash nguồn để gồm cả Claude legacy; resources giữ nguyên trong NSIS.
- Còn: NSIS đang nén; checksum, commit/push `main`, kiểm tra remote. Chưa tag/publish GitHub Release.
