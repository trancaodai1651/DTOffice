# 2D, nhân sự thật, Skill theo vị trí và phát hành 0.4.15

## Mục tiêu / quyết định
- Giao việc trực tiếp trong 2D, xem đủ AI Agent và phiên CLI thật, Skill mặc định theo vị trí, gỡ hướng dẫn viên; commit/push và phát hành có updater.
- Giữ chế độ bảo mật đã chọn; giải thích nguyên nhân làm mờ và có nút tắt ngay, không tự xóa tùy chọn người dùng.
- 38 vị trí = 15 Dev + 21 Marketing + news/video. Chưa có phiên thì báo chờ việc; không dựng dữ liệu phiên giả.
- Skill mặc định là hướng dẫn được chèn vào prompt lúc chạy, không phải huấn luyện lại trọng số mô hình. Hướng dẫn cá nhân nối sau, lưu ngoài repo; chỉ áp dụng việc mới.
- Giữ guide.css vì chuyên viên dùng chung form; bỏ boot guide.js nên không còn nhân vật/nút hướng dẫn.

## Đã làm / file
- `src/office/ui/{lite,team-roster,team-sheet,settings,role-skills}.js`, `main.js`, `src/styles/{lite,streamer}.css`, i18n vi/en, shared/team-roles.
- `server/role-training.mjs`, `server/skills/{dev,marketing,specialists}/`, `server/{team,specialists,index}.mjs`: Skill đầy đủ 38 vị trí, API mặc định/cá nhân và prompt thật.
- `tests/unit/role-training.test.mjs`, team; E2E lite-workspace/specialists-routing/team-presence, sửa channel Windows cho department-delegation.
- `docs/maps/{SERVER,FRONTEND}.md`, module map ARCHITECTURE, release notes 0.4.15; đồng bộ package/lock/Tauri/Cargo 0.4.15.
- Action panel 2D phải dynamic import: static import group-chat-view gây chu kỳ boot qua core/env (đã sửa, test boot đạt).

## Kiểm tra
- Lint, typecheck, module-map check, git diff --check: đạt.
- Full unit: 264 test, 256 đạt, 8 skip theo môi trường, 0 lỗi.
- 16 E2E liên quan đạt (view2d/team-presence/specialists-routing/lite-workspace/staff-tools/updates); test specialist ban đầu thiếu nhập chủ đề đã sửa và chạy lại đạt.
- Xem ảnh 2D desktop + điện thoại 390×844: roster rõ, không tràn ngang; không WebGL trong 2D, không guide, mở đúng SID, 38 Skill xem được.
- E2E dùng CLI giả và home/data riêng; không dùng token hoặc kết luận đăng nhập máy thật từ môi trường thử. Không dừng app cổng 4310.
- Ảnh kiểm tra cục bộ: `test-results-lite-phone/lite-workspace{,-phone}.png` (ignored).

## Phát hành / tham chiếu
- Nhánh `main`; gốc `19d800e`, trước đó `367ff07` (0.4.14 local), remote trước nhiệm vụ `ac0d697` (0.4.13 public).
- Build production cách ly `.next-workspace` và smoke 0.4.15 trên Windows: đạt. Đang commit/tag/push; sau đó theo dõi Desktop release, CI, checksum và latest.json.
- Không stage/sửa `.ai-office/SESSION-LOG.md` do app tự quản lý.
- CI đầu phát hiện bộ lọc post media chỉ dùng path.isAbsolute của host: Linux/Mac không loại C:/x.jpg. Đã sửa dùng cả posix/win32, loại drive-relative và thêm fixture đa hệ; cần CI chạy lại trước publish.
