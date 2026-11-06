# Bộ nhớ bền vững · My Office

## Cốt lõi (đọc khi bắt đầu phiên hoặc mất ngữ cảnh)

- Ngữ cảnh dùng chung trong repo, không gắn tài khoản Claude/Codex. Đọc INDEX.md, STATE.md và phần này trước; lịch sử chỉ tra khi cần.
- Code xác nhận hành vi; tài liệu là bản đồ. Xem git status/diff trước khi sửa, không ghi đè thay đổi của phiên khác.
- Mọi chữ hiển thị qua i18n, đủ vi/en. React chủ yếu dựng markup; engine JS thao tác DOM id và chạy setup theo thứ tự trong src/office/main.js.
- 3D: dispose tài nguyên khi bỏ nhân vật, không merge vật động; xem ARCHITECTURE khi sửa collision/render.
- Windows: hook Claude dùng command + args, tránh chuỗi phụ thuộc Git Bash. Kiểm tra đăng nhập CLI bằng claude auth status; đăng nhập desktop là riêng.
- Đội AI: TEAM_SEATS trong src/shared/team-roles.js phải khớp ROLES ở server/team.mjs. Mỗi vai trò là một phiên riêng chỉ làm việc của mình; PM phân công bằng dòng ROLES:. plan/design song song, build/fix/verify/ship lần lượt (tránh sửa đè). Verify: một FAIL là sửa, tối đa 2 vòng; ship chỉ push/publish khi mục tiêu yêu cầu; lượt dừng giữa chừng thì resume.
- Đội AI Agent (từ 04/11/2026): server/team.mjs có TEAMS (`dev` = Đội AI Agent Dev; từ 06/11 `marketing` = 18 vị trí MARKETING_ROLES, lead `cmo` nhận việc và phân công bằng ROLES:, chỉ tạo file ở marketing/<run>/; không thuộc TEAM_SEATS; phòng 3D = DEPTS[0]+DEPTS[2] `mk`, bàn theo MARKETING_SEATS) và routeTeams; hướng dẫn viên (ui/guide-work.js) hỏi dự án rồi chọn đội, nhiều đội chạy lần lượt. Nhân sự dùng chung mọi task: đang làm task khác thì job `held`, build/fix cùng dự án chờ nhau. 15 resident luôn ở phòng AI; được gọi thì tới bàn giám đốc nhận việc (people/team-brief.js, theo job.at trong 90 s); không ra ngoài. Dự án do người dùng thêm/bỏ qua /api/projects (bỏ = ẩn, phiên không tự thêm lại).
- Nhân sự chuyên trách (server/specialists.mjs): đọc báo (PDF in bằng Edge/Chrome headless từ bao-cao.html) và edit video (skill ở server/skills/video, ffmpeg). Mỗi việc một phiên CLI với tasks `args` riêng; role news/video ngồi ở thư viện, không lấy bàn. Bản cài Windows + macOS Universal build bằng workflow Desktop release khi đẩy tag v<version>.
- Hiện diện đội AI: roster từ TEAM_SEATS độc lập sessions; live HQ có residents theo role với ID `team-role:<role>`, không alias vào workers/npcs. Dùng workerForSession và parentSessionId thật cho subagent/thao tác; chỉ snapshot/batch live đã đồng bộ mới xác nhận Chờ việc. Demo/replay không có roster live. Bố cục: URL hợp lệ → saved hợp lệ → HQ, không tự migrate Pro/Cozy.
- Thử server ở cổng 4311 với OFFICE_DATA_DIR riêng. Không tắt app người dùng ở cổng 4310.
- Kiểm tra theo phạm vi; trước bàn giao thay đổi code chạy lint/typecheck, test liên quan; trước commit cần đủ bộ kiểm tra dự án và build.
- Bộ nhớ có ba lớp: INDEX định vị, STATE bàn giao, MEMORY giữ quyết định lâu dài. Giữ INDEX/STATE khoảng 100 dòng; nhiều việc dùng state/<mã-nhiệm-vụ>.md và liên kết từ STATE.
- Không ghi credential hay hội thoại nguyên văn vào các file ngữ cảnh. Không tự nạp SESSION-LOG.md/history; không sửa các khối office-log.
- Khi hoàn tất, cập nhật STATE; chỉ bổ sung kiến thức bền vững vào phần này. Không nối nhật ký công việc sau mỗi lượt vào MEMORY.
- 04/11/2026 · Codex: nhật ký tự sinh mới chuyển sang SESSION-LOG.md; phần nhật ký cũ dưới đây được giữ nguyên. INDEX/STATE do agent quản lý, writer không ghi đè.

- DT Office phát hành tại `trancaodai1651/DTOffice`; lịch sử nguồn bắt đầu lại từ v0.4.5, không đưa branch/tag cũ trở lại. Giữ LICENSE MIT và định danh dữ liệu/hook cũ khi đổi thương hiệu. Version package/Tauri/Cargo phải khớp tag; release notes theo `docs/RELEASE-<version>.md`.
- Từ 0.4.8: `personnelName`/`session-name.js` là tên nhân sự ổn định theo agent + sid, title chat chỉ là ngữ cảnh; resident giữ tên vai trò. Codex Bot là cửa sổ native `codex-bot` trong `src-tauri/loading/bot.html`, không dựng lại trong cảnh 3D. Trò chơi giữ chore đến kết quả thật; `gameWorkPending` phân biệt việc/duyệt quyền với hành động nghỉ. Đóng gói build cách ly bằng `OFFICE_DIST_DIR`; bản cài luôn mang thư mục `.next`.
- Từ 0.4.9: yêu cầu đọc tin qua guide/task/chat dùng `specialist-request.js` trước luồng DEV; nhân sự chuyên trách gắn task/SID lưu bền, SID chính xác ưu tiên thư mục và tên vai trò không theo chat title. Xe NPC/xe người lái dùng chung `traffic-space.js`; cột đèn theo `street-fixtures.js`, tránh nhân bản lịch đặt cột ở tree/wire. PC GPU thật Auto tối thiểu Medium, điện thoại/tablet vẫn thích ứng riêng.

