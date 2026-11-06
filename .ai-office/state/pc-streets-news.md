# PC, đường phố và giao đúng nhân sự đọc báo · 05–06/11/2026

- Mục tiêu: sửa PC bị xấu/mờ, cột đèn lấn giao lộ, xe xuyên nhau và việc đọc báo giao nhầm người. Giữ các thay đổi 0.4.8 trong working tree (chưa commit), không tắt app ở 4310.
- Root: đặt cột đèn theo giữa đoạn vỉa hè, né đường ngang/vạch qua đường/cửa tiệm; giảm mật độ; bỏ vạch tim đường đè giao lộ; giảm tương phản hạt nhựa đường. Helper `src/shared/street-fixtures.js`; 4 unit đã đạt.
- Graphics: PC Auto tối thiểu Medium/1×, giữ chất lượng thủ công, bóng theo người ra phố và nâng độ nét biển hiệu khi đổi chất lượng. Có `scene/shadow-focus.js`, unit/E2E mới; tích hợp đã đạt.
- Traffic: dùng `traffic-space.js` kiểm tra thân xe xoay + sweep liên tục và spatial hash trên làn/giao lộ, spawn/chuyển làn/xe đỗ/hàng cồng kềnh, cả xe người lái; thêm chẩn đoán. 6 unit (3 phút mô phỏng) đạt. Không dựng lại scene để đổi chất lượng.
- News: phân loại yêu cầu đọc báo trước khi giao phiên thường/DEV; bind nhân sự theo SID kể cả khi task kết thúc nhanh; tên vai trò không bị chat title thay; giữ chủ đề; chặn giao hai việc cùng người. Unit + backend + UI E2E đã đạt. Classifier không nhận câu hỏi/phủ định/chỉ nhắc tới hoặc yêu cầu sửa phần mềm thành việc đọc báo.
- Nhánh `main`, baseline commit `66a8970`; bản 0.4.8 local ở nhiệm vụ trước. Metadata đã lên 0.4.9, chưa commit/publish.
- Kiểm tra cuối: lint/typecheck/Next production đạt; 234 unit, 226 đạt, 8 skip, 0 lỗi. 12 ca E2E đều đạt sau khi sửa 2 ca đèn né cửa tiệm và chạy lại 6 ca liên quan (6/6); gồm PC Auto/High/bóng/atlas, phone/tablet/xoay màn hình, tên nhân sự/bot API, giao đúng chuyên viên, giao thông giờ cao điểm và xe lái thật.
- Lỗi bắt được khi tích hợp: `stores.doors()` chưa có lúc dựng cột; đã dùng mô tả front cửa tiệm từ đầu và đối chiếu cửa thật sau cập nhật trên Pro/HQ.
- QA hình thật trên RTX 2070 SUPER: bản cũ Auto Low, ratio 1×, AA/bóng tắt; bản mới Auto Medium, 1.5×, AA/bóng bật, 211 đèn, không pageerror. Có ảnh trước/sau trong `test-results/pc-{before,after}.png` (ignored).
- Resources 0.4.9 đã chuẩn bị; Node đóng gói + sharp + Next + bundled server/trang đạt (`scripts/verify-desktop.mjs`). Hash 8 file server/shared và production BUILD_ID khớp nguồn. Bản đồ frontend/server và module map đã cập nhật/check đạt.
- Hoàn thành 06/11: native release (2m37s) và NSIS đạt; exe và installer ProductVersion 0.4.9. Installer `src-tauri/target/release/bundle/nsis/DT Office_0.4.9_x64-setup.exe`, 154330395 byte (147.18 MiB).
- SHA256: `6c46684284d48e42ce3ef8aeb457e41e418179417688f377f41178ebc656fb30`; đã cập nhật `SHA256SUMS` cùng thư mục, giữ checksum 0.4.8. Resources bất biến suốt lúc bundle.
- Không còn việc triển khai/kiểm tra trong phạm vi này. Người dùng cài installer mới để dùng; không tự cài hay tắt app đang dùng ở 4310 (PID 31472), đã tắt các server test. Chưa commit/tag/push/publish; macOS chưa build trên Windows. Ghi chú phát hành `docs/RELEASE-0.4.9.md`.
