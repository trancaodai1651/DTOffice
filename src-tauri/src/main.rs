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

use tauri::{Manager, RunEvent, Url};

const PORT: u16 = 4310;

struct Server(Mutex<Option<Child>>);

/// The office answers on the port (its health route), not only something listening there.
fn office_up() -> bool {
    let Ok(mut s) = TcpStream::connect_timeout(&([127, 0, 0, 1], PORT).into(), Duration::from_millis(400)) else { return false };
    let _ = s.set_read_timeout(Some(Duration::from_secs(3)));
    if s.write_all(format!("GET /api/doctor HTTP/1.0\r\nHost: 127.0.0.1:{PORT}\r\n\r\n").as_bytes()).is_err() { return false; }
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
        .env("OFFICE_PORT", PORT.to_string())
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
        .setup(|app| {
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
                if let Some(msg) = failed { show_error(&win, &msg); return; }
                // the first start builds nothing (the page ships built) but Next takes a few seconds to get ready
                for _ in 0..240 {
                    if office_up() {
                        let _ = win.navigate(Url::parse(&format!("http://localhost:{PORT}/")).expect("url"));
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
                show_error(&win, &format!("The office didn't answer on port {PORT}. Its log: {}", log_dir.join("app-server.log").display()));
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
