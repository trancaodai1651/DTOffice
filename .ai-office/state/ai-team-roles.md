# Nhiệm vụ: Đội AI làm việc thật theo từng vai trò · 04/11/2026

- Người thực hiện: Claude Code (claude-opus-5-5), phiên "My Office setup và Codex CLI integration".
- Nhánh `main`, gốc `0435308`; đã commit cùng phần bộ nhớ ba lớp của Codex và đẩy lên DTOffice `main` (người dùng đồng ý "commit và đẩy hết").

## Mục tiêu

Mỗi nhân sự của Đội AI làm việc thật, đúng vị trí của mình. Không để một phiên đóng vai nhiều người.

## Đã làm và quyết định

- `server/team.mjs` viết lại:
  - Mỗi thành viên là một phiên CLI riêng (`rolePrompt`): chỉ nhận nhiệm vụ của vai trò mình, biết đồng nghiệp làm gì và không làm thay. Mỗi người viết báo cáo riêng `.ai-office/team/<run>/<n>-<stage>-<role>.md`.
  - PM ghi dòng `ROLES: …` để phân công (`rolesOf`, `membersOf`). Luôn có mặt: PM, PO, BA, Architect, QA, Reviewer, DevOps. Còn lại chỉ tham gia khi PM nêu tên; nếu không có kỹ sư nào được nêu thì dùng Frontend và Backend. Nếu PM không ghi dòng `ROLES:` thì tất cả cùng tham gia.
  - plan và design chạy song song. build, fix, verify, ship chạy lần lượt, người sau đọc báo cáo của người trước.
  - Verify: mỗi người kết luận riêng; chỉ cần một FAIL là phải fix, tối đa 2 vòng.
  - Khi văn phòng hết chỗ chạy (`tasks` trả `busy`), thành viên chờ lượt. `index.mjs` gọi `team.taskDone` cho mọi task kết thúc để thành viên đang chờ được vào.
  - `resume(id)`: lượt chạy bị dừng hoặc lỗi thì làm tiếp từ chỗ dở, ai đã xong giữ nguyên. API `POST /api/team/resume`, nút "Tiếp tục".
- `server/index.mjs` thêm thông báo chat cho phân công của PM và kết luận của từng người kiểm thử.
- `src/office/ui/team-sheet.js` + CSS: hiện từng thành viên trong mỗi bước (chờ lượt / đang làm / xong / lỗi, kết luận), rê chuột xem câu trả lời; có nút Tiếp tục.
- i18n vi/en (`team.job.*`, `team.resume`, `team.cantResume`, `team.chat.{assigned,assignedAll,verdictOf,resumed}`, `team.note`).
- Tài liệu: HUONG-DAN (Đội AI), `docs/maps/SERVER.md`, `docs/ARCHITECTURE.md` (có chạy lại module map). Phiên bản 0.4.4.

## Kiểm tra

- `tests/unit/team.test.mjs`: 9 đạt (phiên riêng từng vai trò, phân công, chạy lần lượt, FAIL rồi fix, chờ lượt, CTO, dừng, tiếp tục).
- Toàn bộ: lint và typecheck đạt; unit 188 test (181 đạt, 7 bỏ qua theo môi trường, 0 lỗi); `next build` đạt; module map đạt; i18n vi/en đủ khóa.
- Chạy thật với Codex gpt-5.6-luna (effort low) trên dự án thử `demo-notes` ở scratchpad:
  - 9 phiên riêng: PM, PO, BA song song → Architect → Backend → QA → Reviewer → DevOps → PM báo cáo.
  - PM phân công Backend, QA, Reviewer, DevOps.
  - Bị dừng giữa bước verify, chạy `resume` thì làm nốt. `npm test` 6/6 đạt.

## Còn dở / bước tiếp theo

- Đã commit và đẩy chung với phần bộ nhớ ba lớp của Codex, theo đồng ý của người dùng.
- `src-tauri/Cargo.lock` vốn đã có thay đổi từ trước; lần nâng phiên bản 0.4.4 cũng làm đổi file này.
- Bộ cài `src-tauri/target/release/bundle/nsis/My Office_0.4.4_x64-setup.exe` (88 MB) đã build xong; chưa cài thử.
