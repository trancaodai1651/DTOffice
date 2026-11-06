//! Signed updates are native-only. Web pages and the companion cannot install software.
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::Manager;
use tauri_plugin_updater::{Update, UpdaterExt};

#[derive(Default)]
struct UpdateState {
    candidate: Option<Update>,
    bytes: Option<Arc<Vec<u8>>>,
    stage: String,
    received: u64,
    total: Option<u64>,
}
#[derive(Default)]
pub struct Updates(Mutex<UpdateState>);

fn snapshot(app: &tauri::AppHandle, s: &UpdateState) -> serde_json::Value {
    serde_json::json!({ "supported": true, "current": app.package_info().version.to_string(),
        "stage": if s.stage.is_empty() { "idle" } else { &s.stage },
        "version": s.candidate.as_ref().map(|u| &u.version), "notes": s.candidate.as_ref().and_then(|u| u.body.as_ref()),
        "received": s.received, "total": s.total })
}
fn trusted_url(url: &tauri::Url) -> bool {
    url.scheme() == "https" && url.host_str() == Some("github.com") && url.username().is_empty()
        && url.password().is_none() && url.port_or_known_default() == Some(443)
        && url.path().starts_with("/trancaodai1651/DTOffice/releases/download/")
}
fn trusted_window(label: &str, url: &tauri::Url, port: u16) -> bool {
    label == "main" && url.scheme() == "http" && matches!(url.host_str(), Some("localhost" | "127.0.0.1")) && url.port_or_known_default() == Some(port)
}

#[tauri::command]
pub async fn desktop_update(app: tauri::AppHandle, window: tauri::WebviewWindow, action: String, version: Option<String>) -> Result<serde_json::Value, String> {
    let url = window.url().map_err(|e| e.to_string())?;
    if !trusted_window(window.label(), &url, crate::office_port()) {
        return Err("updates are only available in the local desktop office".into());
    }
    let store = app.state::<Updates>();
    if action == "status" { let s = store.0.lock().map_err(|e| e.to_string())?; return Ok(snapshot(&app, &s)); }
    if action == "pause" {
        let mut s = store.0.lock().map_err(|e| e.to_string())?;
        if s.stage == "waiting" { s.stage = "ready".into(); }
        return Ok(snapshot(&app, &s));
    }
    if action == "check" {
        {
            let mut s = store.0.lock().map_err(|e| e.to_string())?;
            if matches!(s.stage.as_str(), "checking" | "downloading" | "verifying" | "ready" | "waiting" | "installing") { return Ok(snapshot(&app, &s)); }
            s.stage = "checking".into();
        }
        let before_exit = app.clone();
        let result = async {
            app.updater_builder().timeout(Duration::from_secs(20))
                .on_before_exit(move || { crate::stop_owned_server(&before_exit); before_exit.cleanup_before_exit(); })
                .build().map_err(|e| e.to_string())?.check().await.map_err(|e| e.to_string())
        }.await;
        let mut s = store.0.lock().map_err(|e| e.to_string())?;
        s.stage = if s.candidate.is_some() { "available" } else { "idle" }.into();
        let candidate = result?;
        if candidate.as_ref().is_some_and(|u| !trusted_url(&u.download_url)) { return Err("update is not hosted in the DT Office GitHub release".into()); }
        s.candidate = candidate.map(|mut u| { u.timeout = Some(Duration::from_secs(1800)); u });
        s.stage = if s.candidate.is_some() { "available" } else { "current" }.into();
        return Ok(snapshot(&app, &s));
    }
    if action == "download" {
        let candidate = {
            let mut s = store.0.lock().map_err(|e| e.to_string())?;
            let candidate = s.candidate.clone().ok_or("check for an update first")?;
            if version.as_deref() != Some(&candidate.version) || s.stage != "available" { return Err("update changed or is already in progress".into()); }
            s.stage = "downloading".into(); s.received = 0; s.total = None;
            candidate
        };
        let progress_app = app.clone(); let verify_app = app.clone();
        let result = candidate.download(move |chunk, total| {
            if let Ok(mut s) = progress_app.state::<Updates>().0.lock() { s.received += chunk as u64; s.total = total; }
        }, move || { if let Ok(mut s) = verify_app.state::<Updates>().0.lock() { s.stage = "verifying".into(); } }).await;
        let mut s = store.0.lock().map_err(|e| e.to_string())?;
        match result {
            Ok(bytes) => { s.bytes = Some(Arc::new(bytes)); s.stage = "ready".into(); }
            Err(e) => { s.stage = "available".into(); return Err(e.to_string()); }
        }
        return Ok(snapshot(&app, &s));
    }
    if action == "install" {
        // Tasks include queued team stages and video/PDF post-processing, not just CLI processes.
        let readiness = tauri::async_runtime::spawn_blocking(|| crate::local_status("/api/desktop-update-status")).await.map_err(|e| e.to_string())??;
        let (candidate, bytes) = {
            let mut s = store.0.lock().map_err(|e| e.to_string())?;
            let candidate = s.candidate.clone().ok_or("no update selected")?;
            if version.as_deref() != Some(&candidate.version) || !matches!(s.stage.as_str(), "ready" | "waiting") { return Err("download and approve this update first".into()); }
            if readiness["safe"].as_bool() != Some(true) {
                s.stage = "waiting".into(); return Ok(snapshot(&app, &s));
            }
            let bytes = s.bytes.clone().ok_or("no verified update downloaded")?;
            s.stage = "installing".into(); (candidate, bytes)
        };
        let result = tauri::async_runtime::spawn_blocking(move || candidate.install(bytes.as_slice())).await.map_err(|e| e.to_string())?;
        if let Err(e) = result { store.0.lock().map_err(|e| e.to_string())?.stage = "ready".into(); return Err(e.to_string()); }
        // Windows exits through the updater's before-exit callback; macOS must restart explicitly.
        crate::stop_owned_server(&app);
        app.restart();
    }
    Err("unsupported update action".into())
}

