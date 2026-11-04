# BA · Hiện diện AI Agent mặc định · 04/11/2026

- Mục tiêu: phân tích yêu cầu nhân sự AI có mặt sẵn trong văn phòng; chỉ stage 1 (plan).
- Phiên: stage 1 (plan), running on Codex CLI, model gpt-6.1-sol, effort high.
- Vai trò: BA Agent; không phân công thay PM, không chốt tiêu chí nghiệm thu thay PO.
- Đã làm: đọc bộ nhớ và code/team test; viết 8 user story, 16 business rule, tình huống biên, nhu cầu dữ liệu và 10 câu hỏi kèm lựa chọn mặc định.
- Quyết định đề xuất: roster đủ 15 role, hiện diện độc lập session; Chờ việc không khởi chạy CLI/token. Phiên thật gắn vào vai trò, giữ đa phiên và thao tác đúng ID.
- Các giả định công khai: HQ là fallback bố cục mới, giữ lựa chọn lưu/URL; 2D truy cập được roster; nhân sự thường trú không đi về vì lịch đời sống; demo/replay/panel giữ ý nghĩa riêng.
- Báo cáo: [1-plan-ba.md](../team/2026-11-04-2a506d/1-plan-ba.md).
- File BA thay đổi: báo cáo, file bàn giao này và một liên kết trong STATE.md. Không sửa product code, INDEX, MEMORY cốt lõi hay office-log.
- Kiểm tra: node --test tests/unit/team.test.mjs đạt 9/9; chưa kiểm thử tính năng mới, không chạy build/E2E cho lượt tài liệu.
- Còn dở: mục tiêu sản phẩm chưa triển khai. Các lựa chọn là giả định BA, chưa phải CEO xác nhận.
- Tiếp theo: PM/PO tiếp nhận giả định; Architect/UIUX thiết kế luồng hiện diện/gắn session, snapshot/gone, 2D và đời sống; QA dùng tình huống trong báo cáo khi triển khai xong.
- Nhánh/commit đối chiếu: main / 19cfbfd; chưa tạo commit. Giữ nguyên thay đổi có sẵn ở AGENTS.md, CLAUDE.md, SESSION-LOG.md.
