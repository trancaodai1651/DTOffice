# Skill đăng bài/content/phân loại + Phòng in 3D + Phòng camera · 07/11/2026 · Claude Code

## Mục tiêu
1. Skill chi tiết cho 3 nhân sự Marketing: đăng bài (chỉ đăng + đề xuất giờ để sếp duyệt), viết content (trend/viral), phân loại dữ liệu (ảnh + video cùng sản phẩm vào cùng thư mục).
2. Phòng in 3D: kho nhựa (loại, hãng, màu, số lượng) + máy in Bambu Lab A1 / Flashforge qua IP LAN (rảnh/đang in, %, gửi G-code).
3. Phòng camera: xem camera Dahua trong LAN.

## Đã làm
- Skill: viết lại `server/skills/marketing/{social,creator,librarian}.md` (vai trò có sẵn: social = nhân sự đăng bài, creator = viết content, librarian = phân loại kho).
  - Social: chỉ kiểm bài, chọn tài khoản, đề xuất 2–3 giờ kèm lý do (`proposals`, `when`), đặt `status: "proposed"`; không viết content, không trả lời bình luận; lịch `marketing/<run>/lich-dang-bai.md`.
  - Creator: `trend-radar.md` từ web search (≤7 ngày, có nguồn/ngày/giai đoạn/rủi ro), chấm điểm ý tưởng, mẫu viral, script video, trường `trend` trong post.json.
  - Librarian: kiểm kê bằng script + SHA-1, tín hiệu nhóm theo thứ tự (link CEO → thư mục → tên file/SKU → cùng buổi chụp → contact sheet/frame ffmpeg), kế hoạch `phan-loai/<date>.csv` trước khi copy, nhóm chưa chắc ở `chua-phan-loai/`.
- Luồng duyệt giờ: `asset-library.mjs` thêm trạng thái `proposed`, `proposals`, `approved`, hàm `approve(id, when)`; POST `/api/library/approve`; `/api/social/publish` từ chối bài chưa duyệt (`notApproved`). `library-panel.js`: chọn giờ đề xuất hoặc giờ khác → Duyệt; nút Đăng chỉ hiện khi đã duyệt. `team.mjs`: duty/FOCUS/mpublish của social theo luồng mới; creator quét trend; librarian phân loại.
- Web search: `server/index.mjs` `TEAM_WEB_ROLES` (research, creator, social, seo) → Claude `--allowedTools WebSearch WebFetch`, Codex `web_search="live"`.
- Phòng in 3D: `server/print-farm.mjs` (kho nhựa: cộng dồn cùng loại; máy in; bambuLink MQTT TLS 8883 + FTPS 990 + lệnh `gcode_file`; flashforgeLink API 8898 hoặc TCP 8899), `server/lan-proto.mjs` (MQTT, FTPS ngầm định, Digest, CRC-32, `isLanHost`). Chỉ IP LAN; mã truy cập không trả về trang.
- Phòng camera: `server/cameras.mjs` (snapshot.cgi + MJPEG luồng phụ qua Digest). API ở `server/index.mjs`, chỉ loopback.
- UI: `src/office/ui/rooms-panel.js` + `src/styles/rooms.css`; nút "Phòng in 3D", "Phòng camera" trên thanh camera (mọi bố cục mở hộp thoại; HQ bay tới phòng). i18n `locales/{vi,en}/rooms.js`, `library.js`.
- 3D HQ: Phòng Kho (DEPTS[1]) thu về nửa trái (`solo`, 1 pod, x 4.3–9.15); `WORKROOMS` trong `layout.js`: Phòng in 3D (sau, cửa hành lang A) và Phòng camera (trước, cửa vào Kho). `world/pro/workrooms.js`: kệ cuộn nhựa theo màu trong kho, bàn với A1 + AD5M (đèn trạng thái, đầu in chạy khi in), tường 6 màn hình ảnh camera (15 s/lần). Điều hướng phòng 1 pod (`navigation.js`).

## Kiểm tra
- Commit `2ad0af2` ở GitHub CI `42328245112` đạt Node 20/22, Windows/macOS/Linux, browser smoke; Node 22 có 272 unit, 271 đạt, 1 bỏ qua, 0 lỗi.
- Sau nâng version: lint, typecheck, module-map `--check`, build production `.next-release-0416`, smoke Windows và unit `print-camera-rooms` 8/8 đạt (MQTT, Digest RFC 2617, CRC, TCP Flashforge giả, kho nhựa, máy in giả, camera Digest giả, duyệt giờ).
- Xem tay cổng 4311 (HQ): hộp thoại in 3D/camera, máy và camera IP giả báo "không kết nối được"/"hết thời gian"; phòng 3D hiển thị đúng; console chỉ 502 từ camera giả.
- Chưa thử với máy in/camera thật. Chưa chạy E2E. Chưa commit.

## Còn dở / rủi ro
- Bambu A1: đường dẫn lệnh `gcode_file` mặc định `/sdcard/<file>`; cần xác nhận trên máy thật (trường `storage` của máy in cho phép đổi). In .3mf qua `project_file` chưa làm.
- Flashforge API 8898 (`/detail`, `/uploadGcode`) theo firmware AD5M; máy cũ dùng TCP 8899.
- Camera: MJPEG cần luồng phụ đặt mã hóa MJPEG; RTSP/H.264 chưa hỗ trợ.
- HQ giờ không còn phòng ban trống cho dự án thường (chỉ khu tầng chính).

## Bước tiếp
- Commit `2ad0af2` đã push lên `origin/main`; workflow CI cho commit này đạt: Node 20/22, Windows/macOS/Linux, browser smoke.
- Codex đang đóng gói và phát hành app 0.4.16 Windows/macOS Universal; ghi commit/release/checksum sau khi workflow hoàn tất.
- Thử với A1/Flashforge/camera thật trong LAN; chỉnh `storage` nếu lệnh in không chạy. CI không thay phép thử phần cứng thật.
