# Nhân sự đọc báo, nhân sự edit video, Codex Bot, bản 0.4.6 · Claude Code · 04/11/2026

## Mục tiêu (yêu cầu người dùng)

- Nhân sự đọc báo: chọn nhân sự → hỏi chủ đề → tìm báo Việt Nam và nước ngoài → trả tóm tắt PDF → hỏi có làm video không, có thì chuyển nhân sự edit video.
- Nhân sự edit video: học các skill trong `Downloads/Các Skills`; hỏi video đầu vào (tìm tư liệu trên mạng hoặc chọn thư mục) và nơi lưu.
- Thêm con bot giống hình (bot của Codex). Build bản mới Windows và macOS Universal.

## Đã làm

- `server/specialists.mjs` (mới): job news/video, mỗi job một phiên CLI trong thư mục riêng; prompt đọc báo (2 nhóm báo, không bịa, `bao-cao.html` + `.md`), in PDF bằng Edge/Chrome headless (`printPdf`, đã thử thật, tiếng Việt đúng); prompt edit video (đọc skill, tư liệu miễn phí bản quyền + `nguon-tu-lieu.md` hoặc thư mục người dùng chỉ đọc, `kich-ban.md`, ffmpeg, `video-final.mp4`, kiểm tra an toàn nội dung). `findFfmpeg`, `ffmpegInstall` (winget/brew), `openPath`.
- `server/skills/video/`: 9 skill chép nguyên từ thư mục người dùng (36 file, đã rà không có chỉ dẫn lạ); nằm trong `server/` nên được đóng gói desktop.
- `server/tasks.mjs`: `args` thêm cờ riêng cho từng việc (Claude `--allowedTools`, `--add-dir`; Codex `-c web_search="live"`, `sandbox_workspace_write.network_access=true`), `perm: 'specialist'` (không tính giới hạn giờ, chạy print thay vì background). `setup.mjs`: `terminal(line)` dùng chung.
- `server/index.mjs`: `/api/specialists` + POST news/video/stop/open/ffmpeg (open/ffmpeg chỉ máy này), chat 📰/🎬, phiên của nhân sự gắn role `news`/`video`.
- 3D: `people/specialists.js` hai nhân sự ở 2 ghế đầu thư viện, bấm mở bảng; `people/codex-bot.js` robot xanh mặt `>_` đi theo đường văn phòng, tới bàn phiên Codex, bấm mở hạn mức Codex; `ai-team.clearWorld` chỉ xóa resident của đội; click `onPick`.
- UI: `ui/specialists.js` bảng hỏi chủ đề / brief, nguồn tư liệu, nơi lưu, kiểu 9:16 hoặc 16:9, CLI/model/effort, nút cài ffmpeg, việc gần đây, bản tin xong tự mở hỏi làm video; chị Mai có hai nút 📰/🎬.
- i18n vi/en `specialists` (mới), `team.roles.news/video`. HUONG-DAN, maps, module map, `docs/RELEASE-0.4.6.md`; version 0.4.6 (package, lock, Tauri, Cargo, Cargo.lock).

## Kiểm tra

- Lint, typecheck đạt; unit 205 (198 đạt, 7 bỏ qua, 0 lỗi) gồm `unit/specialists` 4 test; module map cập nhật; `next build` (dist riêng, đã xóa) đạt.
- Edge headless trên server thử cổng 4317: 2 nhân sự ngồi thư viện (17 resident), bảng đọc báo và edit video hiện đúng, cảnh báo thiếu ffmpeg, 9 skill; Codex Bot hiện và di chuyển. PDF in thử tiếng Việt đúng.
- Chưa chạy thật một lượt đọc báo/dựng video bằng CLI (Codex còn 2% hạn mức tuần; tránh tiêu gói). Máy này chưa có ffmpeg.

## Commit / phát hành

- `daa906b` tính năng; `e6e2390` CI in lỗi unit test thành annotation (đọc được không cần đăng nhập GitHub); `83c6c71` sửa test/tên dự án Codex trên macOS/Linux (đường dẫn kiểu Windows). CI Linux Node 22 đạt sau sửa.
- Tag `v0.4.6` lần đầu trỏ `daa906b`, build Mac lỗi ở npm test nên chưa có release; đã xóa và gắn lại tag ở `83c6c71`, workflow Desktop release chạy lại.

## Còn dở / bước tiếp

- Bản cài: tag `v0.4.6` kích hoạt workflow Desktop release (Windows NSIS + macOS Universal DMG, tự tạo GitHub Release). Theo dõi kết quả workflow trên GitHub.
- Tên cờ Codex `web_search="live"` theo cấu hình Codex hiện hành; nếu Codex đổi, sửa trong `server/specialists.mjs`.
