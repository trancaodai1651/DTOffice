// DT Office as a desktop app: a window on the office's own server. The app ships the office (resources/office: its
// server, hooks and built page, with a .office-app file so its data lives in ~/.my-office) and a Node to run it
// (resources/node). Opening the app starts the server unless one already answers on the port (`my-office` started by
// hand, the login service): then the window just shows that one. Closing the app stops the server it started.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::io::{Read, Write};
use std::net::TcpStream;
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;

use tauri::{Manager, RunEvent, Url, WindowEvent, PhysicalPosition};

fn office_port() -> u16 {
    std::env::var("OFFICE_PORT").ok().and_then(|p| p.parse::<u16>().ok()).filter(|p| *p > 0).unwrap_or(4310)
}

struct Server(Mutex<Option<Child>>);
struct BotHidden(Mutex<bool>);

fn bot_preference(app: &tauri::AppHandle) -> Option<PathBuf> {
    app.path().app_config_dir().ok().map(|p| p.join("desktop-bot-hidden"))
}

/// Read a small, public status snapshot from our own server. No account/session logs enter the companion.
fn bot_status() -> Result<serde_json::Value, String> {
    let port = office_port();
    let mut stream = TcpStream::connect_timeout(&([127, 0, 0, 1], port).into(), Duration::from_millis(400)).map_err(|e| e.to_string())?;
    stream.set_read_timeout(Some(Duration::from_secs(2))).map_err(|e| e.to_string())?;
    stream.write_all(format!("GET /api/desktop-bot HTTP/1.0\r\nHost: localhost:{port}\r\nConnection: close\r\n\r\n").as_bytes()).map_err(|e| e.to_string())?;
    let mut response = String::new();
    stream.take(65536).read_to_string(&mut response).map_err(|e| e.to_string())?;
    let (head, body) = response.split_once("\r\n\r\n").ok_or("invalid status response")?;
    if !head.starts_with("HTTP/1.1 200") && !head.starts_with("HTTP/1.0 200") { return Err("office unavailable".into()); }
    serde_json::from_str(body).map_err(|e| e.to_string())
}

#[tauri::command]
async fn desktop_bot(app: tauri::AppHandle, window: tauri::WebviewWindow, action: String, x: Option<f64>, y: Option<f64>) -> Result<serde_json::Value, String> {
    let from_bot = window.label() == "codex-bot";
    if !from_bot && (window.label() != "main" || action != "show") { return Err("unsupported companion action".into()); }
    if !from_bot {
        let url = window.url().map_err(|e| e.to_string())?;
        if url.scheme() != "http" || !matches!(url.host_str(), Some("localhost" | "127.0.0.1")) || url.port_or_known_default() != Some(office_port()) {
            return Err("companion control is only available in the local office".into());
        }
    }
    let bot = app.get_webview_window("codex-bot").ok_or("companion unavailable")?;
    match action.as_str() {
        "position" if from_bot => {
            let at = bot.outer_position().map_err(|e| e.to_string())?;
            return Ok(serde_json::json!({ "x": at.x, "y": at.y, "scale": bot.scale_factor().unwrap_or(1.0) }));
        }
        "move" if from_bot => {
            let valid = |n: Option<f64>| n.filter(|n| n.is_finite() && n.abs() < 100_000.0).map(|n| n.round() as i32).ok_or("invalid companion position");
            bot.set_position(PhysicalPosition::new(valid(x)?, valid(y)?)).map_err(|e| e.to_string())?;
        }
        "status" if from_bot => {
            let status = tauri::async_runtime::spawn_blocking(bot_status).await.map_err(|e| e.to_string())??;
            let hidden = *app.state::<BotHidden>().0.lock().map_err(|e| e.to_string())?;
            if status["enabled"].as_bool().unwrap_or(false) && !hidden { bot.show().map_err(|e| e.to_string())?; }
            else { bot.hide().map_err(|e| e.to_string())?; }
            return Ok(status);
        }
        "show" | "hide" => {
            let hidden = action == "hide";
            *app.state::<BotHidden>().0.lock().map_err(|e| e.to_string())? = hidden;
            if let Some(file) = bot_preference(&app) {
                if hidden {
                    if let Some(parent) = file.parent() { let _ = fs::create_dir_all(parent); }
                    let _ = fs::write(file, "hidden");
                } else if file.is_file() { let _ = fs::remove_file(file); }
            }
            if hidden { bot.hide() } else { bot.show() }.map_err(|e| e.to_string())?;
        }
        "open" if from_bot => {
            if let Some(main) = app.get_webview_window("main") {
                let _ = main.unminimize(); let _ = main.show(); let _ = main.set_focus();
                let _ = main.eval("window.dispatchEvent(new Event('office-codex-plan'))");
            }
        }
        _ => return Err("unsupported companion action".into()),
    }
    Ok(serde_json::Value::Null)
}

/// The office answers on the port (its health route), not only something listening there.
fn office_up() -> bool {
    let port = office_port();
    let Ok(mut s) = TcpStream::connect_timeout(&([127, 0, 0, 1], port).into(), Duration::from_millis(400)) else { return false };
    let _ = s.set_read_timeout(Some(Duration::from_secs(3)));
    if s.write_all(format!("GET /api/doctor HTTP/1.0\r\nHost: 127.0.0.1:{port}\r\n\r\n").as_bytes()).is_err() { return false; }
    let mut head = [0u8; 16];
    matches!(s.read(&mut head), Ok(n) if n >= 12 && head.starts_with(b"HTTP/") && &head[9..12] == b"200")
}

