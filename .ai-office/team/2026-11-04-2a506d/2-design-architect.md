# Thiết kế Architect · Nhân sự AI hiện diện mặc định

- Mã lượt: `2026-11-04-2a506d`; vai trò: ARCHITECT Agent; ngày: 04/11/2026.
- Thông tin phiên: stage 2 (design), running on Codex CLI, model gpt-6.1-sol, effort high.
- Nhánh/commit đối chiếu: `main` / `19cfbfd`; chưa commit báo cáo.
- Đầu vào: bộ nhớ dự án, AGENTS.md/CLAUDE.md và đủ ba báo cáo `1-plan-pm.md`, `1-plan-po.md`, `1-plan-ba.md` cùng lượt.
- Kết quả là thiết kế để Frontend triển khai; không viết code sản phẩm, không thiết kế màn hình thay UIUX, không điều phối thêm agent.

## 1. Quyết định kiến trúc

Giữ danh mục 15 vai trò độc lập với tập phiên thật. Danh mục được dẫn xuất từ `TEAM_SEATS`; dữ liệu thực thi vẫn lấy từ `sessions` và `perms` đang có. Trong live HQ, mỗi vai trò có một nhân vật thường trú ổn định và một bàn cố định. Các phiên cùng vai trò cùng liên kết vào đại diện ấy, không tạo thêm người hoặc mượn bàn vai trò khác. Ở Pro/Cozy và 2D, người dùng truy cập cùng roster qua UI mà không dựng thêm phòng hoặc ép dựng 3D.

Chỉ cần Frontend theo phân công PM. Không thêm endpoint, database, migration server, heartbeat nhân sự, tác vụ nền hoặc lệnh CLI. Không đưa roster vào panel IDE. Demo/replay giữ mô hình nhân vật theo phiên hiện hữu; roster live bị tắt trong các chế độ đó.

Chọn phương án P0 đơn giản: nhân vật thường trú ngồi tại bàn, có chuyển động rig và biểu hiện chờ/làm/cần duyệt tại chỗ. Không cần mô phỏng đi lại/nghỉ ngoài văn phòng cho nhóm này. Đây là giới hạn hành vi kỹ thuật nhằm bảo đảm BR-09, không phải yêu cầu thiết kế ngoại hình mới. Phiên ngoài đội và subagent tiếp tục vòng đời riêng.

HQ là fallback khi URL và lựa chọn đã lưu đều không hợp lệ/không có. URL hợp lệ > localStorage hợp lệ > HQ. Không migration lựa chọn Pro/Cozy hợp lệ, không tạo cờ bật roster. Người dùng chủ động chuyển HQ qua luồng chọn bố cục; roster không kích hoạt `expandOffice`.

## 2. Hiện trạng và thay đổi đồng thời cần lưu ý

Đã truy vết `env.js` → `main.js`/LIST/buildWorld → `live.js` → `workers.js`, handler `applyMsg`, replay, bộ đếm activity/lite, thao tác chọn người/bàn, quyền duyệt và subagent. Những ràng buộc quan trọng:

- `TEAM_SEATS` có 15 ID; `server/team.mjs` có ROLES cùng thứ tự. HQ có `UNITS.find(u => u.team)` chứa 16 bàn; chỉ dùng 15 bàn đầu, giữ bàn CEO.
- `workers` hiện là map theo session ID; `Worker.homeSpot()`, sự kiện, subagent và thao tác UI còn dùng `w.id` như session ID. Không đổi ID nhân vật qua lại giữa role và session nếu muốn xử lý đa phiên an toàn.
- `applyMsg` xử lý chung live/demo/replay; cả `removeSession` và `dropSessionNow` đều có thể xóa nhân vật. Không chỉ vá nhánh `gone` rồi bỏ qua snapshot/quiet reset.
- `state.world` được đặt true trước khi toàn bộ setup thế giới hoàn tất. Không dùng riêng cờ này như bằng chứng bàn/navigation/Worker đã sẵn sàng.
- `setConn(true)` từ EventSource.onopen chưa bảo đảm snapshot đã áp dụng; `connectedOnce` còn được demo/replay thay đổi. Trạng thái kết nối roster phải tách riêng.

