# Kế hoạch PM · Nhân sự AI hiện diện mặc định

- Mã lượt: `2026-11-04-2a506d`; giai đoạn: `1 (plan)`; vai trò: PM Agent.
- Môi trường phiên: Codex CLI, model gpt-6.1-sol, effort high.
- Ngày: 04/11/2026; nhánh đối chiếu: `main`; HEAD: `19cfbfd`.
- Trạng thái: hoàn tất kế hoạch PM; chưa thiết kế chi tiết hoặc triển khai sản phẩm.

## Mục tiêu và phạm vi giao hàng

Diễn giải mục tiêu CEO: khi mở DT Office, người dùng thấy đội nhân sự AI có mặt sẵn trong văn phòng, kể cả khi chưa giao mục tiêu và chưa có phiên CLI nào chạy. Cụm “có mặc” được hiểu là “có mặt”.

Phạm vi đề xuất là đội 15 vai trò đã tồn tại trong `TEAM_SEATS`, gồm cả CTO; bàn thứ 16 vẫn dành cho CEO. Nhân sự chờ việc cần có tên vai trò và trạng thái rõ ràng; khi phiên làm việc thật xuất hiện, giao diện phản ánh đúng người đang làm và trở lại chờ việc sau khi phiên kết thúc. Mở văn phòng không tự khởi chạy CLI, gọi model hoặc phát sinh tác vụ AI.

Đây là phạm vi để phân công và dự trù kiểm chứng. PO sở hữu giá trị, ưu tiên và tiêu chí chấp nhận cuối cùng; BA sở hữu quy tắc nghiệp vụ, ngoại lệ và dữ liệu chi tiết. PM không thay hai báo cáo đó bằng đặc tả riêng.

Trong lượt này chỉ đọc code, lập kế hoạch và ghi bàn giao. Không thêm vai trò mới, đổi quy trình điều phối đội AI, xây API/persistence mới hay làm mới mô hình nhân vật. Phát hành/push/deploy không nằm trong mục tiêu CEO.

## Hiện trạng đã đối chiếu code

| Điểm đã đọc | Hành vi xác nhận và ảnh hưởng tới kế hoạch |
| --- | --- |
| `src/shared/team-roles.js:4`, `server/team.mjs:23` | Đã có 15 vai trò; dùng lại danh sách chuẩn, không tạo danh sách tên riêng trong UI. |
| `src/office/world/layout.js:16`, `src/office/world/desks.js:75` | Phòng đội AI có 16 bàn, chỉ được dựng trong HQ; Pro/Cozy không có phòng này. |
| `src/office/core/env.js:49` | Mặc định hiện tại là Pro; tham số URL ưu tiên hơn lựa chọn localStorage. Chỉ dựng thêm người trong HQ sẽ chưa giải quyết lần mở mặc định. |
| `src/office/net/live.js:44,106,125` | Bàn chọn theo role; nhân vật tạo từ session, bị cho rời văn phòng khi session bị xóa. Chưa có đội thường trực theo vai trò. |
| `src/office/people/workers.js:71,76` | Có `workers`, `sessions` và `npcs`; `addWorker` gắn chặt nhân vật với session, có xử lý nghỉ muộn. Không thể coi một session giả là giải pháp đã được thiết kế xong. |
| `src/office/demo/demo.js:224` | Cùng `applyMsg` xử lý live/replay; snapshot xóa các session không còn trên server; `gone` xóa nhân vật. Luồng đồng bộ phải được kiểm chứng. |
| `src/office/main.js:252` | Khởi động 2D có thể trì hoãn dựng thế giới; chuyển sang 3D mới đặt các session vào bàn. Cần tránh mất hoặc tạo trùng người khi chuyển view. |
| `src/office/ui/team-sheet.js:92`, `src/office/ui/expand.js` | Hiện mở rộng lên HQ khi có run đang chạy hoặc hết bàn; có đếm ngược/reload. Đội thường trực không được gây vòng lặp tự mở rộng. |
| `server/index.mjs:1487` | Phiên thật đã có role/team và tên vai trò từ tác vụ đội AI; có thể dùng dữ liệu hiện hữu để hiển thị người đang làm. |
| `tests/unit/team.test.mjs:145` | Có kiểm tra thứ tự `TEAM_SEATS` khớp `ROLES`; chưa có test chuyên biệt cho nhân sự luôn hiện diện. |

