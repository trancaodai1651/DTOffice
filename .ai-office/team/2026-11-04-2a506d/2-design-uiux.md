# Thiết kế UI/UX · Nhân sự AI có mặt mặc định

- Mã lượt: `2026-11-04-2a506d`; vai trò: UIUX Agent; ngày: 04/11/2026.
- Thông tin phiên: stage 2 (design), running on Codex CLI, model gpt-6.1-sol, effort high.
- Nhánh/HEAD đối chiếu: `main` / `19cfbfd`; báo cáo chưa commit.
- Trạng thái: hoàn tất đặc tả UX để bàn giao; chưa triển khai hoặc nghiệm thu sản phẩm.

## 1. Đã làm và cơ sở thiết kế

Đã đọc `.ai-office/INDEX.md`, `STATE.md`, phần Cốt lõi của `MEMORY.md`, `AGENTS.md`/`CLAUDE.md`, bản đồ frontend và ba báo cáo `1-plan-pm.md`, `1-plan-po.md`, `1-plan-ba.md`. Đối chiếu git status/diff và các điểm giao diện sau:

| Điểm hiện có | Thiết kế sử dụng |
| --- | --- |
| `src/shared/team-roles.js`, i18n `team.roles` | Đủ 15 vai trò theo thứ tự bàn; đã có tên/nhiệm vụ vi/en. Không đặt tên nhân viên hoặc nghề mới. |
| `src/office/ui/team-sheet.js`, `group-chat-view.js` | Bảng Đội AI nằm trong chat, có cơ cấu 5 nhóm, quy trình, form giao mục tiêu cho PM/CTO và lượt gần đây. Mở rộng bảng này, dùng lại đường mở `openTeam`, không xây màn quản trị nhân sự riêng. |
| `src/components/office/Stage.tsx`, `CameraToolbar.tsx`, `ui/camera-bar.js` | Văn phòng có vùng phủ DOM và nút camera phòng AI trong HQ. Giữ góc tổng quan; dùng nút phòng AI hiện có để xem phòng. |
| `src/office/ui/lite.js`, `SessionRail.tsx`, `SessionDrawer.tsx` | 2D/danh sách/bộ đếm hiện theo phiên thật; drawer có hội thoại, thống kê, thao tác phiên. Không dùng drawer phiên rỗng để đại diện người chưa có phiên. |
| `src/styles/base.css`, `group-chat.css`, `lite.css`, `phone.css` | Vỏ văn phòng tối, chat/sheet nền sáng; mobile có tab Chat và sheet phủ màn hình. Giữ hệ màu, font, bo góc và cấu trúc này. |
| `ui/settings.js`, `SettingsPanel.tsx`, `ui/expand.js` | Đã có chọn bố cục và tải lại trang khi chuyển; roster chờ việc không được kích hoạt đếm ngược mở rộng. |
| `net/live.js`, `ui/event-text.js`, i18n `events`, `activity`, `lite` | Trạng thái phiên là đang làm/chờ duyệt/đang nghỉ; trạng thái kết nối riêng. Dùng đúng nghĩa hiện hữu. |

Đây là thiết kế dựa trên code/markup/CSS và kế hoạch, chưa quan sát ứng dụng chạy hoặc kiểm tra ảnh ở kích thước thật. Không tuyên bố đã kiểm chứng trực quan. Không thiết kế schema/API, liên kết ID hay quản lý tài nguyên thay Architect.

Trước khi kết thúc đã đọc thêm `2-design-architect.md` vừa xuất hiện trong thư mục chung. Hai thiết kế cùng chọn roster độc lập phiên, một đại diện mỗi role, chọn phiên cụ thể, trạng thái loading/fresh/stale, giữ bố cục lưu và tách replay/demo. Tiếp nhận phương án P0 của Architect: người thường trú ở bàn, dùng chuyển động tại chỗ; không cần đi lại để đạt mục tiêu.

## 2. Quyết định UX

