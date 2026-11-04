<!-- my-office:memory:start -->
## Bộ nhớ dự án (DT Office)

- Khi bắt đầu phiên hoặc mất ngữ cảnh: đọc .ai-office/INDEX.md, .ai-office/STATE.md và phần cốt lõi của .ai-office/MEMORY.md. Nếu chưa có chỉ mục, dùng quy ước trong bộ nhớ rồi lập chỉ mục theo code thực tế khi cần.
- Trong cùng phiên, không đọc lại tài liệu không thay đổi. Tra bản đồ chức năng từ INDEX.md; chỉ mở code và test liên quan, mở rộng khi có bằng chứng cần thiết.
- Dùng rg tìm đường dẫn, symbol và chỗ gọi; giới hạn kết quả, không in cả file dài. Đối chiếu git status và git diff để thấy thay đổi chưa có trong tài liệu. Code là nguồn xác nhận hành vi.
- Khi xong hoặc trước bàn giao: cập nhật STATE.md ngắn gọn (mục tiêu, đã làm, quyết định, file, kiểm tra/kết quả, còn dở, bước tiếp theo, nhánh/commit). Nếu có nhiều nhiệm vụ, dùng state/<mã-nhiệm-vụ>.md và liên kết từ STATE.md; không ghi đè việc của phiên khác.
- Chỉ ghi quy ước, quyết định và bài học bền vững vào phần cốt lõi của MEMORY.md; lịch sử dài để riêng. Chỉ sửa bản đồ khi cấu trúc hoặc chức năng thay đổi. INDEX.md và STATE.md giữ khoảng 100 dòng mỗi file.
- Không tự nạp lịch sử: SESSION-LOG.md và history/ chỉ tra khi cần. Không sửa các khối office-log do DT Office quản lý, kể cả khối cũ trong MEMORY.md.
- Không lưu token đăng nhập, mật khẩu, API key hay hội thoại nguyên văn vào các file bộ nhớ/bàn giao. Đổi tài khoản vẫn dùng cùng repo; máy hoặc worktree khác cần đồng bộ các file ngữ cảnh, không đồng bộ thông tin đăng nhập.
<!-- my-office:memory:end -->
