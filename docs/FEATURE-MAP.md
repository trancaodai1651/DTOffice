# Bản đồ chức năng · chọn một nhóm để đọc

Đường dẫn code/test trong các bảng tính từ root repo. Chỉ mở nhóm liên quan yêu cầu hiện tại.
Đã đối chiếu code tại `0435308`; thay đổi chưa commit xem `git status`/`git diff`.

| Cần làm gì | Tra cứu |
| --- | --- |
| CLI, hook, tài khoản, phiên, memory, giao việc, API và hệ thống máy | [SERVER.md](maps/SERVER.md) |
| Giao diện, engine 3D/2D, nhân sự, phòng AI, hóa thân và panel | [FRONTEND.md](maps/FRONTEND.md) |
| Desktop, extension, menu bar, asset, plugin, test và CI/release | [TOOLING.md](maps/TOOLING.md) |

[ARCHITECTURE.md](ARCHITECTURE.md) là nguồn chi tiết kiến trúc và bảng từng module đã có; các bản đồ này
chỉ bổ sung đường đi từ chức năng đến điểm vào và test, không sao chép nội dung module.

Khi sửa chức năng: tìm symbol/route bằng `rg -n`, mở đoạn code quanh kết quả, tìm chỗ gọi và test tương ứng.
Chỉ cập nhật bảng khi đường đi hoặc trách nhiệm thay đổi. Test được ghi **chưa có chuyên biệt** là khoảng trống,
không phải khẳng định tính năng đã được kiểm chứng.