1. Văn phòng live có đủ 15 nhân sự: CTO, PM, PO, BA, Architect, UI/UX, Frontend, Backend, App, AI, QA, Reviewer, Security, DevOps, Database. CEO không nằm trong số 15. Mỗi vai trò có một đại diện chính; có mặt không có nghĩa CLI đang chạy.
2. Lần mở chưa có lựa chọn bố cục hợp lệ dùng HQ. Ưu tiên URL hợp lệ → bố cục lưu hợp lệ → HQ; URL sai không loại bỏ lựa chọn lưu hợp lệ. Giữ Pro/Cozy cũ, cả khi giá trị Pro có thể từng do mặc định cũ tạo ra; không đủ căn cứ để tự phân biệt ý định người dùng.
3. 3D HQ dựng người tại khu vực bàn vai trò mà không cần mở bảng hay nhận snapshot đầu tiên. Không tự mở sheet, chuyển camera hoặc giao mục tiêu khi tải trang. Không buộc 15 người phải cùng nằm trong một khung hình.
4. Có một nút chữ dễ thấy **“Đội AI · 15 nhân sự”** trên vùng văn phòng live và ở đầu 2D. Bấm mở bảng Đội AI. Đây là lối truy cập chung cho HQ, Pro/Cozy, 2D, mobile và bàn phím; không phụ thuộc tìm được nhân vật bằng chuột. Chỉ hiện một nút trong view đang dùng.
5. Người không có phiên hiển thị **“Chờ việc”** sau khi đã đồng bộ. Không dùng “Online”, “Sẵn sàng” hoặc chấm xanh để suy ra CLI đã đăng nhập. Trước snapshot/mất kết nối, trạng thái công việc chưa chắc chắn phải được thể hiện riêng.
6. Tên, mô tả và thứ tự vai trò dùng nội dung hiện hữu. Model/effort/usage, cuộc hội thoại và thao tác chỉ xuất hiện khi chọn phiên thật. Không bổ sung cột số 0 giả cho nhân sự chưa có phiên.
7. Tận dụng cơ cấu Đội AI làm danh sách nhân sự có thể mở chi tiết tại chỗ. Không thêm chat/giao việc trực tiếp từng role. Chọn một người rồi bấm giao mục tiêu vẫn dùng form của cả đội và trường người nhận PM/CTO hiện có.

PO xếp tìm hiểu nhiệm vụ từng người ở P1. Phần mô tả mở tại chỗ dưới đây dùng lại nội dung sẵn có và đáp ứng tương tác BR-12 của BA; có thể giản lược trình bày nếu cần ưu tiên P0. Không được cắt lối truy cập roster trong 2D/bố cục nhỏ, cách chọn phiên thật hay phân biệt trạng thái.

## 3. Các màn hình và bố trí

### S1 · Văn phòng live 3D

- Giữ top bar, hai cột phiên/hoạt động, camera toolbar và phong cách nhân vật hiện có. HQ có 15 đại diện ở phòng AI; biển bàn, nhãn vai trò dùng đúng tên hiện có. Không thêm nhân vật CEO hoặc sao chép người chờ cạnh người đang làm.
- Nút “Đội AI · 15 nhân sự” là nút phụ dạng chip có biểu tượng nhóm người, nằm ở đầu vùng văn phòng, cùng vùng điều hướng phòng. Bố trí thành hàng có thể xuống dòng với chips; không phủ lên nội dung chips, yêu cầu duyệt hoặc bảng lỗi. Nhãn có chữ, không chỉ icon/hover.
- Góc tổng quan giữ nguyên. Nút camera phòng AI hiện có đưa đến phòng; trong bảng Đội AI có nút phụ “Xem phòng AI” ở HQ 3D, đóng sheet rồi dùng góc camera này. Tính năng đưa camera tới từng người không cần cho mục tiêu.
- Chọn nhân vật thường trú mở bảng Đội AI và mở chi tiết đúng vai trò. Trạng thái vai trò có mặt ở danh sách; khi chọn người thì thấy đầy đủ bằng chữ. Giữ biển tên hiện có, không bắt dựng 15 bảng thông tin lớn chồng lên scene.
- Bộ đếm phiên và các bộ lọc ở cột trái vẫn chỉ theo phiên thật. Có 15 người nhưng 0 phiên là trạng thái bình thường.
- Ban đêm/nghỉ: người vẫn ở bàn, dùng chuyển động rig tại chỗ theo phương án P0 của Architect. Không làm người có phiên đang làm trông như đang gõ máy khi dữ liệu đã mất kết nối; dấu hiệu công việc khi đó phải mang nghĩa dữ liệu cũ.

### S2 · Bảng Đội AI, dùng chung 3D/2D

Giữ sheet trong chat, nút đóng, form và các lượt gần đây. Thứ tự nội dung:

