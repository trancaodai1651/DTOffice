# DEV AI và xin phép ra ngoài · Codex · 04/11/2026

## Mục tiêu / phối hợp

- Người dùng báo bản cài Windows/macOS thiếu 15 nhân sự DEV AI; nhân viên muốn ra ngoài phải gặp giám đốc và được cho phép.
- Đội AI của app đang làm hiện diện theo lượt `2026-11-04-2a506d`. Ngày 04/11 người dùng yêu cầu Codex chờ đội này xong rồi kiểm tra, đóng gói.
- Codex hiện ngừng sửa sản phẩm, theo dõi lượt chạy; giữ mọi thay đổi của các vai trò khác. Phần roster ban đầu đã được Frontend tiếp nối theo thiết kế Architect.
- Nhánh `main`, nền `19cfbfd`; chưa commit/push hoặc nâng version cho nhiệm vụ mới.

## Phần Codex đã viết, cần nghiệm thu sau khi đội xong

- `src/shared/exit-requests.js`: ticket FIFO, phải tới gặp rồi mới quyết định, không tự cho phép, chống quyết định cũ.
- `people/exit-permission.js`, CSS/i18n en/vi và wiring main/loop: tới phòng giám đốc, chờ Cho phép/Ở lại; việc mới hủy yêu cầu.
- `workers.js` gate tại DOOR_IN cho lượt về/ra ngoài; outing/staff/accountant reset phép theo chuyến và tạm hoãn sau từ chối. Không tự biến mất do tab bị ẩn; trim không xóa người chưa được phép.
- Kiểm tra tiếp: đi mua đồ/ra ngoài ngắn, nhân viên ngoài giờ, session/subagent kết thúc, replay cleanup, resident thường trú, bộ nhớ khi nhiều người chờ.
- `tests/unit/exit-requests.test.mjs`: 3 test về bố cục và queue; test bố cục phải đối chiếu lại quyết định mới của đội AI (giữ lựa chọn đã lưu).
- `tests/e2e/team-office.spec.ts`: file Codex tạo, cần cập nhật theo registry resident mới. Lượt thử dùng build trước khi Frontend đổi kiến trúc, chưa nghiệm thu tích hợp.

## Kiểm tra đã chạy / việc tiếp

- Lint/typecheck, 15 unit tập trung và production build ban đầu đạt; kết quả không đại diện toàn bộ thay đổi đang được đội AI bổ sung.
- Edge local 4 test: 2 đạt, 2 vướng overlay thiết lập CLI chặn click. Cần dismiss bằng nút Later trong fixture trước kiểm tra tương tác. Không dùng force click.
- Fixture .sh của Playwright không chạy trực tiếp trên Windows/Node 26; local config ở test-results dùng Edge và Node exe giả cho CLI, port 14599, dữ liệu riêng.
- Đã dừng lượt test cũ. Không động app người dùng ở cổng 4310; chỉ đọc GET /api/team để theo dõi.
- Khi lượt đội AI hoàn tất: đọc state/báo cáo cuối và diff hiện tại, tích hợp/cập nhật test, kiểm tra đủ luồng, build/phát hành Windows + macOS Universal mới, cập nhật bàn giao.
