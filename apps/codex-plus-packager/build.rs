//! Release packager build script.
//!
//! Runs after the manager and launcher binaries are built (guaranteed by the
//! crate dependencies) and bundles them into a distributable zip archive.
//! Only activates on release builds so debug builds stay fast.

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

    let launcher_bin = profile_dir.join(format!("codex-plus-plus{ext}"));
    let manager_bin = profile_dir.join(format!("codex-plus-plus-manager{ext}"));

    if !launcher_bin.exists() {
        return Err(format!(
            "launcher binary not found at {}",
            launcher_bin.display()
        ));
    }
    if !manager_bin.exists() {
        return Err(format!(
            "manager binary not found at {}",
            manager_bin.display()
        ));
    }

    let dist_dir = workspace_root.join("dist").join(platform);
    let app_dir = dist_dir.join("app");
    fs::create_dir_all(&app_dir).map_err(|e| format!("create app dir: {e}"))?;

    let launcher_name = launcher_bin.file_name().unwrap().to_str().unwrap();
    let manager_name = manager_bin.file_name().unwrap().to_str().unwrap();

    let launcher_dest = app_dir.join(launcher_name);
    let manager_dest = app_dir.join(manager_name);
    copy_file(&launcher_bin, &launcher_dest)?;
    copy_file(&manager_bin, &manager_dest)?;

    let zip_name = format!("CodexPlusPlus-{version}-{platform}-{arch}.zip");
    let zip_path = dist_dir.join(&zip_name);

    let zip_file = fs::File::create(&zip_path).map_err(|e| format!("create zip: {e}"))?;
    let mut zip = ZipWriter::new(zip_file);
    let options = SimpleFileOptions::default().compression_method(CompressionMethod::Deflated);

    add_file_to_zip(&mut zip, &launcher_dest, launcher_name, options)?;
    add_file_to_zip(&mut zip, &manager_dest, manager_name, options)?;

    zip.finish().map_err(|e| format!("finalize zip: {e}"))?;

    println!(
        "cargo:warning=codex-plus-packager: created {}",
        zip_path.display()
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
    let out_dir = PathBuf::from(
        env::var("OUT_DIR").map_err(|_| "OUT_DIR not set".to_string())?,
    );
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