1. Tiêu đề “Đội AI”; dòng “15 nhân sự · {n} phiên của đội” khi đã đồng bộ; thông báo kết nối khi cần.
2. Danh sách nhân sự theo 5 nhóm hiện có, luôn mở; tách phần Quy trình thành vùng thu gọn như hiện tại. Không giấu toàn bộ nhân sự trong “Cơ cấu đội · Quy trình” khi đã có lượt chạy.
3. Ghi chú bố cục và đường xem phòng/chuyển HQ khi phù hợp.
4. Form giao mục tiêu hiện có và các lượt gần đây, giữ trường dự án, người nhận, CLI, model, effort và hành vi gửi.

Mỗi vai trò là một nút mở chi tiết tại chỗ: tên → nhãn trạng thái → số phiên nếu lớn hơn 0 → dấu mở/đóng. Giữ thứ tự ổn định, không đẩy vai trò chờ duyệt lên đầu rồi làm mất vị trí đang đọc. Khi nhiều phiên, nhãn ví dụ “Chờ duyệt · 2 phiên”. Tổng phiên trong header chỉ là phiên có liên kết hợp lệ với 15 vai trò; không lấy số nhân sự làm số phiên.

Chi tiết một vai trò mở ngay dưới nút của vai trò đó; chỉ mở một vai trò tại một thời điểm:

- Không có phiên: tên, mô tả nhiệm vụ sẵn có, “Chờ việc”, câu “Chưa có phiên làm việc. Giao mục tiêu cho đội để bắt đầu.”, nút “Giao mục tiêu cho đội”. Không hiện tab hội thoại, bộ đo hoặc nút điều khiển phiên.
- Có phiên: mô tả nhiệm vụ và danh sách phiên thật, mỗi dòng có dự án, trạng thái, CLI/model nếu dữ liệu có, định danh ngắn của phiên để phân biệt. Đường dẫn đầy đủ được xem bằng phần mở chi tiết dòng khi tên dự án trùng, không chỉ qua tooltip. Nút “Mở phiên” dẫn tới drawer hiện có.
- Có một phiên cũng dùng đúng dòng “Mở phiên”, giữ trải nghiệm nhất quán. Có nhiều phiên phải chọn một dòng cụ thể; không mở ngầm phiên mới nhất hoặc thao tác lên trạng thái tổng hợp.
- Mở drawer phiên đóng lớp sheet Đội AI để không chồng hai nơi tương tác; không đóng/mất dữ liệu phiên. Mở lại roster vẫn chọn vai trò trước đó trong cùng lần mở trang; không cần lưu lựa chọn này lâu dài.
- Nút “Giao mục tiêu cho đội” cuộn/focus tới ô mục tiêu, không gửi form, không đổi “Giao cho” sang role vừa xem, không tự chọn CLI/model mới.

Wireframe nội dung minh họa, không phải ảnh sản phẩm đã triển khai:

```text
Đội AI                                         [Đóng]
15 nhân sự · 2 phiên của đội
Nhóm quản lý
[CTO Agent          Chờ việc                    ▸]
[PM Agent           Chờ duyệt · 2 phiên          ▾]
  Lập kế hoạch, chia việc…
  Dự án A · Chờ duyệt · Codex · #a1   [Mở phiên]
  Dự án B · Đang làm · Claude · #b2   [Mở phiên]
[Product Owner Agent  Chờ việc                  ▸]
… các nhóm/vai trò còn lại, cùng thứ tự hiện có …
[Quy trình ▸]                    [Xem phòng AI]
Mục tiêu…   Dự án…   Giao cho PM/CTO…
[Giao mục tiêu cho đội]
Các lượt gần đây…
```

Danh sách dùng lưới nhóm hiện có khi đủ rộng, thu về một cột khi không đủ chỗ cho tên và nhãn. Không ép 5 nhóm trên một hàng mobile. Tên dài xuống dòng; trạng thái không bị cắt mất. Sheet có một vùng cuộn chính; tiêu đề/đóng dễ truy cập, ô mục tiêu không bị bàn phím ảo che.

### S3 · 2D, mobile và bố cục nhỏ

