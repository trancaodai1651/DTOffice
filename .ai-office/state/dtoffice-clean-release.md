# DT Office · làm sạch nguồn và phát hành 0.4.5

## Mục tiêu

- Gỡ liên kết repository nguồn cũ, làm mới README, thay lịch sử Git và phát hành Windows/macOS Universal trên DTOffice.
- Người dùng đã yêu cầu xóa lịch sử liên quan và đẩy code/bản cài; được phép thay lịch sử nhánh và loại release/tag cũ.

## Đã hoàn tất

- Đã đọc INDEX/STATE/MEMORY cốt lõi; mã nguồn ban đầu trùng commit `7403222`.
- Metadata Git nằm trong thư mục con trống mã nguồn; đã đưa về root để Git theo dõi đúng workspace.
- Đích đã xác minh: `trancaodai1651/DTOffice`, nhánh `main`; người dùng GitHub có quyền admin/push.
- Bản mới dùng DT Office 0.4.5; giữ định danh lưu dữ liệu và hook cũ để tương thích nâng cấp.
- Giữ thông báo bản quyền trong LICENSE theo điều kiện MIT; không thay đổi office-log/bộ nhớ lịch sử.
- README Anh/Việt, metadata package/extension/plugin, thương hiệu giao diện và cấu hình desktop đã cập nhật.
- Root commit ứng dụng: `e1f471517d790e00eb8a4b1d6283b835fbeb3680`, không có parent. Nhánh `main`, tag `v0.4.5`.
- Release công khai: https://github.com/trancaodai1651/DTOffice/releases/tag/v0.4.5 (ID `433641027`).
- Đủ `DT.Office_0.4.5_x64-setup.exe`, `DT.Office_0.4.5_universal.dmg`, `DT-Office-macos-universal.app.tar.gz`, `SHA256SUMS.txt`.
- Đã xóa release/tag v0.4.1 và 21 workflow run cũ. Remote chỉ còn DTOffice; refs/reflog cũ được gỡ, `git gc --prune=now` hoàn tất.
- Sau GC, kiểm tra toàn bộ object local chỉ thấy commit root mới; GitHub branch/tag cũng chỉ giữ lịch sử mới.

## Kiểm tra

- Lint, typecheck, module-map và production build: đạt.
- Unit sau sửa công cụ LF/CRLF: 189 test; 181 đạt, 8 bỏ qua theo môi trường, 0 lỗi.
- Smoke Windows: trang, hook, thông số hệ thống và installer hook đạt.
- Desktop prepare + bundled Node/server/page: đạt, đúng DT Office 0.4.5; dùng thư mục dữ liệu tạm riêng.
- Edge headless: Anh/Việt đúng title/brand/locale/canvas; panel, manifest đúng; không có pageerror.
- Workflow YAML parse đạt; office-log được so sánh và giữ nguyên.
- Đã push root mới và tag; lượt build đầu phát hiện module-map phụ thuộc CRLF trên Windows. Đã chuẩn hóa khi so sánh và thêm regression test LF/CRLF, vẫn phát hiện mô tả lỗi thời.
- Pages chưa được cấu hình trên repo: workflow demo chuyển sang opt-in bằng `ENABLE_PAGES=true`, không ảnh hưởng phát hành desktop.
- CI: https://github.com/trancaodai1651/DTOffice/actions/runs/41793489115 — success (Node 20/22, smoke ba OS, browser e2e smoke).
- Desktop: https://github.com/trancaodai1651/DTOffice/actions/runs/41793490062 — success (Windows + Mac Universal, lipo app/Node, server trên arm64 và Intel).
- Ba binary/archive đều uploaded; manifest SHA256 khớp từng digest SHA256 do GitHub trả về; latest trỏ v0.4.5.

## Giới hạn / bước tiếp

- Không còn việc build/publish đang chạy hoặc cần sửa cho bản này. Bàn giao được commit riêng sau tag; code ứng dụng không đổi.
- SHA cũ `75a4766` vẫn được endpoint commit GitHub phục vụ dù không có branch/tag trỏ tới. Đây là lưu trữ/cache phía GitHub, không thể tẩy bằng force-push hay quyền API repo; không cam kết đã xóa cache vật lý.
- Tham khảo giới hạn của GitHub: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository
- Chỉ còn tên tác giả nguồn trong LICENSE vì MIT yêu cầu giữ thông báo. Không còn URL upstream hay tên package npm cũ trong file được theo dõi.
- Thư mục con `my-office/` hiện rỗng, không được Git theo dõi; Windows đang giữ handle nên chưa xóa được thư mục rỗng. Không dừng tiến trình/app của người dùng để xóa nó.
- Nếu cần demo Pages: cấu hình Pages từ Actions rồi đặt biến repo `ENABLE_PAGES=true`. Khi clone lại, dùng `main` mới; không đẩy refs cũ trở lại.
