# DT Office · làm sạch nguồn và phát hành 0.4.5

## Mục tiêu

- Gỡ liên kết repository nguồn cũ, làm mới README, thay lịch sử Git và phát hành Windows/macOS Universal trên DTOffice.
- Người dùng đã yêu cầu xóa lịch sử liên quan và đẩy code/bản cài; được phép thay lịch sử nhánh và loại release/tag cũ.

## Đang thực hiện

- Đã đọc INDEX/STATE/MEMORY cốt lõi; mã nguồn ban đầu trùng commit `7403222`.
- Metadata Git nằm trong thư mục con trống mã nguồn; đã đưa về root để Git theo dõi đúng workspace.
- Đích đã xác minh: `trancaodai1651/DTOffice`, nhánh `main`; người dùng GitHub có quyền admin/push.
- Bản mới dùng DT Office 0.4.5; giữ định danh lưu dữ liệu và hook cũ để tương thích nâng cấp.
- Giữ thông báo bản quyền trong LICENSE theo điều kiện MIT; không thay đổi office-log/bộ nhớ lịch sử.
- README Anh/Việt, metadata package/extension/plugin, thương hiệu giao diện và cấu hình desktop đã cập nhật.

## Kiểm tra / còn dở

- Lint, typecheck, module-map và production build: đạt.
- Unit sau sửa công cụ LF/CRLF: 189 test; 181 đạt, 8 bỏ qua theo môi trường, 0 lỗi.
- Smoke Windows: trang, hook, thông số hệ thống và installer hook đạt.
- Desktop prepare + bundled Node/server/page: đạt, đúng DT Office 0.4.5; dùng thư mục dữ liệu tạm riêng.
- Edge headless: Anh/Việt đúng title/brand/locale/canvas; panel, manifest và console đạt.
- Workflow YAML parse đạt; office-log được so sánh và giữ nguyên.
- Đã push root mới và tag; lượt build đầu phát hiện module-map phụ thuộc CRLF trên Windows. Đã chuẩn hóa khi so sánh và thêm regression test LF/CRLF, vẫn phát hiện mô tả lỗi thời.
- Pages chưa được cấu hình trên repo: workflow demo chuyển sang opt-in bằng `ENABLE_PAGES=true`, không ảnh hưởng phát hành desktop.
- Đang thay root/tag chưa phát hành bằng bản đã sửa; chờ GitHub Actions và đọc lại release/checksum.
- Sau khi release mới thành công: gỡ tag/release cũ, ref/reflog cũ ở local; cập nhật trạng thái bàn giao.
