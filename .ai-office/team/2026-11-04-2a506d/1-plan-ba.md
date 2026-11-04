# Phân tích BA · Nhân sự AI Agent hiện diện mặc định

- Ngày: 04/11/2026. Vai trò: BA Agent. Giai đoạn: 1 (plan).
- Môi trường phiên: stage 1 (plan), running on Codex CLI, model gpt-6.1-sol, effort high.
- Mục tiêu diễn giải: nhân sự AI Agent phải có mặt sẵn trong văn phòng khi mở ứng dụng.
- Nhánh/commit đối chiếu: main / 19cfbfd; chưa tạo commit cho báo cáo này.
- Đây là phân tích nghiệp vụ và lựa chọn mặc định của BA, chưa phải quyết định đã được CEO xác nhận. Không sửa code sản phẩm; không phân công công việc hay chốt ưu tiên/tiêu chí nghiệm thu thay PM/PO.

## 1. Đã đọc và xác nhận từ code

Đã đọc INDEX.md, STATE.md, phần cốt lõi MEMORY.md, AGENTS.md/CLAUDE.md; tra FEATURE-MAP và hai bản đồ FRONTEND/SERVER. Đã đối chiếu git status, diff stat và diff quy tắc đầu phiên. Thay đổi có sẵn: AGENTS.md, CLAUDE.md và SESSION-LOG.md; giữ nguyên, không chỉnh khối log tự động.

| Bằng chứng | Hành vi hiện tại và ý nghĩa |
| --- | --- |
| src/shared/team-roles.js:4; server/team.mjs:23–48 | Có 15 vai trò cố định và 5 giai đoạn. Chỉ các vai trò được gọi mới mở phiên, không đồng nghĩa cả 15 cùng chạy. |
| server/index.mjs:338, 1487–1516 | Phiên thật có role, team, trạng thái; team là ID lượt chạy. Nhận diện vai trò qua task/session, có fallback thư mục. GET /api/team đã trả danh mục vai trò và lượt chạy. |
| src/office/net/live.js:44–75, 106–135 | Chọn bàn theo vai trò nếu có phòng AI; nhân vật tạo từ session. Xóa session thì nhân vật rời văn phòng. Không có roster thường trú trong luồng này. |
| src/office/world/layout.js:10–22; world/desks.js:75–84 | Phòng AI thuộc HQ, có 16 bàn: 15 vai trò và bàn CEO. Văn phòng Pro có 12 bàn, Cozy có 9 bàn. |
| src/office/core/env.js:47–53; ui/expand.js:23–34; ui/team-sheet.js:87–90 | Mặc định hiện là Pro; URL ưu tiên hơn localStorage. Khi đội bắt đầu chạy mới đề nghị mở HQ, có thể hủy hoặc bị chặn bởi layout URL. |
| src/office/demo/demo.js:235–258, 313–330 | Snapshot bỏ mọi session không còn trong danh sách; sự kiện gone xóa nhân vật. SSE, demo và replay dùng chung xử lý thông điệp. |
| src/office/main.js:252–273; ui/lite.js:115–141 | 2D chỉ liệt kê sessions và có thể khởi động mà chưa dựng 3D. Chuyển 2D sang 3D mới xếp bàn các phiên. |
| src/office/people/workers.js:70–95, 294–323 | Ngoại hình dựa theo tên/bàn, nhân vật gắn session; rest có thể nghỉ, đi về, vắng mặt theo giờ. Dùng nguyên rest cho nhân sự thường trú sẽ chưa bảo đảm có mặt. |
| server/index.mjs:979–998 | Server có cơ chế xóa phiên và chuyển phiên im lặng sang rest; không được suy ra rằng role không còn tồn tại khi phiên biến mất. |
| tests/unit/team.test.mjs | Có test danh mục, phân vai/giai đoạn, giới hạn phiên, dừng/resume và thứ tự bàn; chưa có kiểm chứng trực tiếp cho roster hiện diện mặc định. |