Lúc bắt đầu, thay đổi có sẵn gồm AGENTS.md, CLAUDE.md, SESSION-LOG.md, STATE.md và tài liệu plan. Trong lúc khảo sát, working tree tiếp tục xuất hiện sửa `core/env.js`, `net/live.js`, `people/workers.js` cùng các file chưa theo dõi `people/ai-team.js`, `shared/office-layout.js`, `shared/exit-requests.js`. Architect chỉ đọc, không tạo/sửa các thay đổi sản phẩm này. Đây là code đang làm đồng thời, không phải baseline đã nghiệm thu.

Frontend cần tiếp nối `people/ai-team.js` và `shared/office-layout.js` đang có, tránh thêm module roster/bố cục thứ hai. Bản đọc được đang claim một nhân vật bằng cách đổi `w.id` sang session ID, đưa người chờ vào `npcs`, và có migration Pro sang HQ theo `office-dev-roster`. Các điểm này chưa đáp ứng đầy đủ đa phiên, tách đời sống và BR-10; cần điều chỉnh khi tích hợp thiết kế này. Thay đổi xin phép rời văn phòng qua `exitHooks`/`exit-requests.js` là công việc đồng thời khác, không mở rộng vào phạm vi mục tiêu này và không tự xóa/hoàn tác. Quy tắc thường trú chỉ áp dụng nhóm AI; không bỏ hành vi `lateRest` của mọi phiên thông thường để đạt yêu cầu.

## 3. Thành phần và ranh giới

| Thành phần | Trách nhiệm | Không sở hữu |
| --- | --- | --- |
| `src/shared/team-roles.js` | Danh mục ID và thứ tự bàn chuẩn đang có; tên/nhiệm vụ dùng khóa `team.roles.<role>.name/duty`. | Không phụ thuộc session hoặc ngôn ngữ để xác định ID. |
| `src/shared/team-presence.js` — thêm | Hàm thuần nhận sessions, permissions, độ mới dữ liệu; trả 15 bản chiếu vai trò và thứ tự các phiên. Dùng được trong Node unit test. | Không DOM, Three.js, localStorage, mạng hoặc side effect. |
| `src/office/people/ai-team.js` — tiếp nối file đang làm | Sở hữu nhân vật thường trú, đối soát liên kết và bàn, biểu hiện tại chỗ, tháo tài nguyên khi rời live; cung cấp bản chiếu cho UI. | Không tạo task/phiên, không biến role ID thành session ID, không tự quyết định phiên thao tác. |
| `src/office/people/workers.js` | Giữ primitives Worker/rig, `sessions`, `workers`, `subs`; bổ sung registry nhân vật thường trú và hàm tìm nhân vật theo session. | Không chứa danh sách nhân sự thứ hai hoặc luật API mới. |
| `net/live.js`, `demo/demo.js`, `replay/replay.js` | Cập nhật nguồn phiên thật, quyền, độ mới; gọi đối soát sau mutation/batch; quản lý ranh giới live/demo/replay. | Không xóa roster vì snapshot rỗng hoặc `gone`. |
| `src/office/ui/team-roster.js` — thêm | Hiển thị cùng bản chiếu cho team sheet/2D và lựa chọn phiên theo role; chuyển tiếp session ID thật tới drawer. | Không tính chi phí/model/quyền giả, không tạo schema phiên song song. |
| `shared/office-layout.js`, `core/env.js` | Chọn layout theo thứ tự ưu tiên nêu ở mục 1, chỉ đọc tùy chọn khi khởi động. | Không migration ngầm Pro/Cozy hoặc bật đếm ngược vì roster. |
| Các adapter scene/UI hiện hữu | Render, picking, nhãn, camera, rebuild/dispose; phân biệt mục tiêu role/session/subagent. | Không suy đoán role từ tên phiên hay thư mục. |

