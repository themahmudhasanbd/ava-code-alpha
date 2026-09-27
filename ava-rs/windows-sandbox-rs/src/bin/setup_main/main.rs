#[cfg(target_os = "windows")]
fn main() -> anyhow::Result<()> {
    ava_windows_sandbox::setup_helper_main()
}

#[cfg(not(target_os = "windows"))]
fn main() {
    panic!("ava-windows-sandbox-setup is Windows-only");
}
