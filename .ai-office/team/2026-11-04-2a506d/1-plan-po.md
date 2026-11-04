# Báo cáo PO · Nhân sự AI mặc định có mặt trong văn phòng

- Mã nhiệm vụ: `2026-11-04-2a506d`; vai trò: PO Agent; ngày: 04/11/2026.
- Thông tin phiên: stage 1 (plan), running on Codex CLI, model gpt-6.1-sol, effort high.
- Giai đoạn này chỉ đọc code và lập kế hoạch sản phẩm; chưa triển khai tính năng.
- Nhánh/commit đối chiếu: `main` / `19cfbfd`; báo cáo chưa commit.

## 1. Giá trị và định hướng sản phẩm

CEO mở DT Office sẽ thấy ngay đội ngũ AI của mình, hiểu từng vai trò và biết ai đang có việc. Văn phòng không còn tạo cảm giác chưa có nhân sự chỉ vì chưa mở CLI hoặc chưa giao mục tiêu. Đội ngũ có danh tính ổn định qua các lượt làm việc, giúp CEO theo dõi công việc theo con người/vai trò thay vì các phiên tạm thời.

Cách hiểu đề xuất cho mục tiêu: “nhân sự AI Agent” là 15 vai trò đội AI hiện có. “Có mặt mặc định” là hiện diện trong trải nghiệm văn phòng ngay khi mở ứng dụng, kể cả không có phiên CLI, không có mục tiêu, chưa đăng nhập CLI, ngoài giờ làm việc. Đây là đề xuất phạm vi PO để các bước sau dùng làm cơ sở; không phải hành vi đã được triển khai hay xác nhận bổ sung của CEO.

Phân biệt rõ **nhân sự hiện diện**, **CLI đã kết nối/có thể nhận việc**, và **phiên đang xử lý công việc**. Nhân sự hiện diện không tự tạo phiên, không tự gọi model, không bảo đảm CLI đã sẵn sàng.

## 2. Hiện trạng đã đối chiếu code

| Bằng chứng | Hành vi hiện có và ý nghĩa |
| --- | --- |
| `src/shared/team-roles.js:4`; `server/team.mjs:23–40` | Đã có 15 vai trò cùng thứ tự; không cần bổ sung nghề mới để đạt mục tiêu. |
| `src/office/world/layout.js:10–22`; `src/office/world/pro/wing.js:45–54` | HQ có phòng AI với 16 bàn: 15 vai trò và một bàn CEO; biển tên có sẵn nhưng biển tên không đồng nghĩa có nhân vật. |
| `src/office/core/env.js:49–53` | Bố cục mặc định là `pro`; URL và lựa chọn lưu trên thiết bị có thể ghi đè. Chỉ thêm nhân vật trong HQ sẽ chưa giải quyết trải nghiệm mở app mặc định. |
| `src/office/ui/team-sheet.js:88–91`; `src/office/ui/expand.js:22–36` | Khi đội AI đang chạy mới đề nghị mở rộng sang HQ; có đếm ngược, có thể hủy và không thay bố cục đã chỉ định bằng URL. |
| `src/office/net/live.js:43–78,106–137`; `src/office/people/workers.js:70–95` | Nhân vật chính đang gắn với phiên; có `role` thì ưu tiên bàn vai trò. Xóa phiên hiện làm nhân vật rời đi. Chưa thấy luồng tạo đủ đội ngũ thường trực trong các điểm khởi tạo đã đọc. |
| `src/office/net/live.js:48` | Nhiều phiên cùng vai trò có thể dùng bàn vai trò khác còn trống; đây là chỗ cần thay đổi trải nghiệm khi mỗi vai trò đã có người thường trực. |
| `src/office/people/workers.js:499–514` | Phiên nghỉ lâu có thể vắng mặt ban đêm; quy tắc này cần được xét riêng cho đội AI thường trực. |
| `src/office/main.js:250–274`; `src/office/ui/activity.js:231–246` | Có chế độ 2D khởi động trước 3D; bộ đếm phiên và chi phí dựa trên phiên thật. Không thể đưa nhân sự chờ vào phiên giả mà vẫn coi số liệu là đúng. |
| `src/office/demo/demo.js:230–274`; `src/office/replay/replay.js:62–72,136–140` | Snapshot, sự kiện xóa phiên và replay thay đổi tập phiên; cần bảo toàn đội ngũ thường trực và không trộn trạng thái lịch sử với hiện tại. |
| `tests/unit/team.test.mjs:31–47,145–149`; `tests/e2e/office.spec.ts:19–29`; `tests/e2e/view2d.spec.ts:1–34` | Đã có kiểm tra vai trò/thứ tự bàn, smoke các bố cục, luồng 2D. Các đoạn đã đọc chưa chứng minh tiêu chí đủ 15 nhân sự khi không có phiên thật. |