Danh mục xác nhận: cto, pm, po, ba, architect, uiux, frontend, backend, app, ai, qa, reviewer, security, devops, database. CEO là người dùng, không phải AI Agent thứ 16.

## 2. Thuật ngữ và lựa chọn nghiệp vụ

- **Nhân sự/vai trò AI**: thành viên cố định trong roster của văn phòng, tồn tại độc lập với phiên CLI và dự án đang chạy.
- **Hiện diện**: có đại diện nhận biết được trong văn phòng mặc định và có thông tin truy cập được qua giao diện phù hợp; không yêu cầu tất cả nằm cùng khung camera.
- **Chờ việc**: vai trò chưa có công việc đang chạy. Đây không phải lời khẳng định CLI đã cài, đã đăng nhập hoặc sẵn sàng thực thi.
- **Phiên thật**: phiên Claude/Codex có ID và dữ liệu quan sát thực tế; mới là nguồn cho tác vụ, quyền, token, chi phí và hội thoại.
- **Mất kết nối**: không biết trạng thái thực thi mới nhất; vẫn biết danh mục nhân sự. Không biến tình trạng này thành “đang làm” hay “rảnh” chắc chắn.

Lựa chọn của BA: hiển thị đủ 15 vai trò ngay khi vào văn phòng bình thường, không cần mục tiêu đầu tiên, không cần mở sheet Đội AI, không cần có phiên CLI. Việc hiện diện không khởi chạy model hay task.

## 3. User stories

| ID | User story | Dữ liệu/nghiệp vụ liên quan |
| --- | --- | --- |
| US-01 | Là CEO, tôi muốn thấy đội AI có mặt ngay khi mở văn phòng để biết thành phần đội mà không phải tạo việc trước. | Roster 15 vai trò, vị trí và nhãn Chờ việc. |
| US-02 | Là CEO, tôi muốn nhận ra tên, vai trò và nhiệm vụ của từng nhân sự để hiểu ai phụ trách lĩnh vực nào. | ID vai trò ổn định; tên và mô tả vi/en; thứ tự bàn. |
| US-03 | Là CEO, tôi muốn thấy người được giao việc chuyển sang trạng thái của phiên thật để biết ai đang làm hoặc đang chờ duyệt. | Liên kết role với session/task/lượt chạy; work, wait, rest thực tế. |
| US-04 | Là CEO, tôi muốn nhân sự vẫn ở văn phòng khi hoàn tất, dừng, lỗi hoặc chuyển giai đoạn để đội không biến mất theo phiên. | Roster độc lập vòng đời task/session; kết quả lưu đúng lượt chạy. |
| US-05 | Là CEO, tôi muốn xem đúng các phiên khi một vai trò làm nhiều dự án để không nhầm người, công việc hay quyền cần duyệt. | Nhiều liên kết phiên trên một vai trò; ID dự án/lượt chạy và trạng thái từng phiên. |
| US-06 | Là người dùng 2D hoặc thiết bị nhẹ, tôi muốn nhận biết cùng danh mục nhân sự và trạng thái mà không cần dựng 3D. | Roster truy cập được trong 2D; số phiên thật vẫn đúng. |
| US-07 | Là CEO, tôi muốn biết khi mất kết nối hoặc thiếu CLI để phân biệt có người trong văn phòng với có khả năng chạy việc. | Trạng thái kết nối; setup CLI từ dữ liệu hiện có; không đoán model/tài khoản. |
| US-08 | Là người dùng đã chọn bố cục, tôi muốn ứng dụng giữ lựa chọn của tôi và vẫn tìm được đội AI. | Ưu tiên URL/localStorage; đường truy cập roster và chuyển HQ bằng thao tác sẵn có. |

## 4. Business rules