Đã đọc bộ nhớ cốt lõi, `AGENTS.md`, `CLAUDE.md`, bản đồ frontend/server và test liên quan. Đã xem git status/diff: trước khi làm có thay đổi ở `AGENTS.md`, `CLAUDE.md`, `.ai-office/SESSION-LOG.md`; giữ nguyên các thay đổi này và các khối office-log.

## Quyết định điều phối

1. Giao Architect chốt cách biểu diễn nhân sự thường trực và liên kết với phiên thật; Frontend triển khai trong engine/giao diện đang có. Ưu tiên giữ server và phiên CLI là nguồn dữ liệu thực tế, không đưa nhân sự chờ việc vào thống kê phiên, token, chi phí hoặc danh sách thao tác tiến trình.
2. Hướng đề xuất cho lần mở chưa lưu tùy chọn là HQ để có đủ phòng và bàn đội AI. UI/UX và Architect phải đối chiếu báo cáo PO/BA trước khi chốt. Với lựa chọn Pro/Cozy hoặc URL đã chỉ định, cần định nghĩa rõ cách thấy đội hoặc chuyển tới HQ; không âm thầm ghi đè lựa chọn bằng vòng đếm ngược do đội chờ việc.
3. Phiên thật và nhân sự thường trực phải hòa vào một biểu diễn vai trò rõ ràng. Architect quyết định liên kết ID/role, phiên trùng vai trò ở nhiều dự án và cách bảo toàn quyền truy cập drawer thật; PM không ấn định cấu trúc dữ liệu thay cho thiết kế.
4. Chưa có căn cứ cần Backend, App, AI, Security hay Database chuyên trách: không thêm API, quyền, lưu trữ hay logic model. Architect báo lại PM nếu thiết kế chứng minh cần mở rộng vai trò; không tự mở rộng phạm vi trong build.
5. QA, Code Reviewer và DevOps tham gia theo quy trình mặc định. Chỉ ghi các vai trò cần chọn vào dòng ROLES cuối báo cáo để bộ điều phối đọc đúng.

## Mốc và công việc giao cho từng vai trò

