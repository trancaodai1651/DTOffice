# Bộ nhớ bền vững · My Office

## Cốt lõi (đọc khi bắt đầu phiên hoặc mất ngữ cảnh)

- Ngữ cảnh dùng chung trong repo, không gắn tài khoản Claude/Codex. Đọc INDEX.md, STATE.md và phần này trước; lịch sử chỉ tra khi cần.
- Code xác nhận hành vi; tài liệu là bản đồ. Xem git status/diff trước khi sửa, không ghi đè thay đổi của phiên khác.
- Mọi chữ hiển thị qua i18n, đủ vi/en. React chủ yếu dựng markup; engine JS thao tác DOM id và chạy setup theo thứ tự trong src/office/main.js.
- 3D: dispose tài nguyên khi bỏ nhân vật, không merge vật động; xem ARCHITECTURE khi sửa collision/render.
- Windows: hook Claude dùng command + args, tránh chuỗi phụ thuộc Git Bash. Kiểm tra đăng nhập CLI bằng claude auth status; đăng nhập desktop là riêng.
- Đội AI: TEAM_SEATS trong src/shared/team-roles.js phải khớp ROLES ở server/team.mjs. Mỗi vai trò là một phiên riêng chỉ làm việc của mình; PM phân công bằng dòng ROLES:. plan/design song song, build/fix/verify/ship lần lượt (tránh sửa đè). Verify: một FAIL là sửa, tối đa 2 vòng; ship chỉ push/publish khi mục tiêu yêu cầu; lượt dừng giữa chừng thì resume.
- Thử server ở cổng 4311 với OFFICE_DATA_DIR riêng. Không tắt app người dùng ở cổng 4310.
- Kiểm tra theo phạm vi; trước bàn giao thay đổi code chạy lint/typecheck, test liên quan; trước commit cần đủ bộ kiểm tra dự án và build.
- Bộ nhớ có ba lớp: INDEX định vị, STATE bàn giao, MEMORY giữ quyết định lâu dài. Giữ INDEX/STATE khoảng 100 dòng; nhiều việc dùng state/<mã-nhiệm-vụ>.md và liên kết từ STATE.
- Không ghi credential hay hội thoại nguyên văn vào các file ngữ cảnh. Không tự nạp SESSION-LOG.md/history; không sửa các khối office-log.
- Khi hoàn tất, cập nhật STATE; chỉ bổ sung kiến thức bền vững vào phần này. Không nối nhật ký công việc sau mỗi lượt vào MEMORY.
- 04/11/2026 · Codex: nhật ký tự sinh mới chuyển sang SESSION-LOG.md; phần nhật ký cũ dưới đây được giữ nguyên. INDEX/STATE do agent quản lý, writer không ghi đè.

- DT Office phát hành tại `trancaodai1651/DTOffice`; lịch sử nguồn bắt đầu lại từ v0.4.5, không đưa branch/tag cũ trở lại. Giữ LICENSE MIT và định danh dữ liệu/hook cũ khi đổi thương hiệu. Version package/Tauri/Cargo phải khớp tag; release notes theo `docs/RELEASE-<version>.md`.

## Tra cứu theo nhu cầu

- [Chỉ mục](INDEX.md) · [Trạng thái bàn giao](STATE.md) · [Bản đồ chức năng](../docs/FEATURE-MAP.md).
- [Ghi chú cũ, giữ nguyên](history/AGENT-NOTES-2026-11-04.md): các phiên setup, phòng AI, kiểm tra memory và tư vấn.
- [Nhật ký tự động mới](SESSION-LOG.md): metadata phiên/file, không sao chép prompt/câu trả lời.
- Khối nhật ký cũ bên dưới được giữ nguyên để tương thích; không cần đọc mặc định.

<!-- office-log:start -->
## Nhật ký phiên (My Office tự ghi)

_Mới nhất ở trên. Ghi khi mỗi phiên kết thúc: ai làm, dùng CLI và model nào, được giao gì, đã sửa gì, kết quả._

_Chưa có phiên nào kết thúc ở dự án này._
<!-- office-log:end -->