| Ngữ cảnh | Bố trí và thao tác |
| --- | --- |
| 2D live | Nút “Đội AI · 15 nhân sự” ngay dưới/cạnh tiêu đề danh sách, trước các tab lọc phiên. Bấm mở S2 mà không dựng 3D. Danh sách phiên, tìm kiếm, số đếm và duyệt quyền giữ nghĩa hiện tại. Không chèn 15 người vào kết quả tìm phiên. |
| 2D không có phiên | “Chưa có phiên làm việc. Đội AI vẫn có 15 nhân sự.” cùng nút Đội AI; không ghi chưa có nhân sự hoặc chỉ nhắc Claude khi app còn hỗ trợ Codex. Nút vẫn thấy khi danh sách rỗng hoặc lọc không có kết quả. |
| Pro/Cozy | Roster vẫn đủ 15 trong S2. Dòng giải thích “Bố cục này chưa có phòng AI. Chuyển sang HQ để xem đủ nhân sự trong 3D.”, nút “Chuyển sang HQ”. Không khẳng định đã hiện đủ người trong scene nhỏ; không nhét roster vào bàn phiên thông thường. |
| Chuyển HQ | Nút dẫn vào lựa chọn HQ trong Cài đặt hiện có để người dùng bấm chọn; không tự chọn ngay khi mở cài đặt. Đặt lời nhắc trang sẽ tải lại cạnh lựa chọn. Khi storage không ghi được, thao tác chọn vẫn mở HQ cho lượt hiện tại bằng cơ chế URL; không quay vòng về Pro. Nếu đang 2D thì giữ 2D, người dùng tự bấm 3D để dựng phòng. |
| HQ 2D | Không hiện “Xem phòng AI” như thể camera có tác dụng trong 2D. Dùng nhắc ngắn “Chuyển sang 3D để xem phòng AI”; giữ nút 3D ở top bar. |
| Mobile | Giữ các tab Văn phòng/Phiên/Hoạt động/Duyệt/Chat. Nút Đội AI nằm trong vùng nội dung văn phòng hoặc đầu 2D; Chat → Đội AI vẫn là lối hiện có. S2 dùng sheet chat toàn màn hình, cuộn dọc, nút đóng rõ; không thêm tab thứ sáu. |

Đường chuyển HQ không có đếm ngược hoặc hộp xin xác nhận mới. Việc chọn HQ trong cài đặt là thao tác đổi bố cục chủ động. Các cơ chế mở rộng do phiên thật hết bàn nằm ngoài thay đổi này; roster chờ việc không được tính thành lý do hết bàn hoặc đội đang chạy.

## 4. Trạng thái và phản hồi

Tách trạng thái danh mục, công việc và độ mới dữ liệu. Danh mục 15 người có sẵn ngay cả khi API lượt chạy/form giao việc chưa tải xong. Không hiện “Chờ việc” chắc chắn chỉ vì fetch lỗi hoặc chưa có snapshot.