Giữ phong cách module JS + setup hiện có, không thêm React store, service hoặc lớp repository. Có thể giữ tên `teamRoster` trong `ai-team.js` để giảm churn, nhưng registry không đồng nghĩa với `sessions`.

## 4. Mô hình dữ liệu

Toàn bộ dữ liệu mới nằm trong bộ nhớ trình duyệt và dựng lại sau refresh; không lưu lịch sử hoặc liên kết phiên vào localStorage.

| Dữ liệu | Trường/kiểu dự kiến | Quy tắc |
| --- | --- | --- |
| Vai trò | `roleId`, `seatIndex`, `nameKey`, `dutyKey` | roleId thuộc TEAM_SEATS, seatIndex là index trong danh mục; group tiếp tục lấy metadata `/api/team` khi cần sơ đồ tổ chức. Roster cơ bản không đợi API này. |
| Bản chiếu vai trò | `roleId`, `sessionIds: string[]`, `primarySessionId: string|null`, `activity: unknown|idle|wait|work|rest`, `freshness: loading|fresh|stale` | Có đúng 15 bản chiếu theo thứ tự TEAM_SEATS. `idle` chỉ là trạng thái nhân sự khi snapshot đã biết và không còn phiên. |
| Độ mới live | `freshness`, `hasLiveSnapshot: boolean` | Khởi đầu loading; fresh sau snapshot; stale khi mất mạng. Việc phiên có tồn tại trong cache không chứng minh kết nối đang tốt. |
| Nhân vật thường trú | Map `roleId → Worker`, với `kind: team-resident`, ID hiển thị ổn định như `team-role:frontend`, `roleId`, `personnelDesk` | ID này chỉ phục vụ scene; không gửi tới API. Ngoại hình lấy seed từ roleId, không phụ thuộc tên dịch, phiên hoặc dự án. |
| Phiên thật | `id`, `role`, `team`, `dir`, `status`, `lastAt`, `agent`, `subs`, `usage`, … | Giữ schema public hiện có ở `server/index.mjs:pub`. `team` là run ID, không phải ID người. Không thêm `taskId` giả; nếu cần thông tin task thì join dữ liệu task/run thực có. |
| Subagent | Giữ `id`, `parent` là nhân vật; thêm `parentSessionId` rõ ràng | Khi nhiều phiên dùng cùng nhân vật, quyền và drawer của subagent vẫn theo phiên cha thật, không dùng `parent.id` để suy ra phiên. |
| Lựa chọn UI | `state.selectedId` vẫn session ID; role đang xem do UI roster giữ riêng | Chọn role chưa có phiên không ghi role ID vào selectedId; không mở drawer phiên trống. |

Một phiên thuộc roster khi `s.role` đúng một trong 15 ID chuẩn do server cung cấp. Không bắt buộc `team` khác null nếu server đã xác nhận role; không tự join theo tên, đường dẫn hoặc model. Role thiếu/lạ vẫn là phiên thông thường. Subagent lấy từ `s.subs`, không tự trở thành thành viên thứ 16.

Tổng hợp hoạt động: phiên có permission chưa giải quyết (`p.sess === s.id`) hoặc status wait được xếp wait; tiếp đến work, rồi rest. Trong cùng mức ưu tiên, sắp theo `lastAt` giảm dần và ID tăng dần khi bằng nhau. Phiên đầu là `primarySessionId`, chỉ dùng để chọn biểu hiện nhân vật, không tự chọn đích cho thao tác điều khiển. Status chưa nhận diện không tự coi là work; thể hiện unknown khi cần.

Khi loading chưa có snapshot: activity unknown, kể cả tập cache rỗng. Khi stale: giữ tập phiên và activity cuối đã quan sát, kèm freshness stale; UI không trình bày như trạng thái thực thi hiện tại đã xác nhận. Snapshot rỗng mới đồng bộ xong mới cho 15 vai trò idle. Task/run done nhưng session còn rest thì vẫn hiện rest; chỉ khi hết phiên mới idle theo BR-08.

## 5. Hợp đồng API và module