| Mốc / mã | Chủ trì | Việc giao và đầu ra | Phụ thuộc / điều kiện chuyển mốc |
| --- | --- | --- | --- |
| M0 / P1 | PM | Ghi hiện trạng, phạm vi đề xuất, vai trò, kế hoạch và rủi ro trong báo cáo này. | Hoàn tất ở stage 1. |
| M0 / P2 | PO, BA | Hoàn tất báo cáo riêng; làm rõ ý nghĩa “mặc định có mặt”, layout cũ và phạm vi 2D/demo/replay. | Đầu vào bắt buộc cho design; PM tổng hợp điểm xung đột, không làm thay. |
| M1 / D1 | Architect | Thiết kế roster/nhân vật, nguồn vai trò, chỗ khởi tạo, liên kết phiên, thu hồi tài nguyên; nêu ranh giới thống kê, replay và nhiều phiên cùng role; xác nhận chỉ cần frontend. | Đọc đủ ba báo cáo plan; để lại sơ đồ luồng và danh sách file dự kiến, chưa sửa code sản phẩm. |
| M1 / D2 | UI/UX | Thiết kế trải nghiệm lần đầu, người chờ/đang làm/mất kết nối, nhãn vai trò, thao tác vào đội; quyết định layout và phương án với Pro/Cozy, 2D/mobile theo PO/BA. | Chạy song song D1; hai báo cáo phải thống nhất cách hiển thị và tương tác trước build. |
| M2 / B1 | Frontend | Triển khai hiện diện mặc định, khởi động/layout, nhân vật/bàn/tên vai trò, nội dung vi/en theo thiết kế; giữ người chờ việc tách khỏi dữ liệu phiên thật. | D1, D2 hoàn tất; cập nhật báo cáo file thay đổi và kiểm tra. |
| M2 / B2 | Frontend | Nối trạng thái phiên thật với đội thường trực; xử lý upsert/gone/snapshot/reconnect, chuyển 2D→3D, replay/demo và trùng role theo thiết kế. Thêm test hành vi cần thiết. | Tiếp sau B1, cùng một chủ sở hữu để tránh sửa đè engine. |
| M3 / V1 | QA | Kiểm chứng ma trận bên dưới, đối chiếu tiêu chí PO, ghi bằng chứng và VERDICT. | Build và kiểm tra của Frontend đạt. |
| M3 / V2 | Code Reviewer | Rà diff, quy tắc i18n, boot order, đồng bộ ID, tài nguyên 3D, phạm vi và test; ghi VERDICT. | Chạy sau QA, đọc cả báo cáo QA. |
| M4 / S1 | DevOps | Xác nhận build/đóng gói dùng mặc định mới, rà ảnh hưởng cấu hình layout và smoke desktop khi khả dụng; ghi cách kiểm tra lại và giới hạn môi trường. | QA và Reviewer cùng PASS; không push/publish/deploy. |
| M5 / R1 | PM | Đọc toàn bộ báo cáo, tổng hợp đã giao, bằng chứng, hạn chế và phần cần CEO quyết định. | Sau verify/ship; không tuyên bố hoàn tất sản phẩm dựa trên kế hoạch. |

Không ước lượng ngày hoàn thành khi thiết kế chưa chốt; PM theo dõi bằng mốc và đầu ra. Build/fix/verify/ship chạy lần lượt theo điều phối hiện tại; design có thể song song. Một FAIL đưa vấn đề về người sở hữu sửa, tối đa hai vòng fix/verify; còn FAIL thì báo CEO, chưa chuyển ship.

## Kế hoạch kiểm chứng giao cho giai đoạn sau

- Mở mới không có phiên, chưa cấu hình CLI/chưa giao mục tiêu: thấy đội đúng theo PO, tên vai trò đủ; không tạo tiến trình/tác vụ AI và không tăng số liệu phiên/chi phí.
- Lần đầu không có layout đã lưu; lần mở sau; Pro/Cozy/HQ và `?layout=`; localStorage bị chặn: không hết bàn, không tự reload lặp, giữ chính sách lựa chọn đã được chốt.
- Nhận phiên thật, cập nhật, nhận role muộn, kết thúc/dừng/lỗi, reconnect với snapshot rỗng hoặc lặp lại: nhân sự và trạng thái đúng, không mất người/trùng người/trùng bàn.
- Hai phiên cùng role ở các dự án khác nhau: không gắn nhầm phiên hoặc lộ thao tác điều khiển sai phiên; phiên thông thường và subagent vẫn hoạt động như trước.
- Mở đầu ở 2D rồi chuyển sang 3D, đổi view nhiều lần; chuyển live↔replay và demo; tải lại trang: không nhân đôi nhân vật hoặc làm sai lịch sử phiên.
- Nhân sự chờ việc khi ban đêm/nghỉ, ngắt SSE và nối lại: không bị logic nghỉ/đi về của session làm mất sự hiện diện mặc định ngoài quy tắc PO/BA đã thống nhất.
- vi/en, mobile, reduced motion và chất lượng thấp; kiểm tra lỗi console, tương tác nhân vật, disposal khi đổi trạng thái/dựng lại và ảnh hưởng thêm 15 nhân vật so với baseline.