| Trạng thái / điều kiện | Người dùng thấy | Hành vi |
| --- | --- | --- |
| Khởi động / chưa có snapshot | Nút Đội AI có 15 nhân sự; các vai trò hiện tên, “Đang đồng bộ…”; số phiên header là “—”, không giả 0. | Có thể xem nhiệm vụ. Không chặn roster bởi spinner toàn màn hình. Scene dùng loading hiện có; người được dựng khi scene sẵn sàng. |
| Đã đồng bộ, không có phiên cho role | “Chờ việc”, dấu trung tính; chi tiết chưa có phiên. | Người vẫn có mặt; CTA giao mục tiêu mở form, không tự chạy. |
| Có phiên work | “Đang làm · {n} phiên” nếu cần; biểu tượng/trạng thái làm việc hiện hữu. | Xem đúng các phiên; không cộng {n} thành số người. |
| Có phiên wait | “Chờ duyệt”, dấu cảnh báo và chữ, không chỉ màu. | Ưu tiên tổng hợp hơn work/rest; chọn phiên thật để duyệt theo luồng hiện có, không có nút duyệt cả vai trò. |
| Chỉ còn phiên rest | “Đang nghỉ”; vẫn liệt kê phiên. | Không đổi ngay thành Chờ việc khi task done nhưng session còn tồn tại. |
| Không còn phiên sau gone/snapshot | Vai trò về “Chờ việc” sau đồng bộ; nhân vật còn. | Chi tiết đang mở vẫn ở đúng role, thay danh sách phiên bằng nội dung chưa có phiên. Không tự đóng bảng hay chọn role khác. |
| Mất kết nối sau khi đã đồng bộ | Một thông báo trong bảng: “Mất kết nối. Trạng thái công việc chưa được cập nhật.”; nhãn từng role “Chưa cập nhật”. Khi mở chi tiết: “Trước khi mất kết nối: …” nếu có dữ liệu. | Giữ tên/người/dữ liệu cũ, không kết luận mọi người rảnh. Có thể đọc phiên cũ với thông báo; không tạo hành động điều khiển mới từ roster. Kết nối lại tự cập nhật, không mở task bù. |
| Không thể nối ngay lần đầu | “Chưa xác định trạng thái công việc”; thông báo đang thử kết nối lại. | Vẫn xem đủ 15 vai trò và nhiệm vụ. Không khẳng định CLI thiếu hoặc công việc đã kết thúc. |
| Trạng thái phiên không nhận diện được | “Chưa xác định trạng thái công việc” ở phiên đó. | Vẫn truy cập được phiên; không tự đổi thành Đang làm/Chờ việc. |
| API team/tasks đang tải | Tên người vẫn có; vùng form/lượt gần đây hiện “Đang tải thông tin giao việc…”. | Sheet xuất hiện ngay; không đợi cả hai fetch mới có khung và danh mục như code hiện tại. |
| API team/tasks lỗi | Lỗi trong vùng chưa tải được, nút “Thử lại”; danh mục còn. Không thay bảng bằng một dòng lỗi. | Thử lại phần đọc dữ liệu; không POST mục tiêu lại. Nếu dữ liệu lượt chạy tải lỗi thì không dùng thông báo “Chưa có lượt nào”. |
| Chưa có lượt chạy | Giữ thông báo noRuns hiện có trong vùng Các lượt gần đây. | Không dùng noRuns để ẩn roster hoặc suy ra không có phiên thật. |
| Chưa có dự án / thiếu CLI hoặc đăng nhập | Giữ noProject và kiểm tra/thông báo cấu hình theo luồng hiện có; người vẫn Chờ việc hoặc trạng thái phiên thực. | Không thêm badge “15 Agent đã kết nối”. Không tự mở CLI để tạo dự án. |
| Phiên được chọn biến mất trước khi mở drawer | “Phiên này không còn trong văn phòng. Danh sách đã được cập nhật.” ở chi tiết role. | Giữ role và danh sách còn lại; không mở drawer rỗng, không chuyển sang ID khác. |
| Gửi mục tiêu đang tải/lỗi | Giữ “Đang giao…” và phản hồi lỗi hiện có; lỗi giữ nội dung nhập. | Không khóa việc xem roster. Không biến lỗi giao việc thành lỗi tồn tại của nhân sự. |
| 3D chưa dựng / chuyển 2D → 3D | Thông báo dựng thế giới hiện có; giữ lối quay lại/xem roster 2D. | Khi scene sẵn sàng có đúng một người mỗi role. Nếu dựng 3D lỗi, báo lỗi tại vùng 3D và vẫn cho dùng 2D; không hiện roster thành rỗng. |

Tổng hợp nhiều phiên theo BA: cần duyệt → đang làm → đang nghỉ → không có phiên. Trạng thái chưa đồng bộ/mất kết nối phủ độ tin cậy lên kết quả này. Danh sách phiên trong role ưu tiên cùng thứ tự trạng thái, sau đó hoạt động mới nhất, ID ổn định khi bằng nhau; không đổi ID đang được người dùng xem. Nguồn dữ liệu/thuật toán chi tiết do Architect chốt.

“Lỗi”, “Đã dừng”, “Xong” của lượt chạy vẫn hiển thị ở Các lượt gần đây; không dùng kết quả đó làm nhãn tồn tại lâu dài của nhân sự. Không có phiên không đồng nghĩa đã xử lý thành công mục tiêu trước.

## 5. Các luồng chính

