# Video, FFmpeg kèm app, giao từng nhân sự và release · 06/11/2026

## Kết quả
- Đã phát hành public/latest [v0.4.12](https://github.com/trancaodai1651/DTOffice/releases/tag/v0.4.12): Windows x64 EXE, macOS Universal DMG + app archive, SHA256SUMS.txt.
- Code chính `1c64eac9e9c0b49f0b0bf7678f135affd822ab23`; sửa tương thích Intel/version cuối `f1cfc052c31a9e6d1ce744866145e1f78291180e`, đã đẩy main + tag v0.4.12. Bao gồm mọi cải tiến 0.4.8–0.4.10 từ public cũ 0.4.7.
- CI chính [42173887698](https://github.com/trancaodai1651/DTOffice/actions/runs/42173887698) đạt toàn bộ. Desktop release [42173892174](https://github.com/trancaodai1651/DTOffice/actions/runs/42173892174) đạt build Windows/macOS, verify Mac ARM + Intel, publish.

## Đã làm / quyết định
- `scripts/bundle-ffmpeg.mjs`: pin upstream b6.1.1, kiểm SHA256, bundle FFmpeg + ffprobe, LICENSE/README/SOURCE; không tải thêm khi cài app. Windows x64, macOS có cả x64/arm64. Cache build `.cache/ffmpeg` bị ignore.
- `media-tools.mjs`: ưu tiên bundled/override rồi PATH và Winget; giữ Path/PATH cũ trên Windows, thêm OS CA cho child task.
- `video-tools.mjs`: tải HTTPS bằng chứng chỉ hệ điều hành, xác minh DNS/redirect/type/size; không phụ thuộc Chrome, không giảm TLS. Chỉ file trong thư mục job. Manifest cảnh title/clip/image có nguồn/giấy phép, render H264/AAC 30fps, cover + proof ffprobe; không tự chạy shell do model tạo.
- Caption qua Sharp/Pango PNG + FFmpeg overlay, dùng font hỗ trợ tiếng Việt, escape markup, tự xuống dòng/thu nhỏ trong khung. Sharp là dependency trực tiếp. Không cần filter drawtext vốn thiếu ở binary Intel upstream.
- `specialists.mjs`: có VIDEO-TOOLS.md lệnh tuyệt đối; export phải xác minh MP4 thật mới done. Có render status/held guard, retry lỗi, giữ brief và from-news khi refresh. Startup kiểm video cũ đã được khôi phục ngoài app; file thiếu/hỏng không nhận là hoàn tất.
- `tasks.mjs`: prompt nội bộ/skill max64k, >6000 ký tự gửi stdin cho Codex/Claude để tránh argv Windows; văn bản người dùng vẫn max4000.
- `team.begin({role})` và API/UI: giao riêng đúng một nhân sự Dev/Marketing, có skill, không tự gọi cả pipeline. Giữ queue/write lock. Selector đủ 15 Dev + 18 Marketing, click thẻ giữ đúng role và focus goal. Chữ mới đủ vi/en.

## Video người dùng đã khôi phục
- `D:/2026-11-06-tom-tat-gia-vang-hom-nay/video-final.mp4`: 17.491.114 byte, 30 s, 1080×1920, 30fps, H264 + AAC im lặng. SHA256 `e7f1fc592d9c6919d0d26ac7015a5d4f91cb0134b873a0781d0b1008607d6f2c`.
- Tải thành công 2 clip Pexels bằng helper mới, xem nguồn/giấy phép, review rồi chạy script FFmpeg cũ. Sao lưu cover-original.jpg và cập nhật nguồn tư liệu đúng việc tải/dùng thực tế. Đã xem frame tiếng Việt tại giây 7.
- Giữ mốc giá trong script 08:42 06/11/2026, không nhận là giá hiện thời; chưa có nhạc/giọng đọc. Không upload video cá nhân lên GitHub và không sửa DB app cũ.

## Kiểm tra
- Local 0.4.12: 246 unit (238 pass/8 skip), lint/typecheck/production build/smoke/maps/version/diff đạt. 2 E2E video/direct-role chạy lại đạt; 2 E2E news routing trước đó đạt.
- E2E có MP4 render thật, ffprobe codec/fps, script-only fail, legacy export recovery, đúng employee POST. Unit caption có Unicode/ký tự đặc biệt/văn bản dài/khung ảnh/glyph thật.
- Desktop prepare + verifier local dựng clip Việt thật bằng bundled binaries và chạy shipped Node/server đạt. GitHub verifier đạt tương tự trên Mac Intel/ARM; Intel output 320×568, 30fps, H264/AAC, 1.021 s.
- Đã tải lại cả EXE Windows, DMG macOS và app.tar.gz công khai; cả 3 khớp SHA256SUMS và asset digest GitHub. Bản checksum text cũng khớp digest. File đã xác minh ở test-results/releases/v0.4.12/.

## Sự cố build đã xử lý
- Tag v0.4.11 chưa từng public release: Windows lần đầu treo /api/sys (retry đạt), sau đó verify Intel phát hiện thiếu drawtext nên chặn publish đúng quy tắc. Không sửa tag cũ; v0.4.12 chứa sửa caption và đã đạt toàn bộ.

## Bước tiếp
- Nhiệm vụ hoàn tất; bàn giao tài liệu được commit/push sau tag, chỉ sửa bộ nhớ. Ghi chú phát hành `docs/RELEASE-0.4.12.md`.
- Người dùng tải/cài bản mới để app mang FFmpeg và code mới; không tự cài/đóng app thay người dùng.