### HTTP/SSE hiện có, không thay schema

| Giao diện | Dữ liệu dùng | Giới hạn |
| --- | --- | --- |
| `GET /stream`; fallback `GET /api/live?since=…` | `snap`, `sess`, `ev`, `stats` có session, `gone`, `perm`, `permDone` | Chỉ là nguồn quan sát; roster không gửi event giả vào stream. |
| `GET /api/team` | roles/groups/stages/runs để giữ sheet hiện có | Không là điều kiện để tạo roster; lỗi mạng vẫn có danh mục tĩnh. |
| `GET /api/tasks` và API chi tiết phiên đang có | Năng lực CLI, dự án, model, dữ liệu thật khi mở thao tác | Giữ kiểm tra setup/đăng nhập/quyền hiện hữu. Không suy ra CLI sẵn sàng từ roster. |
| `POST /api/team`, `/api/team/stop`, `/api/team/resume` | Chỉ qua hành động người dùng trong luồng Đội AI hiện có | Không gọi vì khởi tạo nhân vật, mở roster, reconnect hoặc chọn người. |

Không thêm `/api/personnel`, không thay server/team prompts, đồng thời không truyền `team-role:*` tới bất kỳ API của phiên/quyền nào.

### API nội bộ dự kiến

Đây là chữ ký thiết kế, không phải code đã triển khai. Có thể điều chỉnh tên cho hợp code đang làm, giữ các ranh giới và bất biến.

| API | Trách nhiệm |
| --- | --- |
| `deriveTeamPresence(sessions, permissions, freshness)` trong shared | Trả 15 bản chiếu thuần, sắp phiên xác định, không mutate dữ liệu đầu vào. |
| `getTeamPresence()` trong ai-team | Đọc snapshot bản chiếu hiện tại cho 2D/team sheet/scene, dùng cùng dữ liệu và cách tổng hợp. |
| `reconcileTeamPresence()` trong ai-team | Tính lại bản chiếu sau mutation; cập nhật/giữ/xóa scene đúng mode; không dựng scene khi chưa ready. Gọi lặp có cùng kết quả. |
| `setupWorld()` / `clearWorld()` trong ai-team | Tạo tối đa một rig/role sau khi bàn/navigation/Worker sẵn sàng; tháo rig, nhãn, deskKit, selection/hover và tài nguyên khi đổi mode. |
| `workerForSession(sessionId)` trong workers | Trả resident của role nếu live HQ đã dựng resident; nếu không trả ordinary worker. Chỉ tra cứu, không thay sessions hoặc tạo alias trong workers. |
| `residentForDesk(deskIndex)` trong ai-team | Trả role ở bàn để chọn đúng role, kể cả chưa có phiên hoặc có nhiều phiên. Bàn CEO trả null. |
| `showRole(roleId)` trong ui/team-roster | Xem vai trò; không phiên thì cung cấp ngữ cảnh/đường giao mục tiêu; một phiên có thể mở đúng phiên; nhiều phiên phải chọn ID trước thao tác. |
| `officeLayout(query, saved)` trong shared/office-layout | URL hợp lệ > saved hợp lệ > HQ; không cần tham số migrated hoặc ghi dấu chuyển đổi. |

Registry resident có thể export từ `workers.js` để `workerForSession` không import ngược ai-team. `ai-team` import shared/Worker và nhận dữ liệu quyền qua lời gọi đối soát; tránh vòng import mới qua permissions → live → ai-team → permissions. UI nhận callback mở role/phiên; model shared không import UI. Không cần thêm event bus; dùng điểm mutation/queueUi đang có.

## 6. Luồng và bất biến triển khai

```text
TEAM_SEATS ───────────────────────────┐
live sessions + permissions + freshness ─→ deriveTeamPresence
                                     ├→ roster UI (2D / mọi layout)
                                     └→ ai-team (chỉ live HQ + scene ready)
                                               └→ 15 rig theo role/bàn
chọn role → không phiên: thông tin / Đội AI
          → có phiên: chọn ID thật → session drawer/API hiện có
```