| Luồng | Bước và kết quả |
| --- | --- |
| F1 · Mở lần đầu | Mở live → HQ nếu chưa có lựa chọn → có nút 15 nhân sự; scene dựng đủ người → snapshot rỗng xác nhận Chờ việc, số phiên thật 0. Không cần mở sheet để sinh người. |
| F2 · Xem người và giao việc | Bấm nhân vật/nút Đội AI → S2, mở role → đọc nhiệm vụ → Giao mục tiêu cho đội → nhập form PM/CTO → chỉ chạy sau khi gửi hợp lệ và qua kiểm tra hiện có. |
| F3 · Có việc/kết thúc | PM/PO/BA nhận phiên thật → 3 người hiện trạng thái thật, 12 người còn lại chờ → chọn PM → chọn đúng phiên → drawer. Done/fail/stop giữ người; phiên còn rest thì Đang nghỉ; hết phiên mới Chờ việc. |
| F4 · Nhiều dự án | Frontend có A wait và B work → một đại diện Frontend, nhãn Chờ duyệt · 2 phiên → mở role → chọn A để xem/duyệt A. Không mượn bàn của Backend hoặc chọn B ngầm. |
| F5 · Mất và nối lại | Ngắt kết nối → giữ roster, báo chưa cập nhật → kết nối lại/snapshot → cập nhật từng liên kết và nhãn. Snapshot rỗng/lặp không xóa người, không có chat vào/rời giả. |
| F6 · Giữ lựa chọn cũ | Pro/Cozy/URL được giữ → nút Đội AI mở đủ danh sách → Chuyển sang HQ mở Cài đặt → người dùng chọn HQ → tải lại, giữ chế độ 2D/3D. |
| F7 · 2D/3D | Mở 2D → xem roster không dựng scene → chuyển 3D HQ → người xuất hiện một lần → quay 2D vẫn cùng danh mục/phiên. Không đổi bộ đếm phiên theo view. |
| F8 · Replay/demo | Khi vào replay/demo, giữ badge/chế độ hiện có; ẩn phần hiện diện live mới và nút “15 nhân sự” của live, không áp danh sách chờ việc lên lịch sử. Không thêm người hoặc phiên live vào dữ liệu này. Trở về live hiện roster, trạng thái Đang đồng bộ cho tới snapshot live. Không mở đường giao mục tiêu mới trong replay/demo. |

Các phiên thông thường, subagent hoặc role lạ giữ luồng phiên hiện có; không nhận diện nhân sự bằng tên có chữ PM. Panel IDE theo dõi phiên không thêm roster trong phạm vi này.

## 6. Hình thức và khả năng truy cập

- Giữ font Be Vietnam Pro; số liệu phiên dùng mono theo hệ hiện tại. Văn phòng/2D dùng token nền tối `--side`, `--card`, `--ink`, `--muted`; sheet chat giữ nền sáng và `--zc-*`. Không đổi cả sheet sang tối hoặc tạo bộ avatar mới.
- Chờ việc/Đang nghỉ: trung tính; Đang làm: xanh theo bề mặt hiện có; Chờ duyệt: biểu tượng cảnh báo + chữ, dùng amber trong vỏ tối; mất kết nối: biểu tượng mất liên kết + chữ. Sheet sáng dùng màu mực đủ đậm tương ứng, không dùng trực tiếp màu xanh nhạt trên trắng. Màu nhóm chỉ để phân nhóm, không chỉ trạng thái công việc.
- Dùng lại gap 6–12 px, bo 8–10 px và kích thước chữ khoảng 13–14 px trong sheet. Tên đầy đủ và trạng thái cho xuống dòng; không dựa vào title hover để biết nhiệm vụ hoặc dự án.
- Nút role/nút Đội AI là button thực, mở bằng Enter/Space; `aria-expanded`, vùng chi tiết gắn tên role. Thứ tự đọc: tên → trạng thái → số phiên → mô tả/phiên. Không đặt nút Mở phiên bên trong button role.
- Nút mới có vùng chạm tối thiểu 44×44 px; danh sách 15 người cuộn dọc, không cuộn ngang tại 320 px. QA kiểm tra 320/390/720 px và desktop 1280 px, zoom 200%, tên tiếng Anh dài, bàn phím ảo và vùng an toàn mobile.
- Khi mở sheet, focus vào tiêu đề/role đã chọn, không tự focus textarea khiến mobile bật bàn phím. Tab trong sheet nếu nó là modal; phần phía sau không nhận focus. Escape/đóng trả focus nút gọi; nếu gọi từ canvas trả về nút Đội AI. Mở drawer đưa focus đến tiêu đề phiên; mở lại sheet không mất vị trí đang đọc.
- Cập nhật SSE không cướp focus/cuộn; nếu dòng đang focus mất thì chuyển focus về nút role và báo ngắn. `aria-live="polite"` cho thông báo kết nối tổng, không đọc lại cả 15 người mỗi lần nhận snapshot. Giữ cơ chế thông báo duyệt khẩn hiện hữu.
- Focus rõ trên cả nền sáng/tối; chữ thường đạt tương phản tối thiểu 4.5:1, đường viền focus/dấu trạng thái 3:1. Đây là yêu cầu kiểm tra cho build, chưa phải kết quả đo màu.
- Reduced motion: không thêm nhấp nháy hoặc chào đồng loạt khi mở trang; camera chuyển trực tiếp hoặc giảm chuyển động theo thiết lập. Không dùng hoạt ảnh làm bằng chứng duy nhất của trạng thái.

