# DT Office

[English](README.md) · Tiếng Việt

DT Office là văn phòng 3D chạy trên máy cá nhân cho Claude Code và Codex. Mỗi phiên làm việc xuất hiện như một nhân viên: bạn theo dõi tiến độ, giao việc cho đội AI, duyệt quyền và lưu ngữ cảnh chung của dự án.

Mã nguồn, bản cài và nơi báo lỗi: **[trancaodai1651/DTOffice](https://github.com/trancaodai1651/DTOffice)**.

## Tải ứng dụng

Mở **[GitHub Releases](https://github.com/trancaodai1651/DTOffice/releases/latest)** và chọn:

| Nền tảng | File |
| --- | --- |
| Windows x64 | `DT.Office_<phiên-bản>_x64-setup.exe` |
| macOS 13 trở lên · Intel và Apple Silicon | `DT.Office_<phiên-bản>_universal.dmg` |
| macOS · ứng dụng nén | `DT-Office-macos-universal.app.tar.gz` |

App có sẵn Node.js và server. Bạn cần đăng nhập riêng Claude Code hoặc Codex; màn hình thiết lập hỗ trợ cài và kết nối CLI. Windows cài cho tài khoản hiện tại. macOS ký ad-hoc, chưa notarize. Mỗi release kèm `SHA256SUMS.txt` để kiểm tra file tải xuống.

Dữ liệu desktop tiếp tục nằm tại `~/.my-office` (Windows: `%USERPROFILE%\.my-office`) để giữ thiết lập, bộ nhớ dự án và lịch sử khi nâng cấp.

## Chức năng

- Theo dõi phiên Claude Code và Codex trong văn phòng 3D hoặc giao diện 2D gọn.
- Giao việc bằng CLI, model và mức suy luận đã chọn.
- Đội AI 15 vai trò, mỗi vai trò làm việc trong một phiên riêng.
- Bộ nhớ dự án gồm chỉ mục, trạng thái bàn giao và quyết định bền vững.
- Duyệt yêu cầu quyền, xem hoạt động phiên và hạn mức sử dụng.
- Theo dõi RAM, CPU, ổ đĩa và dev server trên máy.
- Panel IDE, menu bar macOS và giao diện điện thoại.
- Giao diện tiếng Việt và tiếng Anh.

## Chạy từ mã nguồn

Cần Node.js **20.9+**, npm, Git và tài khoản CLI AI muốn sử dụng.

```sh
git clone https://github.com/trancaodai1651/DTOffice.git
cd DTOffice
npm ci
npm run build
node bin/cli.mjs install
node bin/cli.mjs start
```

Mở **http://localhost:4310**. Xem dữ liệu mẫu tại **http://localhost:4310/?demo**. Khi chạy từ mã nguồn, dữ liệu nằm trong thư mục `data/` đã được loại khỏi Git.

Phát triển bằng `npm run dev`. Kiểm tra kết nối bằng `node bin/cli.mjs doctor`; thêm `--service` vào lệnh `install` để chạy cùng máy; gỡ tích hợp bằng `node bin/cli.mjs uninstall`.

## Kiểm tra và đóng gói

```sh
npm run lint
npm run typecheck
npm test
node scripts/module-map.mjs --check
npm run build
npm run smoke
```

Windows cần Rust và bộ công cụ build Tauri cho Windows:

```sh
npm run desktop:prepare
node scripts/verify-desktop.mjs
npx tauri build --bundles nsis
```

macOS Universal phải build trên máy macOS, với cả hai Rust target:

```sh
rustup target add aarch64-apple-darwin x86_64-apple-darwin
npm run desktop:prepare -- --universal
node scripts/verify-desktop.mjs
npx tauri build --target universal-apple-darwin --bundles app,dmg
```

[Workflow phát hành](.github/workflows/desktop-release.yml) build Windows/macOS, kiểm tra server đóng gói trên Mac Intel và Apple Silicon rồi đưa bản cài cùng checksum lên GitHub. Tag phát hành phải khớp phiên bản trong package, Tauri và Cargo.

## Tài liệu

- [Hướng dẫn sử dụng đầy đủ](HUONG-DAN.md)
- [Đóng góp](CONTRIBUTING.md)
- [Bản đồ chức năng](docs/FEATURE-MAP.md) · [Kiến trúc](docs/ARCHITECTURE.md)
- [Chỉ dẫn agent](AGENTS.md) · [Chỉ mục bộ nhớ](.ai-office/INDEX.md)
- [Báo lỗi và đề xuất](https://github.com/trancaodai1651/DTOffice/issues)

## Giấy phép

[MIT](LICENSE). Giữ các thông báo bản quyền và điều khoản bắt buộc theo giấy phép.