- Từ 0.4.10: skill theo role lưu ngoài repo ở data-dir/role-skills.json, gắn lúc launch việc mới; không tự sửa việc đang chạy. USD/VND dùng `api-money.js`, tỷ giá minh họa có chỉnh; giá API Codex quy đổi không phải tiền thuê bao. Bida dùng `leisureSession` của resident đã đồng bộ, bật roaming trong ván và tắt sau khi về bàn. Bot nổi đếm cả Claude/Codex.

- Từ 0.4.11: bộ cài mang FFmpeg/ffprobe ở `office/vendor/ffmpeg/<platform-arch>`, Mac có hai CPU; verifier phải render clip thật. `video-tools.mjs` tải HTTPS bằng OS CA và render manifest/ffprobe, không tự động hóa Chrome. Video thiếu/hỏng không done. Từ 0.4.12 caption qua Sharp/Pango + overlay, không dựa vào drawtext (FFmpeg Intel upstream không có filter này). `/api/team` có `role` = giao riêng một người; không role = cả đội. Prompt nội bộ/skill dài gửi stdin, không cắt 4000 như văn bản người dùng.

- Từ 0.4.13: desktop updater native `src-tauri/src/updates.rs`, IPC chỉ main/local; GitHub Releases `latest.json` + EXE/tar `.sig`, requireSignedVersion. Giữ nguyên updater public key trong config và private key ở `~/.dtoffice-release/updater.key`/GitHub Actions secret `TAURI_SIGNING_PRIVATE_KEY` (không ghi nội dung vào repo). Mac phải dùng nguyên archive do Tauri ký, không tar lại. UI `ui/updates.js`; trước cài chờ owned tasks/team/specialists qua update-readiness, dừng Node do app sở hữu trong before-exit hook.

- Từ 06/11 (sau 0.4.13): Marketing 21 vị trí (+creator, librarian, photo; nhóm `massets`), giai đoạn `mpublish` (social sau review), giai đoạn không ai cần thì bỏ qua. Skill dựng sẵn ở `server/skills/marketing/` chèn vào prompt; kho + tài khoản qua `createTeam({ context })`. Kho dữ liệu `server/asset-library.mjs` là workspace Marketing khi không có dự án. Tài khoản MXH = hồ sơ Edge/Chrome riêng ở data-dir/social-profiles (không lưu mật khẩu); agent không bao giờ tự đăng/đăng nhập, CEO bấm Đăng. Phòng Kho = DEPTS[1] `kho`, bàn theo `KHO_SEATS`; `MARKETING_ROSTER` phải khớp nhóm ở server.

- Từ 0.4.14: chọn role pm/cto/cmo = giao quản lý phân công cả phòng, không chạy direct; các role khác vẫn direct.
  `/api/tasks` nhận assignment dev/marketing/session, giữ CLI theo SID gốc và model/effort; không đóng hội thoại để giao đội.
  `cli-environment.mjs` chỉ bỏ nested-session flags, giữ auth/provider/account; auth probe lỗi/không hỗ trợ = unknown,
  bắt cả lỗi spawn đồng bộ. E2E dùng fake CLI/home riêng, không suy ra máy thật chưa đăng nhập từ môi trường thử.

- Từ 0.4.15: 2D nhúng roster 38 vị trí (Dev15/Marketing21/news/video), giao việc và mở SID thật; chưa làm thì không tạo phiên giả. `role-training.mjs` đọc `skills/{dev,marketing,specialists}/` và chèn mặc định trước skill cá nhân lúc launch. `lite.js` lazy import panel giao việc để tránh chu kỳ core/env. Hướng dẫn viên không boot; guide.css còn dùng chung form chuyên trách. Chế độ `office-stream` gây làm mờ, có banner giải thích và nút tắt.

- Kho có thể chuyển giữa Windows/Mac/Linux: post media chỉ dùng đường dẫn tương đối; kiểm cả path.posix/path.win32 và loại drive-relative C:x, không chỉ path.isAbsolute của host. Fixture đa hệ ở unit/asset-library.

## Tra cứu theo nhu cầu




- [Chỉ mục](INDEX.md) · [Trạng thái bàn giao](STATE.md) · [Bản đồ chức năng](../docs/FEATURE-MAP.md).
- [Ghi chú cũ, giữ nguyên](history/AGENT-NOTES-2026-11-04.md): các phiên setup, phòng AI, kiểm tra memory và tư vấn.
- [Nhật ký tự động mới](SESSION-LOG.md): metadata phiên/file, không sao chép prompt/câu trả lời.
- Khối nhật ký cũ bên dưới được giữ nguyên để tương thích; không cần đọc mặc định.

<!-- office-log:start -->
## Nhật ký phiên (My Office tự ghi)

_Mới nhất ở trên. Ghi khi mỗi phiên kết thúc: ai làm, dùng CLI và model nào, được giao gì, đã sửa gì, kết quả._

_Chưa có phiên nào kết thúc ở dự án này._
<!-- office-log:end -->
