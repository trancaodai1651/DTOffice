# Họp trước khi làm, làm ở bàn, gói Codex, bản 0.4.7 · Claude Code · 04/11/2026

## Yêu cầu

- Kiểm tra phiên trước đã xong chưa. Ảnh chỉ hiện của Claude, không có của Codex. Làm việc phải ngồi ở bàn; trước khi làm phải họp với toàn bộ nhân sự đảm nhiệm. Build Windows + macOS Universal và đẩy lên GitHub.

## Kiểm tra phiên trước

- v0.4.6 đã phát hành trên GitHub (commit `83c6c71`, 6 tệp: Windows NSIS, macOS Universal DMG/app, SHA256SUMS). Lần tag đầu lỗi Mac do test đường dẫn Windows; đã sửa và gắn lại tag.
- App đang cài trên máy (`AppData/Local/DT Office`, 14:42) là bản cũ hơn 0.4.6: không có `/api/specialists`, `/api/burn?agent=codex` trả số của Claude → vì vậy chỉ thấy của Claude. Cần cài bản mới.

## Đã làm

- `people/team-brief.js`: thay việc từng người đi gặp giám đốc bằng **họp khởi động**: bước của đội bắt đầu (job ≤90 s) → mọi thành viên được gọi đi tới bàn họp (`allocate('meeting')`), giám đốc tới chỗ `brief` (director.job = meeting), mở họp, từng người nhận phần (director.handTo(..., true) chuyền giấy), đóng họp, ai về bàn nấy (`home`, giờ tự bật `roaming`). `callMeeting(roles, task, {parts, after})` dùng chung; không có giám đốc/giảm chuyển động/tab ẩn thì về bàn luôn.
- `people/specialists.js`: việc mới → họp (video từ bản tin: thêm nhân sự đọc báo để bàn giao) → ngồi bàn của phiên (live.js giờ cấp bàn cho phiên của nhân sự chuyên trách; chưa có phiên thì bàn trống) → xong về ghế thư viện. Bỏ qua kết quả đọc lần đầu nếu luồng trực tiếp đã có dữ liệu mới hơn.
- `director.js` handTo nhận cờ meeting; `ui/burn.js` dòng Codex tự đọc số hôm nay (tối đa 20 s/lần).
- i18n `people.brief.*` (họp); HUONG-DAN; `docs/RELEASE-0.4.7.md`; version 0.4.7.

## Kiểm tra

- Lint, typecheck, unit 205 (198 đạt, 7 bỏ qua), module map đạt; `next build` dist riêng đạt.
- Edge headless (server thử 4317): PM/PO/BA họp ~18 s, giám đốc mở/giao/đóng, về đúng bàn ngồi; đọc báo + edit video họp chung, editor ngồi bàn gõ "Đang dựng video…", xong về ghế thư viện; tab Codex hiện "Hôm nay: 58,6 tr · gpt-6.1-sol 91%".

## Phát hành / bước tiếp

- Đã phát hành [v0.4.7](https://github.com/trancaodai1651/DTOffice/releases/tag/v0.4.7) (commit `b232fc6`, workflow Desktop release #7 đạt): `DT.Office_0.4.7_x64-setup.exe`, `DT.Office_0.4.7_universal.dmg`, `DT-Office-macos-universal.app.tar.gz`, `SHA256SUMS.txt`. Người dùng cần cài bản mới để thấy phần Codex.