#[cfg(test)]
mod tests {
    use super::*;
    use base64::Engine;
    fn verify_signed(bytes: &[u8], signature: &str) -> Result<(), minisign_verify::Error> {
        let config: serde_json::Value = serde_json::from_str(include_str!("../tauri.conf.json")).unwrap();
        let key = base64::engine::general_purpose::STANDARD.decode(config["plugins"]["updater"]["pubkey"].as_str().unwrap()).unwrap();
        let key = minisign_verify::PublicKey::decode(std::str::from_utf8(&key).unwrap()).unwrap();
        let signature = base64::engine::general_purpose::STANDARD.decode(signature.trim()).unwrap();
        let signature = minisign_verify::Signature::decode(std::str::from_utf8(&signature).unwrap()).unwrap();
        key.verify(bytes, &signature, false)
    }
    #[test]
    fn signed_payload_verifies_and_tampered_bytes_are_rejected() {
        let bytes = include_bytes!("../../tests/fixtures/updater/signed-payload.bin");
        let sig = include_str!("../../tests/fixtures/updater/signed-payload.bin.sig");
        assert!(verify_signed(bytes, sig).is_ok());
        let mut corrupt = bytes.to_vec(); corrupt[0] ^= 1;
        assert!(verify_signed(&corrupt, sig).is_err());
    }
    #[test]
    #[ignore = "requires downloaded public release assets in OFFICE_VERIFY_RELEASE_DIR"]
    fn published_installers_have_valid_signatures() {
        let dir = std::path::PathBuf::from(std::env::var("OFFICE_VERIFY_RELEASE_DIR").expect("release assets directory"));
        let manifest: serde_json::Value = serde_json::from_str(&std::fs::read_to_string(dir.join("latest.json")).unwrap()).unwrap();
        for target in ["windows-x86_64", "darwin-x86_64", "darwin-aarch64"] {
            let entry = &manifest["platforms"][target];
            let name = entry["url"].as_str().unwrap().rsplit('/').next().unwrap();
            let bytes = std::fs::read(dir.join(name)).unwrap();
            assert!(verify_signed(&bytes, entry["signature"].as_str().unwrap()).is_ok(), "{target}");
            let signature = base64::engine::general_purpose::STANDARD.decode(entry["signature"].as_str().unwrap()).unwrap();
            let signature = minisign_verify::Signature::decode(std::str::from_utf8(&signature).unwrap()).unwrap();
            assert_eq!(signature.trusted_comment().split('\t').find_map(|part| part.strip_prefix("version:")), manifest["version"].as_str(), "signed version for {target}");
        }
    }
    #[test]
    fn only_our_https_release_downloads_are_accepted() {
        for url in ["http://github.com/trancaodai1651/DTOffice/releases/download/v1/a.exe", "https://evil.test/trancaodai1651/DTOffice/releases/download/v1/a.exe", "https://github.com/other/repo/releases/download/v1/a.exe", "https://github.com:8443/trancaodai1651/DTOffice/releases/download/v1/a.exe"] {
            assert!(!trusted_url(&url.parse().unwrap()));
        }
        assert!(trusted_url(&"https://github.com/trancaodai1651/DTOffice/releases/download/v1/DT.Office.exe".parse().unwrap()));
    }
    #[test]
    fn only_the_local_main_window_can_approve_updates() {
        let local = "http://localhost:4310/".parse().unwrap();
        assert!(trusted_window("main", &local, 4310));
        assert!(!trusted_window("codex-bot", &local, 4310));
        assert!(!trusted_window("main", &local, 4399));
        assert!(!trusted_window("main", &"https://example.com/".parse().unwrap(), 4310));
    }
}
