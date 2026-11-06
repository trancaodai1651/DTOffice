# DT Office 0.4.10

- Bàn bida nhận cả nhân sự AI thường trực Dev/Marketing đang rảnh, kể cả chưa có phiên chat. Chỉ trạng thái đã đồng bộ mới được chơi; chờ duyệt, việc nền hoặc việc mới đều ngắt ván. Nhân sự đi tới bàn và trở về bàn làm việc sau ván.
- Bot desktop theo dõi cả Claude và Codex, ưu tiên yêu cầu duyệt và có thống kê riêng từng CLI ở tooltip. Khi đang làm, bot mở laptop và gõ bàn phím; giữ cửa sổ nổi, kéo/ẩn/mở như trước.
- Chi phí Claude hiện USD và VND. Bảng Codex thêm giá trị API quy đổi theo token input/cache/output, bên cạnh token/hạn mức gói. Tỷ giá mặc định minh họa 25.000 VND/USD, có thể sửa và lưu trên trình duyệt. Giá trị quy đổi không phải hóa đơn thuê bao; model chưa có giá được báo rõ, không tự đoán giá.
- Bảng đội AI có “Skill theo vị trí” cho tất cả vai trò Dev và Marketing: nhập .md/.txt hoặc dán nội dung, lưu trên máy chạy server, áp dụng vào prompt mỗi việc mới của đúng vai trò. Xóa nội dung rồi lưu để gỡ. Không thay việc đang chạy; file phụ của skill cần được cung cấp trong dự án khi skill tham chiếu tới chúng.

Bảng giá API chuẩn/ngữ cảnh ngắn tham chiếu [OpenAI API pricing](https://developers.openai.com/api/docs/pricing), kiểm tra 06/11/2026. Chưa tính phụ phí công cụ, Fast, ngữ cảnh dài hoặc ưu đãi riêng.
