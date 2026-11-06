# Trạng thái bàn giao · 06/11/2026

- Codex · 06/11: [Quản lý phòng phân công + CLI login](state/department-managers-cli-login.md) — đang kiểm tra cuối và build desktop Windows 0.4.14; tích hợp Marketing/Kho đang có, không push/publish.

- Claude Code · 06/11: [Marketing: Kho dữ liệu, tài khoản MXH, Content Creator/Asset Manager/Product Photo, sửa giao việc](state/marketing-assets-social.md) — xong code; lint/typecheck/unit 256 đạt, xem tay cổng 4311; E2E chưa chạy (lỗi môi trường); chưa commit.

- Codex · 06/11: [Tự cập nhật desktop từ GitHub](state/desktop-auto-update.md) — đã phát hành public/latest v0.4.13; CI/Windows/Mac Intel+ARM đạt, checksum và chữ ký/signed-version thật đạt; code đã commit/push, cài lần đầu để nhận cập nhật trong app.

- Codex · 06/11: [Video, FFmpeg kèm app, giao từng vị trí và phát hành](state/video-tools-role-release.md) — đã phát hành public/latest v0.4.12; FFmpeg offline, MP4 thật, giao từng nhân sự; CI/build/Mac Intel+ARM đạt, 3 bộ cài tải lại khớp SHA256, code đã commit/push.

- Codex · 06/11: [Bida, bot Claude/Codex, USD/VND và skill theo vị trí](state/staff-skills-bot-costs.md) — hoàn thành 0.4.10, 232 unit + 12 E2E đạt; bản cài Windows local; đã commit/push main.

- Codex · 06/11: [PC, đường phố và giao đúng nhân sự đọc báo](state/pc-streets-news.md) — hoàn thành 0.4.9 local; 226 unit + 12 E2E đạt, bundled server/native/NSIS đạt; chưa commit/publish.
- Claude Code · 06/11: [Đội AI Agent Marketing 18 vị trí + phòng 3D Marketing ở HQ](state/marketing-team.md) — xong code, unit, xem tay; E2E lỗi môi trường Windows; chưa commit.


- Codex · 05/11: [Claude/Codex, tên nhân sự, bot desktop, đồ họa di động và hết ván](state/personnel-desktop-mobile-games.md) — đã hoàn thành 0.4.8, bản cài Windows cục bộ; 209 unit + 12 E2E và QA bot native đạt; chưa commit/publish.

## Nhiệm vụ phát hành hiện hành

