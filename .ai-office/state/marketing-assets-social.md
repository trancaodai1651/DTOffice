# Marketing: Kho dữ liệu, tài khoản MXH, 3 nhân sự mới, sửa giao việc · 06/11/2026 · Claude Code

## Mục tiêu
1. Social Media quản trị nhiều tài khoản (Facebook, TikTok, Threads, Instagram, + Shopee, TikTok Shop, Zalo OA) đã lưu đăng nhập để đăng bài.
2. Nhân sự viết bài/lên ý tưởng rồi chuyển Social đăng. 3. Nhân sự quản lý kho dữ liệu + phòng kho.
4. Nhân sự làm bộ ảnh sản phẩm (MXH, Shopee, TikTok Shop), lưu theo loại sản phẩm. 5. Đào tạo (skill) + sửa lỗi không giao việc được cho Marketing.

## Nguyên nhân không giao việc được (đã sửa)
- Bắt buộc có thư mục dự án code (`memoryDir`) → người bán hàng không có dự án là không giao được. Nay Marketing không dự án làm trong Kho dữ liệu (server tự chọn; form tự chọn khi chọn CMO/vị trí Marketing; guide có nút Kho).
- `routeTeams` đưa việc "bộ ảnh sản phẩm shopee", "kho dữ liệu"… sang đội Dev (thiếu từ, "dữ liệu"/"nhân sự" tính cho Dev). Nay thêm từ, từ mơ hồ tính nửa điểm, từ nằm trong cụm dài hơn của đội khác không tính.
- Danh sách nhân sự (team-roster) chỉ có 15 Dev → không có nút giao việc từng người Marketing. Nay có đủ 21 Marketing theo nhóm.
- Guide chỉ hiện PM/CTO ở "Giao cho"; nay hiện Marketing Manager khi đội đầu là Marketing.

## Đã làm
- `server/team.mjs`: 21 vị trí; mới `creator` (Content Creator), `librarian` (Asset Manager), `photo` (Product Photo), nhóm `massets`; `social` sửa nhiệm vụ. Giai đoạn mới `mpublish` (social, sau mreview) — chỉ chạy khi CMO gọi social/creator/photo hoặc không ghi ROLES. Giai đoạn không ai cần thì bỏ qua (`stageAfter` + vòng bỏ qua). Fallback mproduce = creator, designer. `builtinSkills(role)` đọc `server/skills/marketing/{_team,<role>}.md` chèn vào prompt; `createTeam({ context })` chèn mô tả kho + tài khoản.
- `server/asset-library.mjs`: kho (mặc định `~/DT Office/Kho du lieu`; san-pham/<loại>/<sp>/goc, bo-anh/<loại>/<sp>/<nền tảng>-<ngày>, bai-dang/<id>/post.json, marketing/), liên kết thư mục nguồn (không chép/xóa), đếm ảnh/video, đọc bài, đánh dấu đã đăng, `brief()` cho prompt.
- `server/social-accounts.mjs`: tài khoản → hồ sơ trình duyệt riêng data-dir/social-profiles/<id> (Edge/Chrome `--user-data-dir`); CEO tự đăng nhập một lần; Đăng = mở trang đăng + chép caption (trang) + mở thư mục media; Threads điền sẵn text. Không lưu mật khẩu/cookie trong file của app; không tự bấm đăng (nền tảng cấm tự động hóa).
- `server/index.mjs`: `/api/library`, `/api/library/*`, `/api/social/*` (POST chỉ loopback); `teamOut.workspace`; `/api/team` dùng kho khi Marketing không dự án.
- UI: `ui/library-panel.js` (Kho · Tài khoản MXH · Bài chờ đăng) trong bảng Giao việc; `team-sheet.js` mục 📦, dự án "Kho dữ liệu Marketing", tự chọn kho; `team-roster.js` thêm Marketing; `guide-work.js` CMO + nút Kho. i18n `library.js` vi/en, team/world/ui.
- 3D: DEPTS[1] `kho: true` = "Phòng Kho dữ liệu" (biển cửa, kệ hồ sơ/thùng ở tường tây, biển KHO DỮ LIỆU, bàn librarian + photo theo `KHO_SEATS`); creator ngồi phòng Marketing trước. Camera nút "Phòng Kho dữ liệu". Phòng ban cho dự án thường ở HQ: chỉ còn 6 khu tầng chính.

## Kiểm tra
- lint, typecheck đạt; unit 256 (249 đạt, 7 bỏ qua, 0 lỗi), test mới: asset-library (3), team (5 mới).
- Module map đã làm mới, check đạt.
- Chạy thử cổng 4311 (data/home riêng, Edge headless): API kho/tài khoản/bài đăng đúng; 21 resident Marketing; roster 15 Dev + 21 Marketing; chọn Product Photo tự chọn Kho; console không lỗi; ảnh phòng Kho xem tay ổn.
- E2E chưa chạy (máy này lỗi `spawn EFTYPE` có sẵn); đã sửa `e2e/team-presence` đếm theo `data-team`.
- Chưa commit.

## Còn dở / bước tiếp
- Chạy E2E team-presence/team-office ở CI/macOS.
- Thử thật: liên kết thư mục ảnh → giao Asset Manager; giao Product Photo làm bộ ảnh Shopee (cần sharp: agent tự `npm i sharp` trong thư mục tạm); thêm tài khoản → Đăng nhập → Đăng.
- Có thể thêm: hẹn giờ nhắc đăng theo `when`, đăng hàng loạt.