Frontend chạy lint/typecheck, unit liên quan và production build. QA chạy unit roster/lifecycle bổ sung cùng regression `team`, `chibi-dispose`, `i18n`; E2E chuyên biệt cho hiện diện thật không dựa vào demo, cộng `office`, `view2d`, `look-dispose` theo vùng ảnh hưởng. Dùng fake CLI/event/debug hook phù hợp, không gọi model trả phí để kiểm tra hiện diện. Test server dùng cổng 4311 với `OFFICE_DATA_DIR` riêng, giữ app người dùng cổng 4310.

## Tiến độ và rủi ro PM theo dõi

| Việc | Trạng thái | Hành động / chủ sở hữu tiếp theo |
| --- | --- | --- |
| Khảo sát, lập kế hoạch PM | Hoàn tất | Bàn giao design sau khi đủ báo cáo PO/BA. |
| Layout mặc định và tùy chọn cũ | Chờ design | PO/BA xác định kỳ vọng, UI/UX đề xuất luồng, Architect xác nhận tính khả thi. |
| Nhân vật bị snapshot xóa / trùng với phiên thật | Rủi ro đã nhận diện | Architect chốt mô hình và invariant; Frontend triển khai; QA kiểm chứng chuỗi sự kiện. |
| Đếm sai phiên hoặc gọi CLI khi chỉ mở văn phòng | Rủi ro đã nhận diện | Frontend giữ ranh giới dữ liệu; QA/Reviewer xác nhận không có tác dụng phụ. |
| Phòng AI chỉ có ở HQ / chi phí render 15 người | Rủi ro đã nhận diện | UI/UX + Architect chọn cách phù hợp; QA đo so với baseline trên cấu hình thấp. |
| Triển khai, verify, chuẩn bị giao | Chưa bắt đầu | Chưa có bằng chứng tính năng mới hoạt động. |

## Kiểm tra đã thực hiện trong phiên PM

- `node --test tests/unit/team.test.mjs`: PASS, 9/9, không skip; chỉ xác nhận baseline bộ điều phối và danh sách bàn/vai trò hiện tại.
- Đã truy vết code từ layout/boot tới workers/live và handler snapshot/replay, đối chiếu nguồn vai trò server.
- Không chạy build/E2E vì lượt này không thay code sản phẩm; chưa kiểm chứng trực quan hiện diện mặc định.

## File thay đổi và bàn giao

- Tạo `.ai-office/team/2026-11-04-2a506d/1-plan-pm.md`: báo cáo PM này.
- Tạo `.ai-office/state/2026-11-04-2a506d-pm.md`: trạng thái riêng để không ghi đè việc của PO/BA hoặc phiên khác.
- Thêm liên kết PM vào `.ai-office/STATE.md`; không đổi INDEX vì chưa đổi cấu trúc/chức năng sản phẩm. MEMORY cốt lõi không thêm nhật ký kế hoạch.
- Không sửa code sản phẩm, không commit/push. Giữ nguyên thay đổi có sẵn và office-log tự sinh.

Các vai trò tiếp theo đọc báo cáo PO/BA cùng báo cáo này trước khi chốt thiết kế. Điểm cần giải quyết đầu tiên là trải nghiệm mặc định ngoài HQ và ranh giới nhân sự thường trực với session thật; không bắt đầu bằng cách tự tạo 15 phiên CLI.

## Tóm tắt

Đã đọc bộ nhớ, code và test liên quan đến đội AI hiện hữu.
Đã lập các mốc plan → design → build → verify → ship → report và giao người sở hữu.
Đã ghi rủi ro layout, vòng đời phiên, thống kê và tài nguyên 3D để theo dõi.
Baseline đội AI đạt 9/9; giai đoạn này chỉ thay tài liệu và cập nhật bàn giao.

ROLES: architect, uiux, frontend
