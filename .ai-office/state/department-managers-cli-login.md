# Quản lý phòng phân công nhân sự và CLI login · 06/11/2026 · Codex

## Mục tiêu và phạm vi
- Giao PM/CTO/Marketing Manager để quản lý phân công; giao qua phiên Claude/Codex có lựa chọn đội hoặc một phiên.
- Sửa môi trường CLI/auth, commit và build desktop Windows cục bộ 0.4.14. Không yêu cầu push/phát hành.
- Nhánh main; baseline ac0d697. Tích hợp và giữ các thay đổi Marketing/Kho chưa commit của Claude Code.

## Đã làm
- Manager role pm/cto/cmo được chuẩn hóa thành quy trình đội, không chạy stage direct. Các nhân sự khác vẫn direct.
- Bảng đội có nút quản lý Dev/Marketing; Giao việc chọn quản lý phù hợp từ route và cho đổi sang chỉ phiên CLI.
- `/api/tasks` giao qua đội giữ CLI của SID thật (không tin agent khác trong body); CLI/model/effort giữ theo lựa chọn.
- Dùng chung giveDepartmentWork với `/api/team`; giữ tài khoản Claude theo hội thoại, Marketing thiếu dự án dùng Kho.
- Lệnh giao quản lý rõ ràng trong chat được dispatch; câu hỏi, phủ định, mô tả tính năng không tự tạo team run.
- Giữ routing đọc báo/video hiện có. Ảnh trực tiếp dùng một phiên; API báo rõ nếu giao đội mà chưa có đường dẫn.
- standaloneEnvironment giữ credential/provider/account, chỉ bỏ nested-session flags. Claude script JS chạy qua Node.
- Setup kiểm tra theo account đang chọn, không bỏ OAuth/provider env; loggedIn phải là boolean thật.
- Probe không hỗ trợ/lỗi trả unknown, bắt cả lỗi spawn đồng bộ (EFTYPE) để không làm chết server.
- Trên máy thật đã kiểm tra chỉ bằng lệnh auth status/login status: Claude và Codex đều đã đăng nhập.

## Kiểm tra
- Unit manager workflow cả pm/cto/cmo × Claude/Codex, roles và model phù hợp; parser, auth/env, setup probes.
- E2E bằng fake CLI, home/data riêng, không gọi AI thật: Claude và Codex đều qua Dev + Marketing;
  nhân sự có role thật qua API/sự kiện, manager CMO không direct, có ảnh chụp giao diện.
- Unit cuối: 262 test, 254 đạt, 8 bỏ qua theo môi trường, không lỗi; lint/typecheck/build `.next-managers` đạt.
- 9 kịch bản E2E đạt (3 department-delegation, UI mở rộng chạy lại đạt, 2 specialists-routing, 4 team-presence).
- Ảnh: `test-results-departments-ui/department-managers.png`, `department-task-routing.png` (dữ liệu thử).
- Bundled verifier đạt: DT Office 0.4.14, Node/native, trang/server và render/probe MP4 thật H264/AAC/30fps.

## Còn dở
- Đang biên dịch Tauri/NSIS; còn lấy checksum, kiểm tra tài nguyên khớp nguồn và commit.
- Không tắt app người dùng tại 4310; các server thử dùng cổng riêng và không đọc credential thật.
- Chưa chạy nhiệm vụ AI nghiệp vụ thật để tránh tiêu token ngoài yêu cầu kiểm thử.
