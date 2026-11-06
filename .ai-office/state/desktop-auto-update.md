# Tự cập nhật desktop từ GitHub · 06/11/2026

## Kết quả
- Đã phát hành public/latest [v0.4.13](https://github.com/trancaodai1651/DTOffice/releases/tag/v0.4.13): EXE Windows, DMG/app archive macOS Universal, hai chữ ký, latest.json và SHA256SUMS.txt.
- Code `ab29f5b5613d5bce310684331019c592432d6f88`, đã đẩy main + tag v0.4.13. Baseline `9c74359`/public v0.4.12.
- [CI 42193105989](https://github.com/trancaodai1651/DTOffice/actions/runs/42193105989) đạt Node20/22, Windows/Mac/Linux smoke, browser smoke. [Desktop release 42193110281](https://github.com/trancaodai1651/DTOffice/actions/runs/42193110281) đạt build/ký Windows/Mac, verifier ARM + Intel, publish.

## Đã làm / quyết định
- `src-tauri/src/updates.rs`: Tauri updater2.14.1, kiểm chữ ký và signed version, chỉ bản mới hơn. IPC chỉ main/local đúng port; không cho web/phone/bot cài. Chỉ URL GitHub release trong repo DTOffice, không nhận URL/tệp từ JS. Trạng thái check/download/verify/ready/wait/install, giữ bytes đã xác minh khi chờ.
- Trước cài, route loopback `/api/desktop-update-status` + `shared/update-readiness.js` xét owned tasks/team run/specialist render/print. Chờ hoàn thành, có thể để sau. Before-exit dừng Node do app sở hữu rồi chạy updater Windows; Mac cài rồi restart. Không kill external CLI/server.
- `ui/updates.js` chạy cả2D/3D: kiểm sau mở10s, mỗi6h, online/focus theo lịch; checkbox tự kiểm và nút kiểm thủ công ở Cài đặt → Khác. Dialog notes plaintext, đồng ý/để sau/tiến độ/lỗi/thử lại. Chỉ đồng ý mới tải/cài. Để sau nhắc lại sau24h; manual luôn mở. Có thể hủy chờ, giữ gói đã tải; không tự tiếp tục cài sau khi hủy.
- Workflow upload EXE +sig và Universal tar +sig; Mac dùng nguyên archive do Tauri ký, không tar lại. `scripts/create-updater-manifest.mjs` tạo latest.json đủ Windows x64, Mac x64/ARM cùng archive; SHA256SUMS bao gồm manifest/signatures. `requireSignedVersion` ngăn ghép phiên bản mới với gói cũ.
- Khóa riêng `~/.dtoffice-release/updater.key`, public `.pub` ghim trong config; CI `TAURI_SIGNING_PRIVATE_KEY` đã cấu hình qua GitHub Secrets API vì connector không hỗ trợ secrets. Giữ khóa này cho các bản sau. Không đưa nội dung key riêng/credential vào repo/log.

## Kiểm tra
- 248 unit:240 pass/8skip; lint/typecheck/production build/smoke/maps/version/diff đạt. Desktop prepare/verifier0.4.13 dựng clip Việt thật bằng bundled FFmpeg và chạy bundled Node/server đạt.
- 3 E2E distinct đạt: tự nhắc, consent, pause/resume chờ việc; offline/rejected download/retry không cài; web không có quyền cài. Fixture cô lập onboarding SSE và chờ boot trước click; đã xem dialog screenshot.
- Cargo check +3 Rust tests origin/URL/signature-tamper đạt. Fixture công khai có chữ ký thật, không chứa secret. Một bài kiểm tra release thật được để ignored mặc định và chạy riêng sau publish.
- Đã tải cả3 bộ cài +latest.json +2sig; tất cả khớp SHA256SUMS và digest GitHub. File checksum text cũng khớp digest. Ở `test-results/releases/v0.4.13/`.
- Probe native dùng chính Tauri updater: HTTPS lấy manifest từ endpoint latest thật, xác minh installer Windows và signed version0.4.13, từ chối bản bị sửa: đạt. Probe chỉ verify, không install.
- Bài Rust kiểm chữ ký/signed-version của bộ cài Windows và archive cho cả hai Mac target từ asset công khai: đạt (20.58s); không thực thi installer.

## Bàn giao
- Người dùng cài0.4.13 thủ công lần đầu. Từ bản sau app tự nhắc và cập nhật khi đồng ý. Hướng dẫn/notes ở `docs/RELEASE-0.4.13.md`.
- Không chạy installer lên app thật của người dùng. Test dùng port/data riêng.
- Sau khi tag đã phát hành xuất hiện thay đổi của phiên khác: `server/team.mjs`, `server/asset-library.mjs`, `server/social-accounts.mjs`; giữ nguyên, không đưa vào commit bàn giao nhiệm vụ này.
- Nhiệm vụ hoàn tất. Bàn giao tài liệu được commit/push sau tag, chỉ sửa bộ nhớ; không đổi tag.