### Khởi động, 2D và bố cục

1. Trong setup dùng chung LIST/3D, khởi tạo bản chiếu 15 vai trò với freshness loading; không đợi stream hoặc `/api/team`. Khởi tạo idempotent, không ghi đè khi dựng world muộn.
2. Tách setup dữ liệu/UI và setupWorld. Gọi setupWorld sau khi env, desks, navigation, look, Worker và cờ demo đã setup; gọi trước connect/start demo của vòng lặp. Dùng readiness riêng của ai-team, không chỉ `state.world`.
3. Mở đầu 2D chỉ tạo roster/DOM và tiếp nhận phiên với desk -1 như hiện tại. Khi `buildWorld()` chạy muộn, tạo đủ resident trước vòng upsert lại sessions; vòng đó gắn role vào resident, không tạo worker thứ hai.
4. Trong live HQ, phòng team và bàn CEO không thuộc bộ cấp bàn thường. Các phiên hợp lệ cùng role được gán `s.desk` về cùng bàn role để giữ liên hệ không gian; không thêm nhiều bản ghi chiếm bàn trong `deskOf`. Đa phiên không gọi nhánh fallback mượn bàn role khác.
5. Ở Pro/Cozy, không tạo 15 rig; session workers tiếp tục ở khu dự án như hiện có. Roster vẫn đầy đủ, đường sang HQ do UIUX thiết kế; không auto-expand do roster hoặc số 15. Luồng đầy bàn của phiên thật vẫn hoạt động riêng.

### Upsert, snapshot và kết thúc phiên

- `sessions` chỉ chứa phiên thật. Trong live HQ, phiên có role hợp lệ cập nhật liên kết/biểu hiện resident thay vì gọi addWorker cho phiên ấy. Ordinary `workers` chỉ chứa các nhân vật theo phiên còn lại; không alias cùng resident dưới nhiều ID trong workers, không nhét resident vào npcs để né cập nhật loop.
- Upsert có role đến muộn: nhả bàn thường, tháo rig theo phiên cũ bằng remove tức thì và chuyển subagent sang resident; không chat ra/vào hoặc ghi event giả. Role đổi/mất: tái liên kết về role mới hoặc ordinary worker; xóa tham chiếu cũ trước khi cấp bàn mới. Giữ nguyên ID và dữ liệu phiên.
- Sau snapshot áp dụng đầy đủ việc xóa/upsert phiên và perms rồi mới đối soát/render roster một lần; không công bố fresh giữa chừng. `sess`, `ev`, `stats` có session, `gone`, `perm`, `permDone` đều phải làm mới bản chiếu.
- `removeSession` và `dropSessionNow` nhả liên kết và subagent thuộc đúng session. Resident không đi vào leaving/leavingIds, không leave/remove theo session, không xóa màu ghế/deskKit đang thuộc resident. Một trong hai phiên biến mất thì phiên kia vẫn còn; hết phiên mới idle.
- Những event/chi phí/feed/chat/log vẫn giữ `e.sess` thật. Không phát sinh chat “nhân sự vào/rời” do dựng roster hoặc đổi liên kết. `chatLeft` hiện có cho phiên thật vẫn giữ ý nghĩa của phiên.

### Nhân vật, sự kiện, subagent và thao tác

