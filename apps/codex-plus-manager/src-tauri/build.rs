use std::env;
use std::path::Path;
use std::process::Command;

fn main() {
    // Build the Node.js frontend before Tauri compiles, so `cargo build`
    // produces a binary with the embedded web assets without needing
    // `tauri build` or a separate `npm run vite:build` step.
    build_frontend();

    let windows = tauri_build::WindowsAttributes::new()
        .app_manifest(include_str!("windows-app-manifest.xml"));
    let attrs = tauri_build::Attributes::new().windows_attributes(windows);
    tauri_build::try_build(attrs).expect("failed to run Tauri build script");
}

fn build_frontend() {
    let manifest_dir_str =
        env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR not set");
    let manifest_dir = Path::new(&manifest_dir_str);
    let manager_dir = manifest_dir
        .parent()
        .expect("cannot locate apps/codex-plus-manager directory");

    if !manager_dir.join("node_modules").exists() {
        let status = npm(&["install"], manager_dir)
            .status()
            .expect("failed to spawn npm install");
        if !status.success() {
            panic!("npm install failed with status {status}");
        }
    }

    let status = npm(&["run", "vite:build"], manager_dir)
        .status()
        .expect("failed to spawn vite build");
    if !status.success() {
        panic!("vite build failed with status {status}");
    }

    println!("cargo:rerun-if-changed={}", manager_dir.join("package.json").display());
    println!("cargo:rerun-if-changed={}", manager_dir.join("package-lock.json").display());
    println!("cargo:rerun-if-changed={}", manager_dir.join("vite.config.ts").display());
    println!("cargo:rerun-if-changed={}", manager_dir.join("index.html").display());
    println!("cargo:rerun-if-changed={}", manager_dir.join("tsconfig.json").display());
    println!("cargo:rerun-if-changed={}", manager_dir.join("src").display());
}

fn npm(args: &[&str], cwd: &Path) -> Command {
    #[cfg(windows)]
    let mut cmd = {
        let mut cmd = Command::new("cmd");
        cmd.arg("/c").arg("npm");
        cmd
    };
    #[cfg(not(windows))]
    let mut cmd = Command::new("npm");
    cmd.args(args).current_dir(cwd);
    cmd
}