1. **BR-01 — Roster chuẩn:** dùng đúng 15 ID vai trò hiện có, giữ thứ tự TEAM_SEATS khớp ROLES. Không sinh thêm vai trò từ tên phiên, subagent hay tên model.
2. **BR-02 — Hiện diện mặc định:** roster được dựng khi mở văn phòng, không phụ thuộc việc có lượt chạy /api/team, session hay thông điệp SSE đầu tiên. Có thể hiện dữ liệu danh mục trước khi kết nối xong; trạng thái thực thi phải báo chưa xác định nếu chưa đồng bộ.
3. **BR-03 — Không tự chạy:** tạo/khôi phục hiển thị nhân sự không tạo task, mở CLI, gọi AI, xin quyền, ghi hội thoại giả hay dùng suất chạy đồng thời.
4. **BR-04 — Danh tính ổn định:** mỗi vai trò có một đại diện nhân sự chính. Phiên thật của vai trò dùng đại diện đó thay vì tạo thêm một bản chờ việc trùng người. Không gộp hoặc mất bản ghi phiên thật để đạt điều này.
5. **BR-05 — Ánh xạ rõ nguồn:** nhận diện bằng role ID hợp lệ và quan hệ task/session/team thực có. Tên có chữ “PM” hoặc cùng thư mục không đủ để tầng hiển thị tự đoán một phiên là PM. Nếu thiếu role thì giữ phiên thông thường, chờ cập nhật metadata.
6. **BR-06 — Dữ liệu thực thi:** trạng thái work/wait/rest, công cụ, model, effort, usage, quyền duyệt lấy từ phiên thật. Nhân sự chưa gắn phiên không có các dữ liệu này; hiển thị không áp dụng/chưa có dữ liệu, không điền model mặc định hoặc số đo giả.
7. **BR-07 — Đa phiên:** một role có thể có nhiều session do nhiều dự án hoặc phiên trước chưa biến mất. Giữ mọi ID, trạng thái và thao tác đúng phiên. Đại diện chính tổng hợp theo thứ tự cần duyệt > đang làm > đang nghỉ > chưa có phiên; hiển thị số phiên và cho chọn phiên trước thao tác. Thứ tự liệt kê ổn định theo ID khi thời gian bằng nhau.
8. **BR-08 — Kết thúc:** task xong không có nghĩa session đã biến mất. Nếu phiên còn tồn tại thì phản ánh trạng thái thật; khi không còn phiên nào, đại diện trở lại Chờ việc. Kết quả lỗi/dừng nằm trong lịch sử/lượt chạy, không xóa thành viên khỏi roster.
9. **BR-09 — Đời sống:** nhân sự thường trú có thể hoạt động trong văn phòng nhưng không bị logic đi về/ban đêm/ngày nghỉ làm biến mất. Không áp quy tắc này lên nhân vật phiên thông thường ngoài đội. Thiết kế cách giữ đại diện thuộc giai đoạn sau.
10. **BR-10 — Bố cục:** chọn HQ làm mặc định cho người chưa có lựa chọn hợp lệ, vì đây là bố cục hiện có đủ phòng và bàn cho 15 vai trò. Giữ URL layout hợp lệ và localStorage đã chọn; không ép reload/migrate người đang dùng Pro/Cozy. Với bố cục nhỏ, đội vẫn truy cập được qua roster giao diện, có đường sang HQ; không cố nhét 15 người vào 9/12 bàn hay gây vòng lặp mở rộng.
11. **BR-11 — Chế độ xem:** 2D cho truy cập roster mà không bắt dựng thế giới 3D; chuyển qua lại không nhân đôi nhân sự hay phiên. Roster và số phiên CLI là hai khái niệm khác nhau trong cả bộ đếm và nhãn.
12. **BR-12 — Tương tác:** chọn người chưa có phiên thì xem vai trò/trạng thái và đường giao mục tiêu qua luồng Đội AI hiện có. Không hiển thị nút dừng/chen lời/duyệt/hoàn tác như thể có phiên. Không tự tạo chức năng chat riêng cho từng role trong mục tiêu này.
13. **BR-13 — Đồng bộ:** snapshot/reconnect/gone có thể thay đổi liên kết phiên nhưng không xóa roster. Mất kết nối giữ danh mục và báo dữ liệu thực thi cũ/chưa xác định; không tự mở việc bù.
14. **BR-14 — Thống kê:** thành viên hiện diện không đóng góp giả vào số phiên, mức tiêu thụ, context, timeline công cụ, quota, sự kiện chat vào/rời hoặc log memory của phiên. Nhãn “15 nhân sự” phải phân biệt với “n phiên”.
15. **BR-15 — Danh tính không phụ thuộc ngôn ngữ:** đổi vi/en chỉ đổi nhãn; không sinh lại danh tính hay đổi liên kết phiên/bàn vì tên dịch đổi. Khóa và bản dịch mới phải đủ vi/en.
16. **BR-16 — Demo/replay:** roster thường trú chỉ áp dụng cho văn phòng live trong lựa chọn mặc định này. Giữ demo và replay theo dữ liệu riêng; không thêm 15 người vào bản ghi quá khứ, không trộn phiên live khi phát lại. Trở về live thì dựng lại roster và liên kết theo snapshot live.