- Giữ resident.id ổn định. `Worker` nhận loại resident và vị trí bàn riêng; resident không đọc `sessions.get(this.id)` để tìm dữ liệu. Tick đời sống tự động, rest/nightOut/đi chơi/về nhà và hooks xuất hành không áp dụng lên resident. Không vô hiệu hóa các nhánh ấy cho ordinary workers.
- Bước cập nhật rig/rebuild/picking liệt kê thêm residents đúng một lần; không đưa vào nhóm ordinary worker/npc cho tác vụ đi chơi, chấm công, tiệc hoặc các hoạt động làm mất hiện diện. Tái sử dụng makeChibi/Worker.animate/rebuild/remove và disposeChibi, không tạo bộ rig thứ hai.
- Tách nhận event thật khỏi điều khiển đi lại: incidents vẫn ghi feed/notify/quyền bằng session ID; nếu đích là resident thì chỉ biểu hiện tại bàn. Bubble/account/model lấy từ primary session và ghi rõ nguồn khi cần; event phiên phụ không ghi đè trạng thái ưu tiên wait của phiên khác. Không gọi postAction/director delivery/shredAction để kéo resident rời bàn.
- `workerForSession` phục vụ drawer wave, camera, vòng chọn, markers, liên kết subagent và quyền; các chỗ cần điều khiển session vẫn dùng ID thật. Không thay thế mọi vòng workers.values bằng residents vì nhiều vòng là tác vụ đời sống ngoài phạm vi.
- Mọi subagent giữ parentSessionId thật khi spawn và khi tái gắn parent; `spawnSub`, tra metadata, `dropSub`, click ở whiteboard/first-person và đường nối đều không dùng resident.id làm session ID. Xóa phiên A không xóa subs của phiên B đang cùng parent resident. Nhiều phiên cùng role hiển thị một nhân vật chính, vẫn giữ subagent thật và truy cập được từng phiên.
- Chọn người hoặc bàn role chuyển tới showRole; không dùng `sessions.find(s => s.desk === d)` để tự chọn phiên đầu. Chọn subagent đi thẳng tới đúng parentSessionId + agent ID. Khi session đang chọn biến mất, drawer đóng theo hiện trạng; không tự chuyển điều khiển sang phiên khác.

### Kết nối, demo và replay

- EventSource.onopen chỉ cho biết transport mở; roster giữ loading/stale cho tới snapshot mới. Lỗi kết nối đánh dấu stale, không xóa roster, không chuyển mọi người idle.
- Long poll bắt đầu bằng snapshot; sau gián đoạn, chỉ trở lại fresh khi áp dụng xong response thành công/batch bắt kịp cursor (đã có snapshot nền); không cần bắt server gửi snapshot mới ở mỗi lần poll. Không thêm timeout hay retry thứ hai.
- Khi replay thực sự bắt đầu thành công: tắt roster live, clearWorld residents và bản chiếu liên kết trước resetScene/áp dữ liệu lịch sử. Không tạo resident khi seek/snapshot/quiet remove; giữ cách xếp người theo phiên lịch sử hiện có.
- Khi thoát replay: xóa toàn bộ phiên/nhân vật replay rồi chuyển live, dựng lại roster loading và 15 rig nếu HQ đã ready, connect lại; chỉ snapshot live gắn phiên/fresh. Không mang perms/ID/bubble lịch sử sang live.
- Demo/STATIC không tạo roster live hoặc gọi API roster. Fallback HQ mới có thể làm demo mở HQ nếu không chỉ định layout; nội dung và danh tính phiên demo vẫn theo kịch bản, không thêm 15 nhân sự. Không sửa mặc định view2D đang lưu.

## 7. File dự kiến thêm hoặc thay đổi khi build

Đây là danh sách giao Frontend, không phải danh sách file Architect đã sửa. Mỗi điểm mở rộng nhằm giữ các luồng hiện hữu; không cần thêm folder sản phẩm mới.

