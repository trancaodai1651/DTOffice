# Trạng thái bàn giao · 04/11/2026

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

- Nhiệm vụ hiện hành: [Làm sạch nguồn và phát hành DT Office 0.4.5](state/dtoffice-clean-release.md) (Codex).

- Nhiệm vụ song song: [Đội AI làm việc thật theo từng vai trò](state/ai-team-roles.md) (Claude Code, đã commit và đẩy).
- Nhiệm vụ trên (bộ nhớ ba lớp) là của Codex. Khi thêm việc song song, tạo `state/<mã-nhiệm-vụ>.md` với mục tiêu,
  tiến độ, file, test, việc dở, bước tiếp và commit; thêm liên kết tại đây, không ghi đè trạng thái phiên khác.
