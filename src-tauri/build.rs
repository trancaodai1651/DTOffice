fn main() {
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&["desktop_bot", "desktop_update"]),
    )).expect("build DT Office permissions")
}