## 5. Tình huống biên cần giữ khi triển khai/kiểm chứng

| Tình huống | Kết quả nghiệp vụ mong muốn | Quy tắc |
| --- | --- | --- |
| Máy mới, chưa CLI/tài khoản/dự án, snapshot rỗng | Có roster; sau khi đồng bộ rỗng là Chờ việc; khả năng chạy việc phụ thuộc setup, không mở phiên. | BR-02,03,06 |
| Mở live khi backend đang lỗi/chưa có snapshot | Đội vẫn thấy được; trạng thái phiên chưa xác định, có thông báo kết nối. | BR-02,13 |
| Plan chỉ PM/PO/BA chạy | 3 role phản ánh phiên, 12 role còn lại vẫn có mặt; không chạy đủ 15 cho đẹp. | BR-01,03,06 |
| Phiên có role tới trước/sau roster hoặc role được bổ sung muộn | Cuối cùng chỉ một đại diện chính của role; không mất phiên hoặc gắn nhầm lịch sử. | BR-04,05 |
| Hai dự án cùng frontend, hoặc phiên role cũ còn rest | Giữ hai phiên, biết dự án từng phiên; chọn đúng ID trước khi thao tác; không hai người chồng một ghế chính. | BR-04,07 |
| Tên phiên “PM Agent” nhưng thiếu role, role lạ, subagent | Không nhận thành nhân sự cố định bằng tên; không tăng roster quá 15. | BR-01,05 |
| Done, fail, stop, gone, resume | Nhân sự luôn còn; trạng thái phiên/lượt chạy đúng, phiên mới không nhận quyền/hội thoại của phiên cũ. | BR-06,08,13 |
| SSE gửi snapshot lặp, remove lặp, reconnect nhiều lần | Không nhân bản và không xóa roster; không chat “nhân sự vào/rời” giả. | BR-13,14 |
| 23 giờ, cuối tuần, giả lập thời gian, qua ngày mới | Đội thường trú không bị đưa ra ngoài bởi lịch đời sống; không tăng hoạt động thật. | BR-09 |
| URL hq/pro/cozy, localStorage cũ/không hợp lệ/bị chặn | Ưu tiên URL hợp lệ, rồi lựa chọn lưu hợp lệ, rồi HQ; không redirect liên tục. Bố cục nhỏ vẫn tìm được roster. | BR-10 |
| Mở 2D trước, chuyển 3D, đổi lại nhiều lần | Roster nhất quán; 2D không ép tạo scene, 3D không tạo nhân sự lần nữa. | BR-11 |
| Phiên ngoài đội đông, hết bàn thường | Không chiếm bàn CEO/bàn role; luồng xử lý đầy bàn không được lặp vô hạn vì roster. | BR-01,04,10 |
| Đổi ngôn ngữ, refresh, nhiều tab | Nhãn đúng ngôn ngữ; roster khôi phục theo ID và không khởi chạy việc ở mỗi tab. | BR-03,13,15 |
| Replay tua nhanh/rời replay; bật demo | Không nhiễm roster live vào lịch sử/demo; quay lại live đồng bộ lại đúng người/phiên. | BR-16 |