## 7. Nội dung vi/en cần bổ sung

Toàn bộ chữ qua i18n; tên/nhiệm vụ, work/wait/rest, trạng thái lượt chạy và nội dung form dùng lại khóa hiện có. Bảng là nội dung UX để Frontend đặt khóa phù hợp, không ấn định cấu trúc từ điển thay Architect.

| VI | EN |
| --- | --- |
| Đội AI · {n} nhân sự | AI team · {n} members |
| {n} phiên của đội | {n} team sessions |
| Chờ việc | Awaiting work |
| Đang đồng bộ… | Syncing… |
| Chưa xác định trạng thái công việc | Work status unknown |
| Chưa cập nhật | Not up to date |
| Mất kết nối. Trạng thái công việc chưa được cập nhật. | Disconnected. Work status is not up to date. |
| Trước khi mất kết nối: {status} | Before disconnection: {status} |
| Chưa có phiên làm việc. Giao mục tiêu cho đội để bắt đầu. | No work session yet. Give the team a goal to get started. |
| Mở phiên | Open session |
| Xem phòng AI | View AI team room |
| Bố cục này chưa có phòng AI. Chuyển sang HQ để xem đủ nhân sự trong 3D. | This layout has no AI team room. Switch to HQ to see all members in 3D. |
| Chuyển sang HQ | Switch to HQ |
| Chuyển sang 3D để xem phòng AI | Switch to 3D to view the AI team room |
| Đang tải thông tin giao việc… | Loading task information… |
| Không tải được thông tin giao việc. Thử lại. | Could not load task information. Try again. |
| Chưa có phiên làm việc. Đội AI vẫn có {n} nhân sự. | No work sessions yet. Your AI team still has {n} members. |
| Phiên này không còn trong văn phòng. Danh sách đã được cập nhật. | This session is no longer in the office. The list has been updated. |

Số phiên/team dùng cơ chế số ít/số nhiều hiện có khi đặt khóa tiếng Anh; khi chưa biết số lượng không nội suy thành 0. Không gắn model mặc định hoặc effort high vào UI của người chờ việc; thông tin model/effort đầu báo cáo chỉ là metadata của phiên thiết kế này.

## 8. Bàn giao, rủi ro và kiểm tra

### Điểm cần đối chiếu với Architect/Frontend

- Đã đối chiếu `2-design-architect.md` khi hoàn tất; thống nhất một nhân sự chính/mỗi role, nhiều phiên thật, số liệu phiên thật và P0 nhân vật tại bàn. UIUX chọn mở chi tiết role trước, kể cả chỉ có một phiên, rồi bấm Mở phiên; cách này nằm trong hợp đồng showRole của Architect. Điểm mở roster nằm ở vùng Stage/đầu 2D, không cần thêm nút top bar. Cách gắn dữ liệu và tài nguyên do Architect thiết kế.
- Transport mở chưa đủ để báo Chờ việc: cần nguồn live đã đồng bộ. Với long poll, dùng kết quả batch đã bắt kịp theo hợp đồng Architect, không đòi một snapshot mới ở mọi lần poll. UI chỉ tiêu thụ trạng thái độ mới, không đặt timer kết nối riêng.
- Điểm quan trọng của UX: roster/khung sheet vẫn truy cập được nếu API team/tasks lỗi; chỉ hiện Chờ việc sau đồng bộ; không làm mất người bằng snapshot hoặc cơ chế về nhà; mở phiên phải đúng ID; URL/storage giữ lựa chọn người dùng.
- Working tree thay đổi trong lúc khảo sát: `env.js` đã gọi helper mới `src/shared/office-layout.js`; helper có nhánh chuyển giá trị Pro đã lưu sang HQ nếu thiếu cờ migration. Nhánh này khác P0.4 của PO, BR-10 của BA và quyết định UX số 2. Đề nghị giai đoạn triển khai đối chiếu và bỏ việc tự chuyển Pro cũ, trừ khi PM/CEO thay đổi phạm vi rõ ràng. UIUX không sửa thay đổi của phiên khác.
- Cũng thấy file chưa theo dõi `src/office/people/ai-team.js`, `src/shared/exit-requests.js` xuất hiện song song; chưa rà hoặc nghiệm thu chúng. Không lấy sự xuất hiện của file làm bằng chứng tính năng đã đạt.
- Các vùng sản phẩm dự kiến cần đối chiếu khi build: Stage/2D cho lối mở; team-sheet/group-chat cho danh sách và focus; tương tác nhân vật/camera cho chọn role; settings/layout cho chuyển HQ; i18n vi/en và CSS hiện có. Đây là bản đồ bề mặt UX, không phải phân chia component/API mới.