15 vai trò trong phạm vi: CTO, PM, PO, BA, Architect, UI/UX, Frontend, Backend, App, AI, QA, Reviewer, Security, DevOps, Database. Bàn CEO giữ ý nghĩa hiện có; CEO không được tính thành Agent thứ 16.

## 3. Phạm vi và thứ tự ưu tiên

P0 là điều kiện phải đạt để nghiệm thu mục tiêu. P1 là cải thiện sau khi P0 ổn định; không chặn bàn giao P0.

### P0.1 · Thấy đội ngũ ngay khi mở văn phòng

- Giá trị: CEO nhận ra ngay văn phòng có sẵn đội AI, không cần biết thao tác khởi chạy đội.
- Trong phạm vi: lần mở bình thường không có lựa chọn bố cục trước đó mặc định dùng HQ, có đủ 15 nhân sự trong phòng AI và nhận diện được vai trò.
- Tiêu chí nghiệm thu:
  1. Với dữ liệu sạch, không có mục tiêu và không có phiên CLI, mở trang văn phòng 3D bình thường thì sau khi thế giới dựng xong có đúng một đại diện cho mỗi vai trò trong 15 vai trò hiện có.
  2. Không cần mở bảng Đội AI, giao việc, chờ một lần mở rộng hoặc bật tùy chọn mới có nhân sự. Khi vào phòng AI, CEO nhìn thấy nhân vật cùng tên vai trò tại khu vực bàn tương ứng.
  3. Tải lại trang hoặc mở lại ứng dụng vẫn có đủ đội ngũ và không nhân đôi nhân vật.
  4. Không có phiên thật vẫn hiện diện đủ 15 vai trò vào ban đêm; các hoạt động nghỉ/đi lại được phép nhưng không khiến vai trò biến mất khỏi văn phòng do cơ chế về nhà.

### P0.2 · Hiện diện trung thực, không phát sinh công việc tự động

- Giá trị: có cảm giác đội ngũ thường trực mà vẫn hiểu đúng khả năng và chi phí vận hành.
- Trong phạm vi: nhân sự chưa có việc có trạng thái rõ như “Chưa có việc”; khả năng kết nối CLI được phản ánh riêng theo dữ liệu thực tế.
- Tiêu chí nghiệm thu:
  1. Mở ứng dụng chỉ để nhìn đội ngũ không khởi tạo tác vụ/tiến trình CLI hay yêu cầu model mới.
  2. Khi không có phiên thật, bộ đếm phiên vẫn bằng 0; nhân sự thường trực không được cộng vào token, chi phí, thời gian làm việc, lịch sử công việc hoặc yêu cầu duyệt quyền.
  3. Khi chưa đăng nhập/chưa có CLI, vẫn thấy đội ngũ; giao việc tiếp tục đi qua kiểm tra và thông báo cấu hình hiện có, không báo tất cả Agent đã kết nối.
  4. Tên vai trò và trạng thái có bản dịch vi/en; phân biệt trạng thái bằng chữ hoặc dấu hiệu dễ hiểu, không chỉ màu.

### P0.3 · Nhân sự liên tục qua vòng đời công việc