## 6. Dữ liệu cần có

Đây là nhu cầu dữ liệu nghiệp vụ, không ấn định schema, database hoặc API mới; kiến trúc chọn nguồn và cách dẫn xuất.

| Nhóm | Dữ liệu tối thiểu | Nguồn/lưu ý |
| --- | --- | --- |
| Danh mục nhân sự | roleId duy nhất, group, thứ tự, khóa tên/mô tả, định danh đại diện ổn định | TEAM_SEATS, ROLES và i18n hiện có; không tạo bản sao danh mục lệch nhau. |
| Vị trí | roleId, vị trí/bàn tương ứng khi có HQ; nhận biết bố cục không có phòng AI | DEPTS/UNITS/DESKS; bàn CEO tách khỏi AI. Không cần lưu tọa độ nhân sự vào dữ liệu phiên. |
| Liên kết thực thi | sessionId, role, teamRunId, taskId nếu có, dự án/thư mục | session pub có id/role/team/dir, tasks/team cung cấp thông tin liên quan. Không dùng team như ID nhân sự. |
| Tình trạng công việc | trạng thái từng phiên; tập phiên của role; số phiên; thông tin cần duyệt gắn đúng ID | Dẫn xuất từ phiên/quyền thực; tách với Chờ việc của roster. |
| Độ tin cậy | đang kết nối/đã đồng bộ, dữ liệu mới nhất hay cũ | Luồng SSE/poll và snapshot hiện có; không cần tự đặt timeout nghiệp vụ mới trong plan. |
| Chi tiết thật | agent, model, effort, usage, hội thoại, quyền nếu có | Chỉ lấy từ phiên/task thực; role chưa có phiên thì các trường này không áp dụng. |
| Tùy chọn xem | layout URL, office-layout, chế độ 2D/3D, ngôn ngữ, live/demo/replay | Các cơ chế hiện có; không cần tùy chọn bật/tắt hiện diện mới để đáp ứng “mặc định”. |

Danh mục tĩnh và liên kết đang quan sát có thể khôi phục khi tải lại; chưa có nhu cầu nghiệp vụ lưu bảng chấm công, heartbeat cho người giả, tọa độ lâu dài hay migration dữ liệu server. Không ghi credential hoặc gán tài khoản giả cho nhân sự Chờ việc.

## 7. Các câu hỏi mở đã trả lời bằng lựa chọn hợp lý nhất

