//! Release packager build script.
//!
//! Runs after the manager library is built (ensured by the build dependency
//! on `codex-plus-manager`) and bundles whatever release artifacts are present
//! into a distributable zip archive. Only activates on release builds so debug
//! builds stay fast.
//!
//! Unlike the previous bindeps-based approach, this script does NOT force the
//! manager or launcher binaries to be linked before it runs. Instead it looks
//! for the launcher binary, the manager binary, and the manager cdylib
//! (codex_plus_manager_lib.dll/.dylib/.so) on disk and copies whichever of
//! them exist. If a binary is still being linked when this script runs, the
//! `cargo:rerun-if-changed` directives below ensure a subsequent
//! `cargo build --release` will re-run this script and pick it up.

use std::env;
use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};

use zip::write::SimpleFileOptions;
use zip::{CompressionMethod, ZipWriter};

fn main() {
    // Only package release builds; debug binaries are not distributable.
    let profile = env::var("PROFILE").unwrap_or_default();
    if profile != "release" {
        return;
    }

    if let Err(error) = package_release() {
        println!("cargo:warning=codex-plus-packager: failed to create zip: {error}");
    }
}

fn package_release() -> Result<(), String> {
    let workspace_root = workspace_root()?;
    let profile_dir = target_profile_dir()?;

    let version = env::var("CARGO_PKG_VERSION").unwrap_or_else(|_| "0.0.0".to_string());

    let (platform, arch) = platform_arch();
    let ext = binary_extension();
    let cdylib_name = manager_cdylib_name();

    let launcher_bin = profile_dir.join(format!("codex-plus-plus{ext}"));
    let manager_bin = profile_dir.join(format!("codex-plus-plus-manager{ext}"));
    let manager_cdylib = profile_dir.join(&cdylib_name);

    // Re-run this script whenever the artifacts change (including when they
    // are first created). Without bindeps the binaries may be linked after
    // this build script runs on the first `cargo build --release`; tracking
    // them ensures a subsequent build picks them up.
    println!("cargo:rerun-if-changed={}", launcher_bin.display());
    println!("cargo:rerun-if-changed={}", manager_bin.display());
    println!("cargo:rerun-if-changed={}", manager_cdylib.display());

    let mut artifacts: Vec<PathBuf> = Vec::new();

    if launcher_bin.exists() {
        artifacts.push(launcher_bin.clone());
    } else {
        println!(
            "cargo:warning=codex-plus-packager: launcher binary not found at {} (skipping; re-run `cargo build --release` to pick it up)",
            launcher_bin.display()
        );
    }

    if manager_bin.exists() {
        artifacts.push(manager_bin.clone());
    } else {
        println!(
            "cargo:warning=codex-plus-packager: manager binary not found at {} (skipping; re-run `cargo build --release` to pick it up)",
            manager_bin.display()
        );
    }

    if manager_cdylib.exists() {
        artifacts.push(manager_cdylib.clone());
    } else {
        println!(
            "cargo:warning=codex-plus-packager: manager cdylib not found at {} (skipping)",
            manager_cdylib.display()
        );
    }

    if artifacts.is_empty() {
        return Err("no build artifacts found to package".to_string());
    }

    let dist_dir = workspace_root.join("dist").join(platform);
    let app_dir = dist_dir.join("app");
    fs::create_dir_all(&app_dir).map_err(|e| format!("create app dir: {e}"))?;

    let mut copied: Vec<(String, PathBuf)> = Vec::new();
    for src in &artifacts {
        let name = src
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or_else(|| format!("invalid file name: {}", src.display()))?
            .to_string();
        let dst = app_dir.join(&name);
        copy_file(src, &dst)?;
        copied.push((name, dst));
    }

    let zip_name = format!("CodexPlusPlus-{version}-{platform}-{arch}.zip");
    let zip_path = dist_dir.join(&zip_name);

    let zip_file = fs::File::create(&zip_path).map_err(|e| format!("create zip: {e}"))?;
    let mut zip = ZipWriter::new(zip_file);
    let options = SimpleFileOptions::default().compression_method(CompressionMethod::Deflated);

    for (name, path) in &copied {
        add_file_to_zip(&mut zip, path, name, options)?;
    }

    zip.finish().map_err(|e| format!("finalize zip: {e}"))?;

    println!(
        "cargo:warning=codex-plus-packager: created {} ({} files)",
        zip_path.display(),
        copied.len()
    );
    Ok(())
}

fn workspace_root() -> Result<PathBuf, String> {
    let manifest_dir = PathBuf::from(
        env::var("CARGO_MANIFEST_DIR").map_err(|_| "CARGO_MANIFEST_DIR not set".to_string())?,
    );
    manifest_dir
        .ancestors()
        .nth(2)
        .map(Path::to_path_buf)
        .ok_or_else(|| "cannot locate workspace root".to_string())
}

fn target_profile_dir() -> Result<PathBuf, String> {
    let out_dir = PathBuf::from(env::var("OUT_DIR").map_err(|_| "OUT_DIR not set".to_string())?);
    // OUT_DIR = <target>/<profile>/build/<pkg>-<hash>/out
    // Going up 3 levels lands on <target>/<profile>.
    out_dir
        .ancestors()
        .nth(3)
        .map(Path::to_path_buf)
        .ok_or_else(|| "cannot derive target profile dir from OUT_DIR".to_string())
}

fn platform_arch() -> (&'static str, &'static str) {
    #[cfg(windows)]
    {
        ("windows", "x64")
    }
    #[cfg(target_os = "macos")]
    {
        ("macos", std::env::consts::ARCH)
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        ("linux", std::env::consts::ARCH)
    }
}

fn binary_extension() -> &'static str {
    #[cfg(windows)]
    {
        ".exe"
    }
    #[cfg(not(windows))]
    {
        ""
    }
}

/// Returns the file name of the manager cdylib produced by the
/// `codex-plus-manager` `[lib] name = "codex_plus_manager_lib"` with
/// `crate-type` including `cdylib`.
fn manager_cdylib_name() -> String {
    #[cfg(windows)]
    {
        "codex_plus_manager_lib.dll".to_string()
    }
    #[cfg(target_os = "macos")]
    {
        "libcodex_plus_manager_lib.dylib".to_string()
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        "libcodex_plus_manager_lib.so".to_string()
    }
}

fn copy_file(src: &Path, dst: &Path) -> Result<(), String> {
    fs::copy(src, dst)
        .map(|_| ())
        .map_err(|e| format!("copy {} -> {}: {e}", src.display(), dst.display()))
}

fn add_file_to_zip(
    zip: &mut ZipWriter<fs::File>,
    path: &Path,
    name: &str,
    options: SimpleFileOptions,
) -> Result<(), String> {
    zip.start_file(name, options)
        .map_err(|e| format!("start zip entry {name}: {e}"))?;
    let mut file = fs::File::open(path).map_err(|e| format!("open {}: {e}", path.display()))?;
    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer)
        .map_err(|e| format!("read {}: {e}", path.display()))?;
    zip.write_all(&buffer)
        .map_err(|e| format!("write zip entry {name}: {e}"))?;
    Ok(())
}