- Giá trị: CEO theo dõi cùng một vai trò từ lúc chờ đến lúc làm và trở lại chờ, không thấy nhân sự xuất hiện rồi biến mất theo từng phiên.
- Trong phạm vi: phiên có vai trò được thể hiện trên nhân sự tương ứng; giữ khả năng xem dữ liệu và thao tác trên phiên thật.
- Tiêu chí nghiệm thu:
  1. Bắt đầu phiên PM/PO/BA làm đại diện đúng vai trò thể hiện công việc thực tế; không sinh thêm một đại diện thường trực thứ hai cho cùng vai trò hoặc chiếm bàn CEO.
  2. Trạng thái làm việc/chờ duyệt được lấy từ dữ liệu thật; khi chọn công việc, CEO mở đúng phiên thay vì một phiên giả của nhân sự.
  3. Khi phiên bị xóa, mục tiêu dừng, thất bại hoặc hoàn tất, vai trò vẫn hiện diện; không còn phiên hoạt động thì về trạng thái chưa có việc. Kết quả/lỗi của công việc vẫn xem được qua luồng hiện có.
  4. Snapshot và kết nối lại không làm mất hoặc nhân đôi đội ngũ. Mất kết nối phải biểu thị dữ liệu chưa được cập nhật, không tự kết luận mọi việc đã xong.
  5. Nếu có nhiều phiên cùng vai trò ở nhiều dự án, chỉ có một đại diện thường trực của vai trò; CEO nhận biết có nhiều công việc và vẫn truy cập từng phiên, không ghi đè/mất việc hoặc mượn danh tính vai trò khác.

### P0.4 · Tôn trọng chế độ xem và dữ liệu hiện có

- Giá trị: người dùng hiện tại vẫn kiểm soát văn phòng và tiếp tục theo dõi công việc như trước.
- Trong phạm vi: mặc định mới cho thiết bị chưa chọn bố cục; giữ lựa chọn `cozy`/`pro`/`hq` đã lưu và URL chỉ định. Với bố cục nhỏ, danh sách đội AI vẫn truy cập được và có đường chuyển sang HQ để xem đủ nhân vật.
- Tiêu chí nghiệm thu:
  1. Thiết bị chưa chọn bố cục mở HQ; thiết bị đã lưu lựa chọn hoặc truy cập URL có `layout` vẫn mở đúng lựa chọn. Không xóa dữ liệu cũ hoặc ép đổi bằng vòng lặp tải lại.
  2. Với bố cục nhỏ, người dùng hiểu cần chuyển sang HQ để thấy đủ đội ngũ 3D và có thao tác chuyển rõ ràng; không cố nhét 15 người vào 9/12 bàn hoặc tự nhận đã hiển thị đủ nhân sự.
  3. Người dùng giữ chế độ 2D vẫn mở ứng dụng ở 2D. Chuyển 2D → 3D HQ dựng đủ đội ngũ một lần; danh sách phiên 2D vẫn chỉ phản ánh các phiên thật.
  4. Phiên không thuộc đội AI và subagent vẫn có vị trí, trạng thái, chi tiết và vòng đời riêng như trước; không bị nhận nhầm thành nhân sự thường trực.
  5. Vào/thoát replay không làm mất/nhân đôi đội ngũ khi trở lại hiện tại; dữ liệu công việc trong replay giữ đúng ý nghĩa lịch sử. Demo không bị biến thành công việc thật.

### P1 · Dễ tìm và tìm hiểu từng người

- Giá trị: CEO nhanh chóng hiểu ai phụ trách việc gì mà không cần đọc sơ đồ tổ chức riêng.
- Trong phạm vi đề xuất: lối đi/xem phòng AI thuận tiện và xem tên, nhiệm vụ của nhân sự chưa có phiên; chưa thêm cách giao việc riêng cho từng người.
- Tiêu chí nghiệm thu: từ văn phòng có thao tác rõ để đến/xem phòng AI; chọn người chưa có việc xem được vai trò và nhiệm vụ, không mở chi tiết phiên rỗng và không tự chạy CLI; toàn bộ nội dung hỗ trợ vi/en.

## 4. Ngoài phạm vi