| File | Việc dự kiến |
| --- | --- |
| `src/shared/team-presence.js` — thêm | Hàm chiếu, tổng hợp nhiều phiên và sắp xếp ổn định. |
| `src/shared/office-layout.js`, `src/office/core/env.js` | Tiếp nối helper đang có; giữ saved hợp lệ, fallback HQ; bỏ nhu cầu migration do roster. |
| `src/office/people/ai-team.js` | Tiếp nối file đồng thời; tách dữ liệu/scene, ID role ổn định, reconcile, đối soát subagent và teardown. |
| `src/office/people/workers.js` | Registry resident, resolver, chế độ resident tại bàn; explicit parentSessionId cho subagent và guard báo cáo/metadata. |
| `src/office/net/live.js` | Rẽ nhánh role/ordinary đúng mode, bàn cố định, remove không xóa resident, cập nhật độ mới. Giữ thuật toán cấp bàn thường. |
| `src/office/demo/demo.js` | Batch đối soát sau snap/perms, cập nhật khi gone/quiet/remove, kết nối/poll và debug theo mode. |
| `src/office/replay/replay.js` | Tắt/dọn roster trước replay, khôi phục loading trước connect live; không chiếu roster vào seek. |
| `src/office/main.js` | Đăng ký setup chung trong LIST, setupWorld đúng thứ tự và boot 2D muộn. |
| `src/office/core/loop.js`, `src/office/ui/look-switch.js` | Update rig/camera/rebuild resident mỗi cái một lần; không tăng nhóm tác vụ đời sống. |
| `src/office/interact/props.js`, `src/office/ui/whiteboard.js`, `src/office/interact/first-person.js` | Picking thêm resident, bàn role mở đúng role, click/E và subagent dùng đúng session. |
| `src/office/life/incidents.js`, `src/office/ui/permissions.js` | Sự kiện và chờ duyệt có resolver/nhánh resident, đối soát permission xong, giữ side effect phiên thật. |
| `src/office/ui/activity.js`, `src/office/ui/session-drawer.js`, `src/office/people/team-lines.js` | Nhãn/vòng chọn/camera/wave và liên kết subagent theo resolver, giữ bộ đếm/chi phí từ sessions. |
| `src/office/ui/team-roster.js` — thêm; `team-sheet.js`, `lite.js` | Render nguồn chiếu chung, chọn role/phiên; roster xuất hiện dù sheet fetch lỗi; 2D không gọi needWorld chỉ để xem người. |
| `src/office/ui/group-chat-view.js` | Tái sử dụng openTeam hiện có; chỉ thêm nhận role/đích nếu thiết kế UIUX cần mở roster từ scene. |
| `src/i18n/locales/{vi,en}/team.js`, `src/styles/group-chat.css`, `src/styles/lite.css` | Khóa freshness/idle/count/đa phiên và định dạng roster theo UIUX. Tên/duty role dùng khóa hiện có. |
| `src/components/office/TopBar.tsx`, `src/styles/topbar.css` | Chỉ đổi nếu UIUX chọn bổ sung điểm mở roster; không bắt buộc thêm route/component React mới. |
| `src/office/ui/ticks.js` | Bổ sung getter debug cho projection/residents/freshness phục vụ test, giữ sau cờ debug hiện có. |
| `tests/unit/team-presence.test.mjs` — thêm; test layout helper | Test quy tắc thực, không sao chép implementation. Tái dùng/điều chỉnh test helper nếu phiên đồng thời đã thêm. |
| `tests/e2e/team-presence.spec.ts` — thêm; `office.spec.ts`, `view2d.spec.ts`, `look-dispose.spec.ts` | Live giả lập snapshot/phiên/quyền, hồi quy 2D/layout và disposal; không gọi model trả phí. |

Không dự kiến đổi server/index.mjs, server/team.mjs, src/panel, Tauri, package/version, prompt/model/effort của đội hoặc logic exit-request. Sau build, cập nhật FEATURE-MAP/maps/kiến trúc khi chức năng/module thực tế đã đổi; Architect chưa sửa INDEX/bản đồ vì giai đoạn này chỉ thêm tài liệu.

## 8. Kiểm chứng và bàn giao cho các vai trò sau

Đã chạy `node --test tests/unit/team.test.mjs`: **9 đạt, 0 lỗi, 0 bỏ qua**. Test xác nhận baseline danh mục/thứ tự vai trò và điều phối, không chứng minh tính năng hiện diện đã có. Đã kiểm tra git status/diff, đọc quy tắc disposal/animation; không chạy GUI/E2E/build/lint/typecheck vì Architect không sửa code sản phẩm. Các sửa sản phẩm đồng thời chưa được kiểm chứng trong báo cáo này.

Frontend/QA cần kiểm chứng các hợp đồng sau bằng test hành vi:

1. Fresh snapshot rỗng: 15 projection và 15 rig trong live HQ, sessions=0, không POST tạo việc, không usage/cost/event giả; loading/stale không hiện idle chắc chắn.
2. Upsert hai phiên cùng role rồi xóa lần lượt: một rig/bàn chính; cả ID còn truy cập đúng; quyền pending của phiên phụ vẫn có ưu tiên; hết phiên mới idle. Kiểm cả role đến muộn, role đổi, ID lạ và subagent của hai phiên.
3. Snap lặp/reconnect, gone lặp và quiet remove: không mất người, không gắn phiên A vào drawer/quyền của B; không dùng leaving cho resident. Ban đêm/giả lập giờ không làm resident biến mất và không thay vòng đời phiên thường.
4. URL/saved hợp lệ giữ nguyên, saved không hợp lệ/storage lỗi fallback HQ; Pro/Cozy có roster nhưng không nhét 15 rig; không reload do roster. 2D mở trước không dựng thế giới, sang 3D dựng đúng một lần.
5. Vào replay/seek/ra live và demo: lịch sử không có roster live, trở lại live chờ snapshot mới; không sót rig/DOM/selection. Đổi look nhiều lần và dispose không tăng rig liên tục; kiểm draw calls/frame so baseline trên chất lượng thấp.
6. vi/en đủ khóa; roster tách nhãn nhân sự với số phiên. Khi không CLI hoặc API sheet lỗi, vẫn đọc được danh mục; giao việc và quyền tiếp tục kiểm tra bằng luồng hiện có.

Frontend chạy lint/typecheck, unit liên quan (`team`, `team-presence`, layout, `chibi-dispose`, `i18n`) và production build theo quy tắc dự án. QA chạy E2E live riêng và hồi quy phù hợp; server thử ở 4311 với OFFICE_DATA_DIR riêng, không đụng app cổng 4310.

UIUX sở hữu vị trí điểm mở roster, cách trình bày danh sách/chi tiết vai trò, trạng thái tải/lỗi/mất kết nối, chọn nhiều phiên, đường sang HQ và accessibility. Hợp đồng cần giữ: danh mục không đợi fetch, không phiên thì không có điều khiển phiên, đa phiên chọn ID, trạng thái có chữ và freshness riêng. P1 chỉ mở rộng mức thông tin/điều hướng theo PO; không phát sinh chat/giao việc mới cho từng role. Frontend đọc cả hai báo cáo design trước build; nếu UIUX chọn cách mount khác thì đổi adapter UI, không nhân đôi model hoặc đổi hợp đồng dữ liệu.

Rủi ro kỹ thuật chính là các chỗ ngầm coi `w.id` bằng session ID và reset scene qua nhiều đường; resolver + parentSessionId + test luồng đa phiên là điều kiện chặn nghiệm thu. Không mở rộng Backend/Database chỉ để tránh xử lý các điểm này ở frontend.

## 9. File Architect thực sự thay đổi

- Tạo `.ai-office/team/2026-11-04-2a506d/2-design-architect.md`: báo cáo này.
- Tạo `.ai-office/state/2026-11-04-2a506d-architect.md`: bàn giao riêng.
- Thêm liên kết Architect tại `.ai-office/STATE.md`, giữ nguyên các nhiệm vụ khác và office-log.
- Không sửa code/test sản phẩm, không commit/push. MEMORY cốt lõi không thêm lịch sử hay quyết định chưa triển khai; entry bộ nhớ của phiên nằm trong state riêng được STATE liên kết theo quy ước dự án.

## Tóm tắt

Đã đọc bộ nhớ và ba báo cáo plan, đối chiếu code cùng thay đổi đồng thời trong working tree.
Đã chốt ranh giới roster, phiên thật và nhân vật; giữ 15 đại diện ổn định, đa phiên chọn đúng ID.
Đã thiết kế dữ liệu, API nội bộ, luồng boot/snapshot/replay và danh sách file giao Frontend.
Baseline đội AI đạt 9/9; chỉ viết tài liệu thiết kế và bàn giao bộ nhớ, chưa triển khai tính năng.