/// A path without Windows' `\\?\` prefix (the resource folder comes with it): the office writes its paths into Claude
/// Code's hooks, and a plain `C:\…` is what every program reads.
fn plain(p: PathBuf) -> PathBuf {
    let s = p.to_string_lossy();
    match s.strip_prefix(r"\\?\") {
        Some(rest) if !rest.starts_with("UNC\\") => PathBuf::from(rest),
        _ => p,
    }
}

fn node_exe(res: &PathBuf) -> PathBuf {
    let bundled = res.join("node").join(if cfg!(windows) { "node.exe" } else { "node" });
    if bundled.exists() { bundled } else { PathBuf::from("node") }
}

fn start_server(res: &PathBuf, log_dir: &PathBuf) -> std::io::Result<Child> {
    let office = res.join("office");
    let _ = fs::create_dir_all(log_dir);
    let log = fs::File::create(log_dir.join("app-server.log"))?;
    let mut cmd = Command::new(node_exe(res));
    cmd.arg(office.join("bin").join("cli.mjs"))
        .current_dir(&office)
        .env("NODE_ENV", "production")
        .env("OFFICE_PORT", office_port().to_string())
        .env("NEXT_TELEMETRY_DISABLED", "1")
        .stdin(Stdio::null())
        .stdout(log.try_clone()?)
        .stderr(log);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x0800_0000); // CREATE_NO_WINDOW: no console flashing up beside the app
    }
    cmd.spawn()
}

/// The server and what it started (codex app-server, the tasks' CLIs): the whole tree on Windows.
fn stop_server(child: &mut Child) {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        let _ = Command::new("taskkill").args(["/PID", &child.id().to_string(), "/T", "/F"]).creation_flags(0x0800_0000).status();
    }
    let _ = child.kill();
    let _ = child.wait();
}

fn show_error(win: &tauri::WebviewWindow, msg: &str) {
    let _ = win.eval(&format!("window.officeFailed && window.officeFailed({})", serde_json_string(msg)));
}
fn serde_json_string(s: &str) -> String {
    let mut out = String::from("\"");
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            c if (c as u32) < 0x20 => out.push_str(&format!("\\u{:04x}", c as u32)),
            c => out.push(c),
        }
    }
    out.push('"');
    out
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![desktop_bot])
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" { window.app_handle().exit(0); }
                else if window.label() == "codex-bot" {
                    api.prevent_close();
                    if let Some(state) = window.app_handle().try_state::<BotHidden>() {
                        if let Ok(mut hidden) = state.0.lock() { *hidden = true; }
                    }
                    if let Some(file) = bot_preference(window.app_handle()) {
                        if let Some(parent) = file.parent() { let _ = fs::create_dir_all(parent); }
                        let _ = fs::write(file, "hidden");
                    }
                    let _ = window.hide();
                }
            }
        })
        .setup(|app| {
            let hidden = bot_preference(app.handle()).is_some_and(|p| p.is_file());
            app.manage(BotHidden(Mutex::new(hidden)));
            if let Some(bot) = app.get_webview_window("codex-bot") {
                if let Ok(Some(monitor)) = bot.primary_monitor() {
                    let area = monitor.work_area();
                    let scale = monitor.scale_factor();
                    let _ = bot.set_position(PhysicalPosition::new(
                        area.position.x + area.size.width as i32 - (192.0 * scale) as i32,
                        area.position.y + area.size.height as i32 - (238.0 * scale) as i32,
                    ));
                }
                let _ = bot.set_visible_on_all_workspaces(true);
            }
            let res = plain(app.path().resource_dir()?);
            let log_dir = app.path().home_dir()?.join(".my-office");
            let mut child = None;
            let mut failed = None;
            if !office_up() {
                match start_server(&res, &log_dir) {
                    Ok(c) => child = Some(c),
                    Err(e) => failed = Some(format!("Could not start the office's server: {e}")),
                }
            }
            app.manage(Server(Mutex::new(child)));
            let win = app.get_webview_window("main").expect("the main window");
            let handle = app.handle().clone();
            thread::spawn(move || {
                let port = office_port();
                if let Some(msg) = failed { show_error(&win, &msg); return; }
                // the first start builds nothing (the page ships built) but Next takes a few seconds to get ready
                for _ in 0..240 {
                    if office_up() {
                        let _ = win.navigate(Url::parse(&format!("http://localhost:{port}/")).expect("url"));
                        return;
                    }
                    // the server stopped on its way up: say so, with where its log is
                    if let Some(state) = handle.try_state::<Server>() {
                        if let Ok(mut g) = state.0.lock() {
                            if let Some(c) = g.as_mut() {
                                if let Ok(Some(code)) = c.try_wait() {
                                    show_error(&win, &format!("The office's server stopped ({code}). Its log: {}", log_dir.join("app-server.log").display()));
                                    return;
                                }
                            }
                        }
                    }
                    thread::sleep(Duration::from_millis(500));
                }
                show_error(&win, &format!("The office didn't answer on port {port}. Its log: {}", log_dir.join("app-server.log").display()));
            });
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building DT Office")
        .run(|app, event| {
            if let RunEvent::Exit = event {
                if let Some(state) = app.try_state::<Server>() {
                    if let Ok(mut g) = state.0.lock() {
                        if let Some(mut c) = g.take() { stop_server(&mut c); }
                    }
                }
            }
        });
}