- Tự khởi chạy 15 CLI/model, tạo phiên giả trên server hoặc tăng mức chạy song song để “có mặt”.
- Thêm vai trò, tuyển/xóa nhân sự, tùy chỉnh ngoại hình hay lịch đi làm riêng; thay sơ đồ tổ chức hoặc tạo thêm nhân vật CEO.
- Đổi quy trình CEO → PM/CTO, phân công của PM, prompt, model, effort, kiểm tra chất lượng hoặc phát hành.
- Xây hệ thống chấm công, trực ca 24/7, kết nối tài khoản mới, chat/giao việc trực tiếp cho từng Agent.
- Thiết kế lại toàn bộ HQ, dựng phòng AI đầy đủ trong các bố cục nhỏ, viết lại 2D/panel hoặc replay.
- Build/phát hành app, commit/push sản phẩm trong giai đoạn lập kế hoạch này.

## 5. Điều cần thống nhất ở bước sau

- Đề xuất mặc định là **đủ 15 vai trò luôn có mặt**, không chỉ các vai trò đang được PM phân công. Phạm vi này dựa trên đội ngũ đã có trong code.
- Đề xuất giữ lựa chọn bố cục cũ; mặc định HQ chỉ áp dụng khi chưa có lựa chọn. Nếu CEO muốn mọi thiết bị cũ tự chuyển HQ, đó là thay đổi phạm vi chuyển đổi dữ liệu cần chốt trước triển khai.
- “Có mặt” là còn hiện diện trong văn phòng; không buộc ngồi bất động ở bàn, nhưng cơ chế nghỉ/ra ngoài không được làm mất vai trò thường trực khỏi trải nghiệm mặc định.
- BA tiếp tục làm rõ quy tắc và dữ liệu chi tiết cho nhiều phiên cùng vai trò, trạng thái khi mất kết nối, cách nhận biết lựa chọn bố cục đã lưu. Báo cáo này đưa kết quả mong đợi, không thay tài liệu phân tích BA.
- PM dùng các phần P0/P1 làm cơ sở phân rã, phân công và theo dõi; báo cáo PO không ấn định mốc giao hàng hoặc phân công kỹ thuật.
- Thiết kế kỹ thuật/UX chọn cách bảo toàn danh tính nhân sự, liên kết phiên, hiển thị nhiều công việc và vị trí thao tác; không bắt buộc một cấu trúc dữ liệu hay API cụ thể từ báo cáo này.

## 6. Đã làm, thay đổi và bàn giao

- Đã đọc INDEX, STATE, MEMORY cốt lõi, AGENTS/CLAUDE, bản đồ frontend/server và code/test liên quan nêu ở trên; đối chiếu git status/diff trước khi ghi tài liệu.
- Chỉ tạo báo cáo này, tạo `.ai-office/state/2026-11-04-2a506d-po.md` và thêm liên kết riêng vào `.ai-office/STATE.md`. Không sửa code/test sản phẩm hoặc bản đồ chức năng; chưa bổ sung quyết định chưa được chốt vào MEMORY cốt lõi.
- Thay đổi có sẵn của phiên khác: `AGENTS.md`, `CLAUDE.md`, `.ai-office/SESSION-LOG.md`; giữ nguyên, không sửa các khối office-log.
- Kiểm tra giai đoạn này: rà soát tĩnh các luồng và kiểm tra tài liệu/diff; không chạy ứng dụng hay test nên không tuyên bố tiêu chí tính năng đã đạt.
- Còn dở: toàn bộ triển khai và nghiệm thu P0/P1 thuộc các giai đoạn sau. Mở báo cáo này trước khi chốt phạm vi; không suy diễn “có mặt” thành yêu cầu tự chạy 15 Agent.

## Tóm tắt

Đã đọc bộ nhớ dự án và đối chiếu code về đội AI, bố cục, nhân vật và phiên làm việc.
Đề xuất đủ 15 vai trò có mặt mặc định, tách hiện diện khỏi CLI và chi phí thực tế.
Đã xác định phạm vi P0/P1, ngoài phạm vi và tiêu chí nghiệm thu cho từng phần.
Đã ghi báo cáo PO và bàn giao bộ nhớ riêng; không sửa code sản phẩm, chưa triển khai tính năng.