1. **“Có mặt” có nghĩa chạy AI liên tục?** Chọn không: là hiện diện của đội; chỉ chạy khi được giao việc qua luồng hiện có. Lý do: mục tiêu nói về văn phòng, còn code đã có điều phối phiên theo giai đoạn/giới hạn tài nguyên.
2. **Những ai phải có mặt?** Chọn đủ 15 role đã định nghĩa, kể cả chưa được PM chọn cho mục tiêu; không thêm CEO hoặc subagent vào danh mục.
3. **Chỉ áp dụng lần mở đầu?** Chọn mọi lần mở live và sau kết thúc phiên; “mặc định” không phụ thuộc có session từ lần trước.
4. **Người chờ việc có “online/sẵn sàng” không?** Chọn nhãn Chờ việc; trạng thái CLI và kết nối thể hiện riêng, tránh hứa khả năng thực thi khi chưa đăng nhập.
5. **Có mặt nhưng code mặc định Pro thiếu phòng?** Chọn HQ làm fallback mới; giữ lựa chọn bố cục hợp lệ đã lưu/URL và có roster truy cập được ở bố cục nhỏ. Đây là đánh đổi tương thích cần PM/PO ghi nhận, không tự migrate người dùng cũ trong yêu cầu ngắn này.
6. **Ban đêm có được về nhà?** Chọn không để cơ chế đời sống xóa sự hiện diện của đội thường trú; nghỉ trong văn phòng được phép. Nếu CEO muốn mô phỏng chấm công thật thì là yêu cầu khác.
7. **Nhiều phiên một role?** Chọn một đại diện chính và đầy đủ danh sách phiên có nhãn dự án, ưu tiên báo nhu cầu duyệt; không đổi mô hình điều phối đa dự án của server.
8. **Có phải làm màn chat riêng/giao việc trực tiếp cho từng người?** Chọn dùng luồng Đội AI hiện có; chọn nhân sự chưa có phiên chỉ cung cấp thông tin và đường giao mục tiêu. Không phát sinh phiên khi bấm xem người.
9. **Có cần đưa vào panel IDE, demo và replay?** Chọn không thêm roster mới vào panel vốn theo dõi phiên; không thay nội dung demo/replay. 2D của trang văn phòng vẫn cần truy cập danh mục nhất quán.
10. **Có cần hỏi CEO trước khi chuyển tiếp?** Không có câu hỏi chặn plan: các lựa chọn trên đủ để thiết kế tiếp. Đây là giả định BA công khai; nếu PM/PO/CEO điều chỉnh thì cập nhật các quy tắc liên quan, không coi là sự chấp thuận ngầm của CEO.

## 8. Kiểm tra, file thay đổi và bàn giao

- Đã chạy node --test tests/unit/team.test.mjs: 9 đạt, 0 lỗi, 0 bỏ qua. Đây là kiểm tra nền điều phối/danh mục hiện tại, không chứng minh tính năng hiện diện mới.
- Không sửa hoặc thêm test/code sản phẩm; không chạy build/E2E vì lượt này chỉ phân tích và viết tài liệu. Những tình huống ở mục 5 là đầu vào cho QA, không phải kết quả đã kiểm thử.
- File do BA tạo: .ai-office/team/2026-11-04-2a506d/1-plan-ba.md và .ai-office/state/ai-agent-presence-2026-11-04-2a506d-ba.md. Bổ sung liên kết riêng vào STATE.md; không sửa INDEX vì cấu trúc sản phẩm chưa đổi, không thêm giả định chưa được chốt vào MEMORY cốt lõi.
- Phiên sau cần phân biệt roster, nhân vật và session thật; chú ý snapshot/gone, lịch đi về, boot 2D, bộ đếm/chi phí và nhiều session một role. Cách tổ chức component/dữ liệu/API để đáp ứng thuộc Architect; màn hình và trạng thái chi tiết thuộc UI/UX.
- PM tiếp nhận các giả định và quan hệ phụ thuộc để lập kế hoạch; PO đối chiếu phạm vi/giá trị và chốt tiêu chí nghiệm thu. BA không phân vai thay PM, không tuyên bố tính năng đã hoàn thành.

## Tóm tắt

Đã đọc bộ nhớ và đối chiếu luồng vai trò, phiên, nhân vật, bố cục và 2D hiện có.
Đã viết 8 user story, 16 quy tắc, tình huống biên và nhu cầu dữ liệu.
Chọn mặc định đủ 15 vai trò Chờ việc, hiện diện độc lập việc khởi chạy CLI; nêu rõ các giả định cần đội kế tiếp tiếp nhận.
Bộ test nền đội AI đạt 9/9; chỉ cập nhật báo cáo và bàn giao bộ nhớ, không sửa code sản phẩm.