- [DT Office 0.4.5 · làm sạch nguồn và lịch sử](state/dtoffice-clean-release.md) — Codex.
- Đã phát hành [v0.4.5](https://github.com/trancaodai1651/DTOffice/releases/tag/v0.4.5): Windows x64, macOS Universal DMG/app archive và SHA256SUMS.
- Nhánh `main`; commit ứng dụng/root mới `e1f4715`; tag `v0.4.5`. Commit bàn giao nằm sau tag, chỉ sửa tài liệu.
- README/metadata/thương hiệu đã đổi sang DT Office; chỉ giữ remote DTOffice. Đã gỡ release/tag v0.4.1, 21 run cũ, refs/reflog và commit cũ local.
- CI và desktop release đạt; Mac Intel + Apple Silicon chạy server đóng gói thành công; ba checksum khớp digest GitHub.
- Giữ LICENSE MIT, dữ liệu/hook tương thích và log tự sinh. GitHub vẫn phục vụ SHA cũ qua cache riêng; không thể xóa lớp này bằng Git/API repo.
- Chi tiết kiểm tra, giới hạn và bước tiếp ở file nhiệm vụ. Các mục dưới giữ nội dung bàn giao bộ nhớ trước nhiệm vụ phát hành.

## Bàn giao trước · bộ nhớ dự án

- Mục tiêu: hiểu dự án nhanh, hạn chế nạp ngữ cảnh, bàn giao chung Claude/Codex qua các tài khoản.
- Người thực hiện: Codex. Sau đó người dùng đồng ý commit và đẩy toàn bộ lên DTOffice `main` (do Claude Code thực hiện).
- Nhánh: `main`; commit gốc đối chiếu: `0435308` (trạng thái mới nằm trong working tree).

## Đã làm và quyết định

- INDEX.md <100 dòng; bản đồ tra cứu `docs/FEATURE-MAP.md` → `docs/maps/{SERVER,FRONTEND,TOOLING}.md`.
- Dùng lại ARCHITECTURE cho mô tả từng module, không nạp toàn bộ mặc định.
- MEMORY giữ cốt lõi; ghi chú cũ giữ nguyên trong `history/AGENT-NOTES-2026-11-04.md`.
- Giữ nguyên khối office-log cũ; log tự sinh mới ở SESSION-LOG.md, không sao chép prompt/câu trả lời.
- AGENTS.md và CLAUDE.md dùng cùng quy tắc ngắn từ writer và từ điển vi/en.
- Khi đủ INDEX/STATE/MEMORY và bật file memory, context tự chèn chỉ dẫn ngắn + ghi nhớ người dùng;
  không chèn lại lịch sử phiên. Dự án cũ chưa đủ file hoặc tắt file memory giữ cơ chế JSON cũ.
- Writer không sửa INDEX/STATE hay ghi chú cốt lõi; chỉ quản lý block của mình.

## File liên quan

- `.ai-office/INDEX.md`, `MEMORY.md`, `STATE.md`, `history/`, `SESSION-LOG.md`.
- `AGENTS.md`, `CLAUDE.md`, `docs/FEATURE-MAP.md`, `docs/maps/`, `docs/ARCHITECTURE.md`, `HUONG-DAN.md`.
- `server/memory-file.mjs`, `server/memory.mjs`, `src/i18n/locales/{vi,en}/server.js`.
- `tests/unit/memory-file.test.mjs`, `tests/unit/memory.test.mjs`.

## Kiểm tra

- Lint và typecheck: đạt; Next production build: đạt.
- Toàn bộ unit: 185 test, 177 đạt, 8 bỏ qua theo môi trường, 0 lỗi.
- Test tập trung memory/file/i18n: 16 đạt; bao gồm bảo toàn nội dung, đồng bộ lặp lại,
  quy tắc vi/en, context ngắn + ghi nhớ người dùng, fallback dự án cũ và tắt file memory.
- Bản đồ module được làm mới và check đạt; đường dẫn tài liệu/code/test đều hợp lệ.
- INDEX 69 dòng; STATE <100 dòng; sync trên repo thật chạy lặp lại không đổi nội dung.
- Đã đối chiếu nguyên vẹn ghi chú cũ, byte của khối log cũ và hash Cargo.lock trước nhiệm vụ.
- Không chạy GUI/E2E: nhiệm vụ không sửa tương tác giao diện; unit kiểm tra luồng context/writer.

## Còn dở / bước tiếp theo

- Nhiệm vụ đã triển khai xong và đã commit, đẩy lên `main`; chưa phát hành bản release.
- Thay đổi có sẵn trước nhiệm vụ: `src-tauri/Cargo.lock`; phải giữ nguyên.
- Các ghi chú MEMORY chưa commit trước nhiệm vụ đã được bảo toàn đầy đủ trong lịch sử.
- Đã build trang Next, chưa đóng gói/phát hành desktop. File hướng dẫn dùng ngay trong repo;
  runtime mới cần server từ code này; app desktop cũ cần bản build mới để không sinh lại hướng dẫn cũ.
- Bước dùng sau bàn giao: mở cùng repo, nêu nhiệm vụ; phiên mới đọc INDEX → STATE → MEMORY cốt lõi.

## Nhiều nhiệm vụ đồng thời

- Codex: [DEV AI và xin phép ra ngoài](state/dev-team-exit-permission.md) — chờ lượt đội AI `2026-11-04-2a506d` xong theo yêu cầu người dùng, rồi kiểm tra/đóng gói.

- [Nhân sự AI hiện diện mặc định · UIUX, stage 2](state/2026-11-04-2a506d-uiux.md) — lượt `2026-11-04-2a506d`; đã thiết kế màn hình/luồng/trạng thái, vi/en và khả năng truy cập tại [báo cáo UIUX](team/2026-11-04-2a506d/2-design-uiux.md); chưa sửa code sản phẩm.
- [Nhân sự AI hiện diện mặc định · Architect, stage 2](state/2026-11-04-2a506d-architect.md) — đã thiết kế thành phần, dữ liệu/API nội bộ, vòng đời đa phiên và danh sách file tại [báo cáo Architect](team/2026-11-04-2a506d/2-design-architect.md); baseline team 9/9, chưa sửa code sản phẩm; cần tích hợp cùng UIUX và thay đổi đồng thời.
- [Nhân sự AI hiện diện mặc định · PO, stage 1](state/2026-11-04-2a506d-po.md) — lượt `2026-11-04-2a506d`; đã đọc code và lập giá trị, phạm vi P0/P1, tiêu chí nghiệm thu tại [báo cáo PO](team/2026-11-04-2a506d/1-plan-po.md); chưa sửa sản phẩm.
- [Nhân sự AI hiện diện mặc định · PM, stage 1](state/2026-11-04-2a506d-pm.md) — lượt `2026-11-04-2a506d`; đã lập kế hoạch, baseline team 9/9; chờ PO/BA và design, chưa sửa code sản phẩm.
- Nhiệm vụ hiện hành: [Làm sạch nguồn và phát hành DT Office 0.4.5](state/dtoffice-clean-release.md) (Codex).

- Nhiệm vụ song song: [Đội AI làm việc thật theo từng vai trò](state/ai-team-roles.md) (Claude Code, đã commit và đẩy).
- Claude Code: [Đội AI Agent Dev, giao việc qua hướng dẫn viên, dự án người dùng, gói Codex](state/agent-teams-guide.md) — đã xong, kiểm tra, commit `6344f4e` và đẩy lên main. Lượt `2026-11-04-2a506d` đã dừng ở build; code của nó được giữ và tích hợp.
- Claude Code: [Nhân sự đọc báo, edit video, Codex Bot, bản 0.4.6](state/specialists-0.4.6.md) — xong, kiểm tra, commit + tag v0.4.6 (workflow build Windows/macOS Universal).
- Claude Code: [Họp trước khi làm, làm ở bàn, bản 0.4.7](state/meeting-0.4.7.md) — xong, đã phát hành v0.4.7 (Windows + macOS Universal).
- Claude Code: [CPU máy tính, giao việc cho đội từ 📋 Giao việc](state/cpu-team-route.md) — đã commit b0070b0, đẩy main; chưa phát hành.
- Nhiệm vụ trên (bộ nhớ ba lớp) là của Codex. Khi thêm việc song song, tạo `state/<mã-nhiệm-vụ>.md` với mục tiêu,
  tiến độ, file, test, việc dở, bước tiếp và commit; thêm liên kết tại đây, không ghi đè trạng thái phiên khác.

- Nhiệm vụ song song (BA, stage 1): [Nhân sự AI Agent hiện diện mặc định](state/ai-agent-presence-2026-11-04-2a506d-ba.md) — đã có báo cáo phân tích, chưa sửa code sản phẩm.