### Kiểm tra chấp nhận giao cho QA

| Nhóm | Bằng chứng cần lấy sau build |
| --- | --- |
| PO P0.1 / F1 | Live dữ liệu sạch không CLI/mục tiêu/phiên: HQ có 15 role, CEO không tính; 23 giờ vẫn đủ; refresh không trùng. |
| PO P0.2 / tải-rỗng-lỗi | Trước snapshot chưa kết luận rảnh; sau snapshot rỗng là Chờ việc; số phiên thật 0; mở/đọc roster không sinh task/CLI, token hoặc chi phí. API lỗi vẫn thấy danh mục. |
| PO P0.3 / F3–F5 | PM/PO/BA thật, nhiều phiên một role, metadata đến muộn, rest/gone, stop/fail, disconnect/reconnect/snapshot lặp; chọn đúng phiên và người không biến mất. |
| PO P0.4 / F6–F8 | URL/storage hợp lệ cũ giữ nguyên; giá trị sai/storage chặn fallback đúng; chuyển HQ chủ động không lặp; 2D không dựng 3D khi xem roster; demo/replay không bị chèn hiện diện live. |
| PO P1 / xem vai trò | Nhiệm vụ đọc được không cần hover; nhân sự chưa có phiên không mở drawer rỗng; CTA chỉ tới form PM/CTO. |
| Khả năng truy cập/hình thức | Bàn phím, focus, screen reader kết nối, tương phản, reduced motion, mobile/zoom/vi-en; không chồng sheet/nút duyệt và không mất nội dung khi bàn phím mở. |

Trong phiên chỉ rà tĩnh tài liệu, trạng thái git và các đoạn code/CSS liên quan. Đã kiểm tra UTF-8, metadata phiên và liên kết nội bộ của báo cáo/state/STATE, cùng `git diff --check` cho STATE: đạt. Không chạy unit/lint/typecheck/build/E2E vì không sửa sản phẩm hoặc test; chưa có kết quả kiểm thử tính năng hiện diện. Không gọi model để kiểm tra.

### File do UIUX thay đổi và phần còn lại

- Tạo `.ai-office/team/2026-11-04-2a506d/2-design-uiux.md`: báo cáo này.
- Tạo `.ai-office/state/2026-11-04-2a506d-uiux.md`: bàn giao riêng; thêm liên kết vào `STATE.md`, giữ các nhiệm vụ khác.
- Không sửa mã sản phẩm/test, không commit/push. Giữ AGENTS/CLAUDE, SESSION-LOG, office-log và thay đổi sản phẩm của phiên khác.
- Không đổi INDEX vì cấu trúc/chức năng chưa được triển khai; không thêm giả định thiết kế chưa nghiệm thu vào MEMORY cốt lõi. Mục nhập bộ nhớ của phiên này nằm trong state riêng và liên kết STATE theo quy tắc dự án.
- Bước tiếp: Architect đối chiếu các yêu cầu UX; Frontend triển khai sau đủ hai thiết kế; QA lấy bằng chứng theo ma trận trên. Toàn bộ build/verify còn ở giai đoạn sau.

## Tóm tắt

Đã thiết kế văn phòng HQ mặc định và lối truy cập 15 nhân sự trên 3D, 2D, mobile, Pro/Cozy.
Đã đặc tả bảng Đội AI, xem vai trò, chọn đúng phiên và đường giao mục tiêu hiện có.
Đã mô tả trạng thái tải, rỗng, lỗi, mất kết nối, nhiều phiên, replay/demo và yêu cầu truy cập.
Đã ghi điểm lệch migration Pro cần đối chiếu và cập nhật bàn giao; không sửa code sản phẩm.
