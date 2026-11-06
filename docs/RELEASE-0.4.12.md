# DT Office 0.4.12

- Bộ cài Windows và macOS Universal mang theo FFmpeg + ffprobe, codec H.264/AAC và hỗ trợ chữ tiếng Việt; không phải tải FFmpeg sau khi cài app. macOS mang cả Intel và Apple Silicon. Binary được khóa release, đối chiếu SHA256 và đi kèm LICENSE/README/nguồn upstream.
- Luồng video có công cụ tải HTTPS dùng chứng chỉ hệ điều hành, xác minh redirect và file tải xuống. Không phụ thuộc điều khiển Chrome; không tắt kiểm tra TLS. Khi nguồn từ chối truy cập, nhân sự chọn nguồn được phép khác hoặc dựng đồ họa gốc có ghi rõ.
- Thêm `video-plan.json` và renderer cục bộ: dựng cảnh, caption tiếng Việt, MP4 H.264/AAC 30 fps, cover và bằng chứng ffprobe. Chỉ có script hoặc file MP4 hỏng không còn được báo “Xong”; giao diện hiện lỗi và nút dựng lại. Tác vụ cũ bị báo xong dù thiếu video được chuyển về lỗi.
- Có thể giao riêng cho từng vị trí Dev/Marketing ngay từ thẻ nhân sự hoặc bộ chọn “Nhân sự thực hiện”. Đúng người nhận việc, giữ skill đã gắn, xong việc thì kết thúc; không tự mở cả quy trình của đội. Người đang bận vẫn xếp hàng theo quy tắc hiện hành.
- Hướng dẫn nội bộ và skill dài không bị cắt ở 4.000 ký tự; nội dung dài được gửi qua stdin để không vượt giới hạn dòng lệnh Windows. Giữ nội dung đang nhập và liên kết bản tin khi bảng video cập nhật.
- Bao gồm các cải tiến 0.4.8–0.4.10 chưa có trong bản phát hành công khai 0.4.7: bot nổi Claude/Codex, tên nhân sự ổn định, Marketing, skill từng vị trí, USD/VND, đồ họa PC/di động, giao thông và chơi hết ván trước khi đổi trò.

Âm thanh của renderer mẫu là AAC im lặng khi không có tư liệu âm thanh được cấp quyền; nhân sự phải ghi rõ, không nhận là đã có voiceover/nhạc. Việc đăng video lên mạng vẫn cần yêu cầu của người dùng.

Nguồn công cụ: [FFmpeg static](https://github.com/eugeneware/ffmpeg-static/releases/tag/b6.1.1), [FFmpeg](https://ffmpeg.org/). Binary là chương trình riêng, giấy phép kèm trong `office/vendor/ffmpeg/<platform-arch>/`.

- Caption dựng qua ảnh chữ bằng Sharp/Pango rồi ghép FFmpeg, hoạt động cả trên macOS Intel có FFmpeg không chứa drawtext. Bản 0.4.11 đã bị kiểm tra trước phát hành chặn vì lỗi này và không được xuất bản.
