# Hướng dẫn DT Office (bản có Claude Code + Codex CLI)

DT Office là một **văn phòng chibi 3D chạy trên máy bạn**: mỗi phiên làm việc của AI (Claude Code, và giờ thêm **Codex CLI**) là một nhân viên ngồi bàn. Nhân viên đi tới thư viện khi đọc file, ngồi gõ khi sửa code, ra phòng máy khi chạy lệnh. Kèm theo là nhóm chat, bảng duyệt quyền, bảng theo dõi máy, lịch sử hội thoại, giao việc từ điện thoại…

Mở văn phòng: **http://localhost:4310** · Xem thử không cần AI: **http://localhost:4310/?demo**

Có hai cách dùng: **app desktop** (Tauri v2, cài một lần rồi bấm mở như mọi app) hoặc chạy bằng dòng lệnh (`node bin/cli.mjs`, mục 2).

---

## 0. App desktop (Tauri v2)

### Cài app

Tải bản mới tại [GitHub Releases](https://github.com/trancaodai1651/DTOffice/releases/latest): **`DT.Office_0.4.5_x64-setup.exe`** cho Windows hoặc **DMG Universal** cho macOS (Intel và Apple Silicon). App Windows cài cho riêng tài khoản của bạn, không cần quyền admin. App mang theo Node.js và toàn bộ server, nên máy **không cần cài Node** để chạy. Bản macOS ký ad-hoc, chưa notarize; lần mở đầu có thể cần cho phép trong Cài đặt hệ thống → Quyền riêng tư & Bảo mật.

Mở app thì app tự bật server văn phòng ở cổng 4310 (không có cửa sổ console) rồi hiện văn phòng ngay trong cửa sổ app. Đóng app thì server cũng tắt. Nếu bạn đang chạy `node bin/cli.mjs` sẵn, app dùng luôn server đó.

Dữ liệu của app (tùy chọn, chat, lịch sử, log `app-server.log`) nằm ở `%USERPROFILE%\.my-office`, không bị mất khi cập nhật hay gỡ app.

### Lần mở đầu tiên: chọn CLI

Lần đầu mở, văn phòng hỏi **kết nối với CLI nào**:

| Chọn | App làm gì |
| --- | --- |
| **Claude Code** | Cài `@anthropic-ai/claude-code` nếu máy chưa có, rồi nối hook Claude Code vào văn phòng (giống `my-office install`). |
| **Codex CLI** | Cài `@openai/codex` nếu máy chưa có. Văn phòng đọc phiên Codex tự ghi trong `~/.codex/sessions`, nên không cần hook. |
| **Cả hai** | Làm cả hai việc trên. |

Mỗi bước có chấm màu (đang chạy / xong / lỗi kèm ghi chú). Xong rồi, CLI nào chưa đăng nhập có nút **Đăng nhập**: nút này mở cửa sổ terminal chạy `claude` (đăng nhập ở lần chạy đầu) hoặc `codex login`.

Muốn đổi lựa chọn sau này: **Cài đặt (biểu tượng bánh răng) → "Chọn CLI kết nối (Claude / Codex)…"**.

Lựa chọn này quyết định những gì văn phòng hiển thị:
- **Chỉ Claude**: chỉ hiện hạn mức Claude. Không theo dõi phiên Codex. Giao việc chạy bằng Claude Code.
- **Chỉ Codex**: chỉ hiện hạn mức Codex. Giao việc chạy bằng Codex.
- **Cả hai**: hiện cả hai, và khi giao việc cho thư mục mới thì có nút chọn **Claude Code / Codex**.

### Theo dõi hạn mức 5 giờ và tuần

Viên hạn mức trên thanh trên cùng hiện từng CLI đã chọn, ví dụ:

```
Claude 5 giờ 12% · Tuần 40%  │  Codex 5 giờ 0% · Tuần 78%
```

Thanh màu dưới viên lấy theo mức cao nhất: cam từ 80%, đỏ từ 95%. Khi qua 80% hoặc 95%, văn phòng hiện thông báo. Rê chuột lên viên để xem giờ reset của từng hạn mức. Bấm vào viên để mở bảng chi tiết, mỗi CLI một tab, kèm các tài khoản khác nếu bạn thêm.

Nguồn số liệu:
- **Claude**: đọc theo tài khoản **Claude Code CLI** đã đăng nhập, và qua status line của Claude Code. Tài khoản phải là gói **Pro/Max**.
  - Ứng dụng Claude desktop đăng nhập riêng, không tính. File `~/.claude/.credentials.json` có thể tồn tại mà chỉ chứa đăng nhập MCP.
  - Văn phòng kiểm tra bằng chính `claude auth status`. Nếu CLI chưa đăng nhập, viên ghi "Chưa đăng nhập" và bảng hạn mức có nút **Đăng nhập Claude Code CLI**. Nút này mở terminal chạy `claude auth login` để bạn đăng nhập trên trình duyệt.
  - Đăng nhập xong, hạn mức tự hiện sau vài giây, không cần tải lại trang.
- **Codex**: đọc qua `codex app-server` với tài khoản ChatGPT đang đăng nhập trong Codex. Hạn mức primary là 5 giờ, secondary là tuần.

**Cái gì đang ăn gói** có cho cả hai CLI. Bấm dòng "Cái gì đang ăn gói?" ở tab Claude hoặc tab Codex trong bảng hạn mức; ngăn mở ra có tab **Claude | Codex** và **Hôm nay | 7 ngày**.
- **Claude**: chi phí theo giá API từ telemetry của Claude Code, theo MCP, skill, subagent, model, dự án, phiên.
- **Codex**: văn phòng đọc thẳng file phiên của Codex (`~/.codex/sessions`), chỉ lấy số token, không đọc nội dung. Ngăn hiện:
  - hạn mức 5 giờ và tuần Codex báo gần nhất;
  - tổng token, số lượt gọi, phần đọc lại từ cache;
  - token theo model, theo nhân sự Đội AI Agent Dev, theo dự án, theo phiên, và theo từng ngày (tab 7 ngày).
  - Gói ChatGPT không tính tiền theo token, nên mỗi dòng ghi thêm **≈ % hạn mức tuần**: tỉ lệ token tuần này đếm được so với % tuần đã dùng.

### Giao việc ngay trong app

Mở **nhóm chat** rồi bấm **📋 Giao việc**. Việc giao gồm hai bước:

**Bước 1: việc gì, giao cho ai**
1. Chọn một cuộc trò chuyện đang có (làm tiếp đúng hội thoại đó), hoặc một **thư mục dự án** (mở phiên mới). Mở **📁 Thêm hoặc bỏ dự án** để quản lý danh sách dự án của bạn (xem mục Dự án của bạn).
2. Gõ hoặc nói (🎤) yêu cầu, đính ảnh nếu cần.
3. Dòng **🧠 Bộ nhớ** cho biết dự án đó đang nhớ bao nhiêu mục. Bấm **Xem** để mở bộ nhớ.
4. Bấm **Tiếp tục →**.

**Bước 2: chạy bằng gì**
- **CLI:** **Claude Code** hoặc **Codex CLI**. Cuộc trò chuyện đang có thì bị khóa theo CLI của nó. CLI chưa cài sẽ ghi "Chưa cài".
- **Model:**
  - Claude Code có **Fable 5.1, Opus 5.5, Sonnet 5.5, Haiku 5.5** (`--model`).
  - Codex có đúng danh sách mà Codex tự lưu (`~/.codex/models_cache.json`), ví dụ GPT-6.1-Sol, GPT-6-Astra, GPT-5.6-Luna… (`-m`).
  - **Mặc định** nghĩa là để CLI dùng cài đặt riêng của nó.
- **Mức suy nghĩ (effort):**
  - Claude: Thấp / Vừa / Cao / Rất cao / Tối đa (`--effort`).
  - Codex: chỉ hiện các mức mà model đang chọn hỗ trợ, có thể có cả **Siêu cao** (`-c model_reasoning_effort=…`). Kèm ghi chú mức mặc định của model.
- Lựa chọn lần trước của từng CLI được nhớ cho lần sau (trong trình duyệt hoặc app này).

Bấm **Giao việc**. Thẻ việc trong chat hiện từng bước và có nút Dừng; câu trả lời quay về chat.

### Bộ nhớ phiên

Mỗi dự án có bộ nhớ riêng, lưu ở `~/.my-office/memory/` (hoặc `data/memory/` khi chạy từ repo).

- **Khi phiên kết thúc**, văn phòng ghi lại một mục gồm:
  - tối đa 5 yêu cầu được giao;
  - các file đã sửa;
  - số lệnh đã chạy;
  - câu trả lời cuối, hoặc lý do dừng giữa chừng.

  Mục này được ghi cả với Claude Code lẫn Codex, kèm thông báo "🧠 Đã lưu bộ nhớ phiên…" trong chat. Việc giao từ app được ghi ngay khi CLI chạy xong.
- **Khi phiên mới bắt đầu** ở cùng dự án, nó đọc bộ nhớ trước (tối đa khoảng 4.000 ký tự, mới nhất trước):
  - **Claude Code** đọc qua hook `SessionStart`, áp dụng khi mở mới, resume hoặc `/clear`. Hook này do `install` hoặc màn hình chọn CLI cài vào. Chat báo "🧠 … đã đọc bộ nhớ dự án".
  - **Codex** được giao từ app: bộ nhớ đi kèm lời dặn.
  - Nếu bật file memory và đã có đủ `INDEX.md`, `STATE.md`, `MEMORY.md` trong `.ai-office/`, chỉ chèn chỉ dẫn đọc ngắn và ghi nhớ do bạn thêm; không chèn lại lịch sử phiên. Dự án chưa có đủ file vẫn dùng context JSON cũ.
- **Quản lý:** 📋 Giao việc → **🧠 Bộ nhớ → Xem**. Ở đó bạn có thể thêm ghi nhớ riêng (ví dụ "luôn chạy npm test trước khi commit"), xóa từng mục, **Xóa hết**, hoặc **Tắt bộ nhớ** (tắt rồi thì không ghi và không đọc nữa).
- Bộ nhớ lưu dạng dữ liệu, nên khi đổi ngôn ngữ văn phòng, bộ nhớ cũng được viết lại bằng ngôn ngữ mới.
- Phiên Codex bạn tự mở trong terminal cũng đọc được bộ nhớ, nhờ file bộ nhớ trong dự án (mục kế tiếp): Codex tự đọc `AGENTS.md`.

### File bộ nhớ trong dự án (Claude Code và Codex cùng đọc, cùng ghi)

Repo này dùng các file trong `.ai-office/`:

| File | Vai trò |
| --- | --- |
| `INDEX.md` | Chỉ mục ngắn: thư mục, điểm vào, lệnh chạy và bản đồ chức năng |
| `STATE.md` | Bàn giao hiện tại: tiến độ, file, quyết định, kiểm tra và bước tiếp theo |
| `MEMORY.md` | Quy ước, quyết định và bài học bền vững; đọc phần cốt lõi |
| `SESSION-LOG.md` | Nhật ký tự sinh, chỉ tra khi cần; metadata phiên và file, không sao chép prompt/câu trả lời |
| `history/` | Ghi chú cũ được lưu riêng để không phải đọc lại mỗi phiên |

Khi mở phiên mới hoặc mất ngữ cảnh: đọc INDEX → STATE → MEMORY cốt lõi; tra bản đồ để chỉ đọc code/test liên quan. Cùng phiên không cần đọc lại tài liệu không đổi. Khi xong: cập nhật STATE; chỉ ghi kiến thức bền vững vào MEMORY. Nhiều nhiệm vụ dùng `state/<mã-nhiệm-vụ>.md` và liên kết từ STATE, không ghi đè nhau.

Để agent biết phải đọc file này ngay từ đầu, văn phòng thêm một khối nhỏ (giữa hai dấu `my-office:memory`) vào:
- **`CLAUDE.md`:** Claude Code tự đọc file này khi mở phiên;
- **`AGENTS.md`:** Codex tự đọc file này khi mở phiên.

Văn phòng chỉ ghi lại đúng khối của mình. Ghi chú trong MEMORY và khối nhật ký cũ được giữ nguyên; nhật ký mới ghi sang SESSION-LOG. INDEX/STATE do agent quản lý, ứng dụng không tự suy đoán cấu trúc dự án hay ghi đè hai file đó. Với dự án khác chưa có chỉ mục, yêu cầu AI lập theo code thực tế một lần.

Đổi tài khoản vẫn dùng cùng thư mục dự án; máy/worktree khác cần đồng bộ các file ngữ cảnh. Không lưu credential hay hội thoại nguyên văn vào các file này. Bộ nhớ JSON và lịch sử hội thoại trong data là các cơ chế riêng, không bị xóa bởi việc tách tài liệu.

File được tạo hoặc cập nhật khi có việc giao từ app, khi đội AI bắt đầu một bước, và khi một phiên kết thúc. Bật/tắt ở **📋 Giao việc → 🧠 Bộ nhớ → Xem → "Ghi file bộ nhớ vào dự án"**. Chính repo DT Office cũng đã có file này.

### Dự án của bạn

Danh sách dự án là của bạn, không cố định là dự án DT Office:
- **Thêm:** dán đường dẫn đầy đủ của thư mục (copy từ thanh địa chỉ File Explorer, ví dụ `D:\Code\shop`) rồi bấm **Thêm**. Thư mục phải có thật trên máy.
- **Bỏ:** bấm **✕** cạnh dự án. Chỉ bỏ khỏi danh sách, thư mục trên máy giữ nguyên. Phiên Claude/Codex chạy ở thư mục đó cũng không tự thêm lại, chỉ khi bạn thêm.
- Có ở hướng dẫn viên (bước "Dự án nào?") và ở **📋 Giao việc → Thêm hoặc bỏ dự án**. Việc thêm/bỏ chỉ làm được trên chính máy này, không làm từ điện thoại.
- Phiên làm việc ở thư mục mới vẫn tự vào danh sách như trước (tối đa 60 dự án).

### Giao việc qua hướng dẫn viên (cách khuyên dùng)

Bạn chỉ cần nói việc với **chị Mai**:
1. Bấm chị Mai ở góc phải dưới → **Giao việc cho đội AI Agent**.
2. Gõ việc cần làm, bấm **Tiếp tục**.
3. Chị hỏi **"Việc này cho dự án nào?"**: chọn dự án, hoặc thêm thư mục dự án mới ngay đó.
4. Chị tìm **đội AI Agent phù hợp** theo nội dung việc và nói lý do ("vì việc có nhắc tới: api, giao diện…"). Hiện có **Đội AI Agent Dev**; khi có thêm đội khác, một việc cần nhiều mảng sẽ được giao cho **nhiều đội phối hợp, làm lần lượt**: đội sau đọc báo cáo của đội trước. Bạn có thể tick/bỏ đội.
5. Chọn giao cho PM hay CTO, CLI, model, effort, rồi bấm **Giao việc**.

Sau đó từng nhân sự được gọi sẽ **tới gặp bạn để nhận phần việc** rồi về bàn làm. Nhóm chat báo "PM gọi … nhận việc".

### Đội AI Agent Dev (bạn là CEO)

Mở **Nhóm chat → 👥 Đội AI Agent Dev**, hoặc giao việc qua hướng dẫn viên. Đội có 15 agent, chia 5 nhóm:

| Nhóm | Agent |
| --- | --- |
| Quản lý (3) | CTO Agent, PM Agent, Product Owner Agent |
| Phân tích và thiết kế (3) | BA Agent, Solution Architect Agent, UI/UX Agent |
| Lập trình (4) | Frontend Agent, Backend Agent, Desktop/Mobile Agent, AI Engineer Agent |
| Chất lượng (2) | QA Tester Agent, Code Reviewer Agent |
| Vận hành (3) | DevOps Agent, Database Agent, Security Agent |

**Giao mục tiêu:** chọn dự án, chọn **giao cho PM hoặc CTO**, chọn CLI (Claude Code hay Codex), model và effort, gõ mục tiêu rồi bấm **Giao mục tiêu cho đội**. Đội tự chạy qua các bước:

1. **PM + PO + BA** (thêm CTO nếu giao cho CTO): lập kế hoạch, phân tích yêu cầu, viết user story và tiêu chí nghiệm thu.
2. **Architect + UI/UX:** thiết kế hệ thống và giao diện.
3. **Frontend + Backend + Desktop/Mobile + AI:** viết code, chạy build và test.
4. **QA + Code Reviewer + Security:** kiểm thử, rà soát, kiểm tra bảo mật, kết luận `VERDICT: PASS` hoặc `FAIL`. Nếu FAIL, đội lập trình tự sửa rồi kiểm thử lại, **tối đa 2 vòng**. Sau 2 vòng vẫn FAIL thì đội không triển khai mà báo thẳng cho CEO.
5. **DevOps + Database:** build, đóng gói, migration, viết cách triển khai, giám sát và rollback. Bước này **không push hay xuất bản gì** trừ khi mục tiêu ghi rõ.
6. **PM (hoặc CTO) báo cáo CEO:** đã giao gì, kiểm chứng ra sao, còn gì, rủi ro, CEO cần quyết định gì.

**Cách chạy: mỗi agent là một phiên riêng, chỉ làm đúng việc của vai trò mình.** Các agent dùng chung CLI, model và effort đã chọn, nhưng không ai làm thay ai. Mỗi phiên được dặn rõ đồng nghiệp trong cùng bước là ai, phụ trách phần nào, và "không làm phần việc của họ".
- **PM phân công:** cuối bản kế hoạch, PM ghi dòng `ROLES: …` liệt kê vai trò nào có việc với mục tiêu này. Chỉ những vai trò đó được gọi ở các bước sau; ví dụ mục tiêu không có giao diện thì không gọi UI/UX hay Frontend. **QA, Code Reviewer, DevOps** luôn tham gia; **PM, PO, BA, Architect** luôn có mặt ở bước của mình. Nhóm chat báo "PM đã phân công cho: …".
- **Song song hay lần lượt:**
  - Lập kế hoạch và thiết kế chạy **song song** (mỗi lần tối đa 3 phiên, ai chưa đến lượt thì chờ).
  - Lập trình, sửa lỗi, kiểm thử và triển khai chạy **lần lượt từng người**, để không ai sửa đè code của người khác. Người sau đọc báo cáo của người trước; ví dụ Reviewer đọc những gì QA tìm thấy.
- **Kiểm thử:** QA, Reviewer và Security mỗi người tự kết luận PASS hoặc FAIL. **Chỉ cần một FAIL** là đội lập trình phải sửa, mỗi kỹ sư sửa phần thuộc mảng của mình.
- **Báo cáo:** mỗi người một file `.ai-office/team/<mã lượt>/<số>-<bước>-<vai trò>.md`, ví dụ `1-plan-pm.md`, `3-build-backend.md`, `4-verify-qa.md`.
- **Theo dõi:** bảng Đội AI Agent Dev hiện từng bước và từng thành viên (chờ lượt / ⏳ chờ xong việc khác / đang làm / xong / lỗi, kèm kết luận kiểm thử). Rê chuột lên một người để xem câu trả lời cuối của họ. Mỗi agent ngồi đúng bàn có tên mình trong Phòng AI, và câu trả lời của họ hiện trong nhóm chat.
- Mọi phiên đều đọc và ghi bộ nhớ dự án.
- **Dừng và tiếp tục:** nút **Dừng đội** dừng mọi người đang làm. Nếu đội bị dừng (do bạn, do tắt app hay server) hoặc bị lỗi, bấm **Tiếp tục**: đội làm tiếp đúng chỗ dở, ai đã xong thì giữ nguyên kết quả.
- **Nhiều việc cùng lúc:** bạn có thể giao việc mới khi đội đang làm việc khác, kể cả cùng dự án. Mỗi nhân sự chỉ làm một việc một lúc: nếu việc mới cần người đang bận, người đó **làm xong việc đang dở rồi mới nhận việc mới** (bảng đội ghi "chờ xong việc khác"; nhóm chat báo ai đang chờ ai). Hai việc cùng dự án không sửa code cùng lúc: bước lập trình/sửa lỗi của việc sau chờ việc trước xong bước đó. Người rảnh được trao cho việc giao sớm hơn trước.

Kết quả chạy thật (Codex, GPT-5.6-Luna, effort Thấp, mục tiêu "module notes.js có test"):
- Chín phiên riêng: PM, PO, BA song song; rồi Architect; Backend; QA rồi Reviewer; DevOps; PM báo cáo.
- PM chỉ phân công Backend, QA, Reviewer, DevOps; UI/UX, Frontend, Database không bị gọi vì không có việc.
- Lượt chạy bị tắt giữa chừng ở bước kiểm thử, bấm Tiếp tục thì làm nốt. Kiểm thử ĐẠT, `npm test` 6/6.

### Phòng AI Agent DEV

Ở **Trụ sở**, phòng ban góc phải phía trước là phòng riêng của Đội AI Agent Dev: **PHÒNG AI 15 AGENT DEV**.
- **15 nhân sự luôn có mặt** ở bàn của mình, kể cả khi chưa có việc (nhãn "Chờ việc"). Họ không biến mất khi phiên kết thúc và không tự ra khỏi tòa nhà.
- **Rảnh** một lúc thì có thể ra **phòng nghỉ** (sofa, pantry, thư viện) rồi quay lại; có việc hay được gọi là về bàn ngay.
- **Nhận việc:** khi PM/CTO gọi một nhân sự, người đó **đi tới bàn giám đốc (bạn)**, đợi nếu giám đốc đang đi một vòng, nhận tờ giao việc rồi về bàn làm. Nhân viên thường (phiên Claude/Codex) cũng vậy: có lời nhắn mới thì lên gặp sếp nhận việc rồi về bàn; chỉ khi chỗ trước bàn sếp đã kín hoặc bật giảm chuyển động thì giám đốc mới mang việc tới.
- **Ra ngoài phải xin phép:** nhân viên muốn ra ngoài (về nhà, đi mua đồ, lái xe dạo) phải tới gặp giám đốc; bảng "Xin phép ra ngoài" hiện để bạn bấm **Cho phép** hoặc **Ở lại**. Chờ lâu hay ẩn tab cũng không tự được phép.
- Phòng có 4 cụm bàn xếp thành 2 hàng, tổng **16 bàn**: một bàn cho mỗi vai trò trong 15 agent, cộng một bàn **CEO (bạn)**.
- Mỗi bàn có biển tên vai trò.
- Mỗi agent luôn ngồi đúng bàn có tên mình, dù đang làm cho dự án nào. Phiên thường không ngồi vào phòng này.
- Mọi nơi đều hiện **tên vai trò**: nhãn trên đầu nhân vật, danh sách phiên, nhóm chat, bộ nhớ. Nhãn bên cạnh tên ghi "Đội AI" thay cho tên thư mục.
- Thanh camera có nút **Phòng AI** để nhảy thẳng tới phòng này.

### Người rảnh không ngủ

Khi một phiên đang rảnh, nhân viên **không ngủ gục ở bàn** nữa, mà làm một trong hai việc (nhân sự Đội AI Agent Dev chỉ ra phòng nghỉ, không ra ngoài):
- **Ra phòng nghỉ:** sofa ở lounge, bàn ăn pantry, quầy cà phê hoặc thư viện, rồi lướt điện thoại hay đọc sách. Vài phút lại đổi chỗ.
- **Ra ngoài lái xe máy dạo một vòng**, vài phút rồi quay về, **sau khi được bạn cho phép**. Việc này chỉ xảy ra khi văn phòng đang hiện cảnh thành phố, và chỉ với người có xe máy riêng.

Có việc là họ quay về bàn ngay. Giờ nghỉ trưa 12:30–13:30 vẫn kéo rèm, nhưng mọi người thư giãn chứ không ngủ.

### Hóa thân: lái xe máy và ô tô

Bấm **Hóa thân**, đi tới thang máy hoặc cửa và bấm **E** để xuống phố. Ngay lối ra có **một xe máy** và **một ô tô VinFast VF3** đỗ sẵn. Lại gần, bấm **E** ("Lên xe máy" / "Lái ô tô") để lên xe.

| Phím | Tác dụng |
| --- | --- |
| W / ↑ | Ga |
| S / ↓ | Phanh, giữ để lùi |
| A / D, ← / → | Lái |
| Shift | Tăng tốc |
| V | Đổi góc nhìn (sau xe / mắt người lái) |
| E | Xuống xe |

Trên điện thoại dùng cần điều khiển trên màn hình.
- Xe không đi xuyên qua nhà, cửa hàng hay sân thượng; đâm vào thì nảy lại. Xe ngoài đường dừng nhường khi bạn ở trên đường.
- Xuống xe ở đâu thì xe đỗ ở đó, quay lại bấm E để lái tiếp.

### Văn phòng tự mở rộng

Văn phòng Nhỏ có 9 bàn, Công ty có 12 bàn. Khi **hết bàn**, hoặc khi **Đội AI bắt đầu làm việc** trong văn phòng nhỏ hơn Trụ sở, văn phòng hiện thông báo đếm ngược 8 giây rồi tự mở rộng thành **Trụ sở**: tầng công ty cộng một cánh có **4 phòng ban**, tổng **52 bàn** (trong đó 16 bàn ở Phòng AI). Mỗi dự án ngồi chung một khu.
- Bấm **Để sau** để hủy; văn phòng sẽ hỏi lại sau 30 phút.
- Đổi tay ở Cài đặt → Văn phòng.
- Thêm phòng mới sau này: mỗi phòng là một mục trong `DEPTS` (`src/office/world/layout.js`), với số cụm bàn tùy ý. Bàn, đường đi và nhãn phòng tự tính theo đó; phòng AI là ví dụ, với 4 cụm bàn và `team: true`.

### Hướng dẫn viên: chị Mai

Ở góc phải dưới có **chị Mai**, nhân viên hướng dẫn sử dụng app (chân dung chibi, nhãn "Hướng dẫn"). Lần đầu mở app, chị chào một câu. Bấm vào chị để mở bảng hướng dẫn:
- Mục đầu tiên **Giao việc cho đội AI Agent**: xem mục "Giao việc qua hướng dẫn viên".
- **Hỏi bằng lời của bạn**, ví dụ "giao việc cho codex" hoặc "hạn mức tuần". Gõ có dấu hay không dấu đều được; chủ đề khớp nhất hiện lên đầu.
- **16 chủ đề:** bắt đầu nhanh, Đội AI, giao việc, chọn CLI/model/effort, bộ nhớ phiên, file bộ nhớ, hạn mức, duyệt lệnh, nhóm chat, xem phiên, kết nối CLI, ngôn ngữ, xem lại, điện thoại, tham quan văn phòng, khi có sự cố.
- Mỗi chủ đề có các bước làm và nút **Làm giúp tôi**, mở đúng chỗ cần dùng (màn hình giao việc, bảng hạn mức, chọn CLI, cài đặt ngôn ngữ, tour…).
- Khi nhóm chat đang mở, chị đứng sang bên trái khung chat để không che nhau.

### Ngôn ngữ

**Cài đặt → Ngôn ngữ**: chọn **Tiếng Việt** thì toàn bộ app là tiếng Việt, chọn **English** thì toàn bộ là tiếng Anh. Phạm vi đổi gồm:
- giao diện;
- lời nhắn của nhân viên trong chat;
- chị Mai và các chủ đề hướng dẫn;
- bộ nhớ phiên;
- thông báo của server;
- dòng lệnh `my-office`.

Hai bộ chữ có đúng cùng số khóa (3.200+), không khóa nào bị thiếu. Màn hình chọn CLI ở lần mở đầu cũng có nút đổi ngôn ngữ.

### Tự build app

Cần **Rust** (rustup, toolchain `stable-msvc`) và **Visual Studio Build Tools** (workload C++). Máy này đã cài cả hai. Sau đó:

```bash
npm run desktop:build
```

Lệnh này chạy `scripts/build-desktop.mjs`: build trang, chép server và `node_modules` bản production vào `.desktop/office`, chép Node đang dùng (kèm npm) vào `.desktop/node`, rồi chạy `tauri build`. Bộ cài nằm ở `src-tauri/target/release/bundle/nsis/`.

Chạy thử mà không đóng gói:

```bash
npm run desktop:dev
```

---

## 1. Kiến trúc trong 30 giây

```
Claude Code ──hook (POST /event)────────────┐
                                             ▼
Codex CLI ──ghi ~/.codex/sessions/*.jsonl──▶ server/index.mjs ──SSE /stream──▶ trang web (3D, three.js)
            (server/codex-sessions.mjs đọc)   │  /api/*  (log, duyệt quyền, chat, giao việc, máy…)
Claude Code ──OpenTelemetry (/v1/*)──────────┘
```

- `server/`: server Node.js thuần (không cần build), cổng **4310**, chỉ nghe `127.0.0.1` (trừ khi bật `--lan`).
- `app/`, `src/`: trang Next.js; cảnh 3D và các bảng nằm trong `src/office/`.
- `data/`: dữ liệu chạy (token, PIN, chat, nhật ký xem lại 7 ngày, kho lịch sử…), không đưa lên git.

---

## 2. Cài và chạy trên máy này (Windows)

Máy đã được cài sẵn: **Node.js 26**, **Git 2.56**, **Claude Code 2.1.317** và **Codex CLI 0.166** (qua `npm i -g`). Thư viện của dự án đã cài (`npm ci`) và trang đã build (`.next/`).

### Chạy văn phòng

Mở PowerShell trong thư mục `my-office`:

```bash
node bin/cli.mjs
```

Rồi mở http://localhost:4310. Đổi sang tiếng Việt: **Cài đặt → Ngôn ngữ**, hoặc chạy với biến `OFFICE_LANG=vi`:

```bash
$env:OFFICE_LANG='vi'; node bin/cli.mjs
```

> Trên Windows đừng dùng `npm start` (script đó viết kiểu macOS/Linux `NODE_ENV=production …`). `node bin/cli.mjs` tự đặt `NODE_ENV` và tự build trang nếu chưa có.

### Nối Claude Code vào văn phòng (một lần)

```bash
node bin/cli.mjs install
```

Lệnh này **sao lưu** rồi sửa `~/.claude/settings.json`: thêm 13 hook báo sự kiện, hook duyệt quyền, hook trả lời câu hỏi/duyệt kế hoạch, hook ngắt vòng lặp, status line báo hạn mức gói và OpenTelemetry (cho "Cái gì đang ăn gói"). Chạy lại không thêm trùng. Mở lại các phiên Claude Code sau khi cài.

Tuỳ chọn hay dùng:

| Cờ | Ý nghĩa |
| --- | --- |
| `--service` | Tự chạy văn phòng khi đăng nhập Windows (một script trong thư mục Startup) |
| `--lan` | Cho điện thoại cùng wifi xem (có mã PIN) |
| `--no-approve` | Không thêm hook duyệt quyền / câu hỏi |
| `--no-status` | Không đụng status line của bạn |
| `--no-otel` | Không bật OpenTelemetry |
| `--no-panel` | Không cài panel bên cạnh cho VS Code/Cursor/… |

Các lệnh khác:

```bash
node bin/cli.mjs doctor
```

```bash
node bin/cli.mjs uninstall
```

```bash
node bin/cli.mjs pin
```

`doctor` kiểm tra từng bước và nói thiếu gì; `uninstall` gỡ đúng những gì `install` đã thêm; `pin` xem mã PIN điện thoại (`--new` để đổi và đăng xuất mọi điện thoại).

### Nối Codex CLI vào văn phòng

**Không cần cài gì thêm.** Codex không có hệ thống hook như Claude Code, nên văn phòng đọc thẳng các file phiên mà Codex tự ghi (`~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`). Chỉ cần:

1. Codex đã cài và đăng nhập: `npm i -g @openai/codex`, rồi `codex login` (máy này đã có `~/.codex/auth.json`).
2. Văn phòng đang chạy.
3. Mở `codex` trong một thư mục dự án và giao việc như bình thường. Trong vòng ~2 giây một nhân viên có **logo Codex** (vòng tròn nền đen) xuất hiện ở bàn.

---

## 3. Hỗ trợ Codex CLI: có gì và chưa có gì

### Mới thêm

| Tính năng | Chi tiết |
| --- | --- |
| **Nhân viên Codex trong văn phòng** | Mỗi phiên `codex` (TUI, `codex exec`, `codex resume`, cả phiên của tiện ích Codex trong IDE vì chúng ghi chung kiểu file) thành một nhân vật. Tên là `<thư-mục>-<2 ký tự cuối id>`, nguồn ghi "Codex". |
| **Hoạt động trực tiếp** | Prompt của bạn → "Nhận việc"; lệnh shell → Bash (phòng máy); `apply_patch` → Sửa/Tạo file (ngồi gõ); `update_plan` → checklist trên bảng kế hoạch; `view_image` → Đọc; web search → cửa sổ; công cụ MCP → MCP; xong lượt → nghỉ + câu trả lời cuối; lỗi model/hết lượt → thẻ lỗi. |
| **Feed, chat, dòng thời gian, git** | Vì sự kiện Codex đi qua cùng đường với Claude, mọi thứ dựa trên sự kiện đều chạy: feed hoạt động, nhóm chat công ty, dòng thời gian, xem lại, test board, commit/push/CI, sự cố, tủ cúp, tổng kết tuần. |
| **Ngăn hội thoại** | Bấm vào nhân viên Codex → tab Hội thoại đọc lại lời bạn, câu trả lời của Codex và các bước công cụ từ file rollout. |
| **📋 Giao việc bằng Codex** | Trong nhóm chat → 📋 Giao việc → chọn "Cuộc trò chuyện mới trong thư mục…" → hàng nút **Chạy bằng: Claude Code / Codex**. Chọn Codex thì văn phòng chạy `codex exec --json` trong thư mục đó; giao cho một phiên Codex có sẵn thì chạy `codex exec resume <id>` (tiếp đúng hội thoại đó). Thẻ việc hiện từng bước và câu trả lời quay về chat. |
| **Hai định dạng file** | Đọc được cả định dạng cũ (`event_msg/user_message`) và định dạng của Codex 0.1xx (`item_completed` → `UserMessage`, `task_complete` có `error`). Đã kiểm trên Codex 0.166 thật. |
| **Kết thúc phiên** | Phiên rời văn phòng khi file im 30 phút, hoặc im 1 phút mà không còn tiến trình `codex` nào chạy. |
| **Nhiều tài khoản Codex** (có từ trước) | Thẻ hạn mức gói → mục Codex: thêm tài khoản ChatGPT, xem lượt dùng, "Dùng" để đổi tài khoản, tự chuyển khi tài khoản đang dùng hết lượt. |

### Chưa có với Codex (giới hạn của Codex, không phải lỗi)

Các tính năng này cần hook **đồng bộ** của Claude Code (chặn hoặc chờ trước khi chạy lệnh), Codex không có:

- Thẻ **Cho phép / Từ chối** lệnh ngay trong văn phòng (Codex vẫn hỏi trong terminal của nó).
- Ngắt vòng lặp kẹt, cảnh báo hai phiên sửa cùng file, **Hoàn tác lượt cuối**, **Ghi nhớ** sống qua lúc nén, **Chen lời giữa chừng**.
- Thanh ngữ cảnh/chi phí và "Cái gì đang ăn gói" (chỉ đọc số liệu Claude Code).
- Giao việc bằng `codex exec` không hỏi duyệt: nó chạy với `--sandbox workspace-write` (được ghi trong thư mục dự án, không ra ngoài). Đổi bằng biến `OFFICE_CODEX_EXEC_ARGS`.

### Biến môi trường cho Codex

| Biến | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `CODEX_HOME` | `~/.codex` | Nơi Codex lưu đăng nhập và phiên |
| `OFFICE_CODEX_SESSIONS` | bật | `0` để tắt việc đưa phiên Codex vào văn phòng |
| `OFFICE_CODEX_BIN` | tự tìm | Đường dẫn chương trình codex (`codex.exe` hoặc `codex.js`) |
| `OFFICE_CODEX_EXEC_ARGS` | `--sandbox workspace-write` | Cờ thêm cho `codex exec` khi giao việc, ví dụ `--sandbox read-only` hoặc `-m gpt-5-codex` |
| `OFFICE_CODEX_PROCS` | bật | `0` để không dò tiến trình codex (khi đó phiên chỉ rời sau 30 phút im) |

---

## 4. Toàn bộ chức năng

### 4.1 Văn phòng 3D và 2D

- **Mỗi phiên là một nhân vật**, hai kiểu dáng (A Đồ chơi / B Pixar). Đọc file → thư viện, sửa → ngồi gõ, chạy lệnh → phòng máy, tra web → cửa sổ, deploy → phóng tên lửa. Màn hình trên bàn hiện đúng việc đang làm.
- **Hai kiểu văn phòng** (Cài đặt → Văn phòng): *Ấm cúng* (một phòng mở) và *Chuyên nghiệp* (cả tầng 22 × 17 m: phòng giám đốc, phòng họp kính, thư viện, phòng máy chủ, sảnh lễ tân, pantry, khu thư giãn). Kiểu *Tập đoàn* (Trụ sở) thêm 4 phòng ban, trong đó có Phòng AI 15 Agent DEV (tổng 52 bàn). Thử nhanh: `?layout=pro`, `?layout=cozy`.
- **Khu theo dự án**: mỗi repo git có cụm bàn và thảm màu riêng, biển "Nhóm …".
- **Giám đốc là bạn**: việc bạn giao được mang tới bàn; xong việc nhân viên lên báo cáo.
- **Sếp và trợ lý**: khi Claude gọi subagent, các trợ lý vào nhận việc và đi tới đúng chỗ làm, có đường nét đứt nối với sếp.
- **Giao diện 2D** (nút 3D | 2D, hoặc `?view=2d`): mỗi phiên một dòng, nhẹ máy, lệnh chờ duyệt nằm trên cùng.
- **Đồ vật bấm được**: rê chuột để xem tên, bấm để mở thẻ "agent đã làm gì ở đây" (thư viện: file vừa đọc, máy in: commit, bệ phóng: deploy…).
- **Đồ hoạ**: Tự động / Thấp / Vừa / Cao (Cài đặt → Hiển thị). **Thời tiết thật** theo thành phố (Open-Meteo, mặc định tắt). Ngày/đêm theo giờ, cảnh nền thành phố/đồng quê/biển.

### 4.2 Đời sống văn phòng (cho vui, theo dữ liệu thật)

Ngủ trưa 12:30–13:30 · giao ban 9:00 thứ Hai · trà chiều 16:00 thứ Sáu · cơm nhà và hàng chờ lò vi sóng · trực nhật · diễn tập PCCC mỗi quý · bàn thờ Thần Tài (mùng 1, rằm) · lịch nghỉ lễ/làm bù của Việt Nam · bida, bi lắc, game, karaoke khi rảnh · lễ tân, bảo vệ, shipper · tiệc chia tay dự án lâu không mở · thực tập sinh lên chính thức · về nhà khi khuya · đắp chăn khi nghỉ lâu · đập bàn khi lỗi liên tục · **Hết lượt Claude**: người của tài khoản đó đi nghỉ, bảng đếm ngược tới khi có lượt lại · **Sự cố**: 3 lỗi trong 5 phút thì văn phòng chuyển đỏ.

### 4.3 Danh sách phiên và ngăn chi tiết

- Cột bên: mỗi phiên có **logo agent** (Claude / Codex), tên chat, thư mục, trạng thái (đang làm / chờ bạn / nghỉ), RAM.
- Bấm một phiên mở **ngăn chi tiết**: việc hiện tại, câu trả lời cuối, checklist, git (nhánh, file chưa commit, CI), ngữ cảnh và chi phí theo giá API, đồng hồ prompt cache (tách cà phê nguội dần).
- Tab **Hội thoại**: markdown, code có nút chép, gom các bước công cụ, gập phần tóm tắt khi nén.
- Tab **Ghi nhớ** (Claude): điều phiên phải nhớ, tự nhắc lại sau khi Claude Code nén hội thoại.
- **↶ Hoàn tác lượt cuối** (Claude): trả các file lượt cuối đã sửa về như cũ.
- **Đổi tài khoản** cho một phiên đang mở (Claude, nhiều tài khoản).
- **Dòng thời gian** (khung Hoạt động): mỗi phiên một hàng tô màu theo việc, số phút chờ bạn.
- **Đến lượt bạn**: chuông khi một phiên xong lúc bạn ở cửa sổ khác; phím **N** nhảy tới phiên đang chờ.

### 4.4 Duyệt quyền, câu hỏi, an toàn (Claude Code)

- **Thẻ Cho phép / Luôn cho phép / Từ chối** khi Claude Code xin quyền (trang đang mở). Không ai bấm trong 45 giây thì Claude Code hỏi như thường. Phím **Y / N / A** trả lời thẻ trên cùng.
- **Lệnh nguy hiểm** (`rm -rf`, force push, `curl | sh`, `sudo`, chữ "prod"…): thẻ đỏ, phải bấm hai lần, không có "Luôn cho phép".
- **Câu hỏi và kế hoạch**: AskUserQuestion / ExitPlanMode hiện thành thẻ có lựa chọn, ô "Khác", nút Duyệt / Sửa tiếp.
- **Lệnh bị chế độ tự động chặn**: thẻ trong chat, có thể cho Claude thử lại.
- **Ngắt vòng lặp kẹt**: cùng lệnh lỗi y hệt 3 lần thì lần 4 bị chặn, Claude được nhắc đổi cách.
- **Hai phiên cùng sửa một file / giành cổng**: phiên sau được nhắc trước khi ghi đè.
- Bí mật (token, khoá API) bị che trước khi lưu hay hiển thị; mọi thao tác tắt/dọn/duyệt ghi vào `data/actions.log`.

### 4.5 Nhóm chat công ty và giao việc

- **Nhóm chat** (nút trên thanh trên cùng), kiểu Zalo: nhân viên nhắn về việc thật (xong task, commit, push, CI đỏ, hết lượt…), có bình chọn, nhắc hẹn, thả cảm xúc.
- **Gửi tới**: nhắn thẳng cho một cuộc trò chuyện; tin đầu tạo nhánh mới của hội thoại, tin sau nối tiếp (6 giờ).
- **📋 Giao việc**: chọn cuộc trò chuyện hoặc thư mục, gõ hoặc **nói** (🎤), đính ảnh. Với thư mục mới: chọn **Claude Code** hoặc **Codex**. Thẻ việc hiện từng bước, nút Dừng, câu trả lời về chat.
- **💬 Chen lời** (Claude): nhắn vào phiên đang làm, Claude đọc sau bước hiện tại.
- **Lệnh nhanh**: nút điền sẵn prompt hay dùng (chạy test, commit và push…), sửa được, ⭐ lưu câu đang gõ.
- **Trợ lý soạn prompt**: nhắc những chỗ hay khiến AI hỏi lại; **✨ Viết lại cho rõ** dùng một model nhỏ.
- **"Sửa luôn" khi CI đỏ**: thẻ có link lần chạy hỏng, bấm là giao cho AI sửa.

### 4.6 Gói, tài khoản, chi phí

- **Viên hạn mức**: hạn mức 5 giờ và tuần của từng CLI đã chọn (Claude, Codex), tô màu theo mức cao nhất (xem mục 0).
- **Cái gì đang ăn gói**: chi phí theo model, MCP, skill, plugin, subagent, dự án, phiên (từ OpenTelemetry của Claude Code).
- **Nhiều tài khoản Claude**: thêm tài khoản (mở trang đăng nhập), "Dùng" để phiên mới chạy bằng nó, tự chuyển khi hết lượt.
- **Nhiều tài khoản Codex** và **Antigravity IDE**: cùng thẻ, mỗi công cụ một mục.
- **Model người điều phối và subagent** (Cài đặt → Khác).

### 4.7 Bảng máy (viên "Máy Mac", chạy cả trên Windows)

RAM, swap, CPU, ổ đĩa; danh sách dev server đang chạy (tắt được), phiên AI đang rảnh tốn RAM, app nặng, cache có thể dọn. Mục **Việc bỏ quên**: worktree và repo còn file chưa commit, commit chưa push, stash. Nút tắt kiểm lại PID **và giờ khởi động** để không tắt nhầm. (Trên Windows không có: đưa cửa sổ IDE lên trước, thoát app, icon thanh menu — các phần đó chỉ có trên macOS.)

### 4.8 Lịch sử, báo cáo, xem lại

- **Kho lịch sử**: giữ phần chữ của mọi hội thoại Claude Code trong `data/vault` kể cả sau khi Claude Code xoá (30 ngày); tìm có dấu hoặc không dấu.
- **Phiếu điểm prompt hằng tuần** (`?vault=report`): bao nhiêu % prompt đủ rõ, thói quen tốn lượt.
- **Xem lại**: tua 1 giờ / 3 giờ / hôm nay / hôm qua ở ×10–×120; **Quay video** MP4 (Chrome).
- **Tổng kết tuần**: thẻ ảnh 7 ngày để đăng mạng. **Tủ cúp**: cột mốc 1.000 việc, 10.000 lần sửa…
- **Chế độ chụp ảnh** (phím **P**): PNG tới 4K; **Clip 15 giây** vuông hoặc dọc 9:16 với nhạc lo-fi tự soạn.
- **Chế độ quay màn hình**: làm mờ lệnh, đường dẫn, nội dung hội thoại.

### 4.9 Git và CI

Bàn bừa dần theo số file chưa commit; commit → máy in in một trang, thư vào hộp thư; push → tên lửa; tag phiên bản → 4 người ra chụp ảnh; CI đỏ (đọc bằng `gh` đã đăng nhập) → thông báo đỏ và thẻ "Sửa luôn". Áp dụng cho cả phiên Claude lẫn Codex.

### 4.10 Điện thoại

Trên điện thoại giao diện tự xếp như app (5 mục: Văn phòng · Phiên · Hoạt động · Duyệt · Chat). Mặc định chỉ máy này mở được. Muốn xem bằng điện thoại cùng wifi: chạy với `--lan` (hoặc bật trong cửa sổ Điện thoại), quét QR, nhập **PIN 6 số**. Duyệt lệnh và giao việc từ điện thoại chỉ khi bạn bật trên máy. Có thông báo đẩy (Web Push).

### 4.11 Panel trong trình soạn thảo

`install` cài một panel nhỏ (trang `/panel`) vào thanh bên của VS Code, Cursor, Windsurf, Antigravity…: số phiên đang làm / chờ, hạn mức Claude, Codex, Antigravity.

### 4.12 Địa chỉ và phím tắt hữu ích

| Địa chỉ | Ý nghĩa |
| --- | --- |
| `/?demo` | Văn phòng mẫu, không cần AI |
| `/?view=2d` | Mở thẳng giao diện 2D |
| `/?layout=pro` · `/?layout=cozy` | Thử kiểu văn phòng một lần |
| `/?lang=vi` | Xem một lần bằng tiếng Việt |
| `/?chat` | Mở nhóm chat |
| `/?vault=report` | Phiếu điểm prompt |
| `/panel` | Trang gọn (cho panel IDE) |

Phím: **N** phiên đang chờ bạn · **O** mở cửa sổ phiên (macOS) · **P** chế độ chụp ảnh · **Y / N / A** trả lời thẻ duyệt.

---

## 5. Những gì đã sửa trong source

| File | Thay đổi |
| --- | --- |
| `server/codex-sessions.mjs` (mới) | Đọc file rollout của Codex, đổi thành sự kiện kiểu hook Claude (định dạng cũ và 0.1xx), đọc hội thoại cho ngăn chi tiết, phát hiện phiên kết thúc. |
| `server/index.mjs` | Gắn module Codex vào `onHook`; phiên Codex có `agent: 'codex'` (logo), tên theo đuôi id; không bị xoá sau 10 phút im như phiên chỉ có hook; ngăn Hội thoại đọc từ rollout; giao việc chọn được Codex. **Sửa lỗi Windows**: tìm `codex` và `claude` cài qua npm (chỉ có `.cmd` trên PATH); đường dẫn `~\…` không được mở rộng khi giao việc. |
| `server/tasks.mjs` | Thêm chạy `codex exec --json` / `codex exec resume <id>`, đọc luồng JSON (bước, câu trả lời, lỗi). |
| `bin/cli.mjs` | **Sửa lỗi Windows**: `import()` server bằng URL `file://` (trước đó `node bin/cli.mjs` báo lỗi `Received protocol 'e:'`). |
| `src/office/ui/task-sheet.js` | Nút **Chạy bằng: Claude Code / Codex** khi giao việc cho thư mục mới; phiên Codex ghi "Codex ·". |
| `src/i18n/locales/{vi,en}/chat.js` | Chữ cho nút mới và lỗi "không tìm thấy Codex". |
| `tests/unit/codex-sessions.test.mjs` (mới) | 5 test: đổi tên công cụ, mã thoát, hai định dạng file, kết thúc phiên. |
| `docs/ARCHITECTURE.md` | Thêm dòng mô tả module mới. |
| `src-tauri/` (mới) | App desktop Tauri v2: mang theo Node và server, tự bật server khi mở app và tắt cả cây tiến trình khi đóng, có trang chờ và báo lỗi kèm đường dẫn log. |
| `scripts/build-desktop.mjs` (mới) | Chuẩn bị tài nguyên cho app (`.desktop/office`, `.desktop/node`). Thêm script `desktop:prepare` / `desktop:dev` / `desktop:build`. |
| `server/setup.mjs`, `src/office/ui/setup.js`, `src/styles/setup.css`, `src/i18n/locales/*/setup.js` (mới) | Màn hình lần đầu: chọn Claude / Codex / cả hai, cài CLI còn thiếu qua npm, nối hook, nút đăng nhập. API: `GET/POST /api/setup`, `POST /api/setup/login` (chỉ máy này). |
| `src/office/ui/mac-drawer.js`, `ai-accounts.js` | Viên hạn mức hiện **Claude và Codex** (5 giờ · tuần) theo CLI đã chọn. Bảng hạn mức chỉ còn tab của CLI đã chọn. |
| `server/index.mjs` | Lưu lựa chọn CLI (`prefs.agents`); chỉ theo dõi phiên Codex khi đã chọn Codex; giao việc chỉ đưa ra CLI đã chọn. Trên Windows/Linux, khi chưa đăng nhập Claude CLI thì báo đúng lý do (trước đó nhắc tới "Keychain"). |
| `server/data-dir.mjs` | Trong app (có file `.office-app`), dữ liệu lưu ở `~/.my-office`. |
| `bin/cli.mjs`, `server/bg-sessions.mjs` | **Sửa lỗi Windows nghiêm trọng**: hook trước đây là một chuỗi lệnh cần Git Bash. Không có Git Bash, Claude Code chạy nó bằng PowerShell, và hook chặn lỗi đó chặn **mọi** công cụ. Giờ trên Windows hook dạng `command` + `args` (Claude Code chạy thẳng Node, không qua shell). Status line dùng đường dẫn ngắn nên chạy được cả trong Git Bash lẫn PowerShell. `install` tự thay hook kiểu cũ; `doctor` cảnh báo nếu còn. Đọc được `settings.json` có BOM. |
| `server/agent-models.mjs` (mới), `server/tasks.mjs`, `src/office/ui/task-sheet.js` | Giao việc hai bước: bước 2 chọn CLI, model, effort. Model của Claude là danh sách cố định; model và effort của Codex đọc từ `models_cache.json`. Server kiểm tra model/effort trước khi truyền (`--model`/`--effort` cho Claude, `-m`/`-c model_reasoning_effort` cho Codex), cho cả `claude -p`, phiên nền và `codex exec`. |
| `server/memory.mjs` (mới), `src/office/ui/memory-view.js` (mới) | Bộ nhớ phiên: ghi khi phiên kết thúc, đọc khi phiên bắt đầu. Route `POST /hook/memory` (hook `SessionStart`), `GET/POST /api/memory`. `install` thêm hook bộ nhớ (`--no-memory` để bỏ), `doctor` kiểm tra hook này. Tắt bằng nút trong cửa sổ bộ nhớ hoặc biến `OFFICE_MEMORY=0`. |
| `src/office/ui/guide.js`, `src/styles/guide.css`, `src/i18n/locales/*/guide.js` (mới) | Chị Mai, nhân viên hướng dẫn: 14 chủ đề, ô hỏi (tìm không cần dấu), nút "Làm giúp tôi". |
| `src/i18n/…`, `first-person.js`, `photostrips.js` | Thêm đủ chữ Việt/Anh cho mọi phần mới; bỏ chữ viết cứng ("Bạn", "4 khung", biển phòng chụp ảnh) để đổi theo ngôn ngữ. |
| `server/team.mjs`, `src/office/ui/team-sheet.js`, `src/i18n/locales/*/team.js` (mới) | Đội AI 15 agent: CEO giao cho PM/CTO, 5 bước và vòng sửa lỗi, báo cáo theo từng bước, theo dõi trực tiếp, nút dừng. API `GET/POST /api/team`, `POST /api/team/stop`. |
| `server/memory-file.mjs` | File nhớ bền vững và khối hướng dẫn chung trong `CLAUDE.md`/`AGENTS.md`; nhật ký mới tách ra `SESSION-LOG.md`, INDEX/STATE thuộc agent. |
| `server/setup.mjs` | **Sửa lỗi "Claude chưa đọc được"**: kiểm tra đăng nhập bằng `claude auth status` (trước đó coi có `.credentials.json` là đã đăng nhập, nên ẩn mất nút đăng nhập); nút đăng nhập chạy `claude auth login`; đăng nhập xong thì đọc lại hạn mức ngay. |
| `src/office/ui/expand.js` (mới) | Văn phòng tự mở rộng thành Trụ sở khi hết bàn hoặc khi đội AI làm việc. |
| `src/office/world/layout.js`, `world/desks.js`, `people/navigation.js`, `world/pro/wing.js`, `net/live.js`, `src/shared/team-roles.js` | Phòng AI 15 Agent DEV: 4 cụm bàn (16 bàn), biển tên vai trò trên từng bàn, đường đi riêng, mỗi vai trò một bàn cố định; số bàn của mỗi phòng tính theo số cụm bàn. Sửa lỗi màu áo ở các bàn từ số 12 trở lên. |
| `people/workers.js`, `people/outings.js`, `life/nap.js` | Người rảnh không ngủ: ra phòng nghỉ (điện thoại, sách) hoặc lái xe máy dạo một vòng rồi quay về. |
| `interact/first-person.js`, `world/backdrops/street-life.js` | Hóa thân lái xe máy và ô tô VinFast VF3: ga, phanh, lùi, lái, tăng tốc, va chạm, xuống xe và đỗ tại chỗ. |
| `server/index.mjs`, `ui/activity.js`, `ui/camera-bar.js` | Nhân sự của đội mang tên vai trò ngay khi phiên xuất hiện (khớp theo thư mục với bước đang chạy); nhãn "Đội AI"; nút camera "Phòng AI"; tên thư mục trên Windows hiện đúng. |

Kiểm tra đã chạy: `node --test` (181 test: 174 đạt, 0 lỗi, 7 bỏ qua do cần công cụ macOS/unzip), `npx eslint .`, `npx tsc --noEmit`, `next build`, `tauri build`. Chạy thật: giao việc cho Codex với GPT-5.6-Luna và effort Thấp (đúng `-m`/`-c model_reasoning_effort`); bộ nhớ được ghi khi việc xong; lần giao sau Codex trả lời đúng điều đã ghi trong bộ nhớ; hook `SessionStart` trả bộ nhớ cho Claude Code; chị Mai và màn hình giao việc hiển thị đủ bằng cả tiếng Việt lẫn tiếng Anh.

---

## 6. Xử lý sự cố

| Hiện tượng | Cách xử lý |
| --- | --- |
| Mọi lệnh của Claude Code bị chặn với lỗi "Git Bash wasn't found" | Hook kiểu cũ từ bản trước. Chạy lại `node bin/cli.mjs install` (hoặc chọn lại CLI trong app) để thay bằng hook mới. Muốn gỡ hẳn: `node bin/cli.mjs uninstall`. Nếu PowerShell báo không có `node`, gọi bằng đường dẫn đầy đủ: `& "C:\Program Files\nodejs\node.exe" bin/cli.mjs uninstall`. |
| App mở ra báo lỗi server | Xem `%USERPROFILE%\.my-office\app-server.log`. Hay gặp nhất: cổng 4310 đang bị một chương trình khác (không phải DT Office) dùng. |
| Hạn mức Claude "chưa đọc được" | Claude Code CLI chưa đăng nhập: bấm **Đăng nhập Claude Code** trong Cài đặt → Chọn CLI kết nối, hoặc chạy `claude` trong terminal. Chỉ gói Pro/Max mới có hạn mức. |
| Hạn mức Codex trống | Codex chưa đăng nhập bằng tài khoản ChatGPT (`codex login`). Đăng nhập bằng API key thì không có hạn mức gói. |
| Không thấy phiên Claude | Chạy `node bin/cli.mjs install` rồi mở lại phiên Claude Code; `node bin/cli.mjs doctor` để xem thiếu hook nào. |
| Không thấy phiên Codex | Kiểm tra có file trong `%USERPROFILE%\.codex\sessions\<năm>\<tháng>\<ngày>\`; nếu bạn đặt `CODEX_HOME` khác thì server cũng phải chạy với biến đó. Log server in dòng `codex sessions: watching …`. |
| Phiên Codex biến mất ngay | Văn phòng không thấy tiến trình codex nào; chạy với `OFFICE_CODEX_PROCS=0` để chỉ dựa vào thời gian im. |
| Giao việc Codex báo "không tìm thấy Codex CLI" | `npm i -g @openai/codex`, hoặc đặt `OFFICE_CODEX_BIN` trỏ tới `codex.exe` / `codex.js`. |
| Giao việc Codex báo 401 | Codex chưa đăng nhập trong `CODEX_HOME` đó: chạy `codex login`. |
| Cổng 4310 bận | Đặt `OFFICE_PORT` khác (nhớ chạy lại `install` để hook trỏ đúng cổng). |
| Sửa code xong | Tắt server (Ctrl+C) rồi chạy lại; sửa phần trang (`src/`, `app/`) thì xoá `.next/` hoặc chạy `npx next build` trước. Khi phát triển: `node server/index.mjs --dev` (tự nạp lại, xem ở `/?demo`). |

---

## 7. Phát triển

```bash
npm ci
```

```bash
node server/index.mjs --dev
```

```bash
npx eslint . ; npx tsc --noEmit ; node --test tests/unit/
```

```bash
npx next build
```

Bản đồ module chi tiết: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). README gốc: [README.vi.md](README.vi.md).
