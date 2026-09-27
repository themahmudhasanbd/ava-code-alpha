use anyhow::Result;
use predicates::str::contains;
use std::path::Path;
use tempfile::TempDir;

fn ava_command(ava_home: &Path) -> Result<assert_cmd::Command> {
    let mut cmd = assert_cmd::Command::new(ava_utils_cargo_bin::cargo_bin("ava")?);
    cmd.env("AVA_HOME", ava_home);
    Ok(cmd)
}

#[cfg(debug_assertions)]
#[tokio::test]
async fn update_does_not_start_interactive_prompt() -> Result<()> {
    let ava_home = TempDir::new()?;

    ava_command(ava_home.path())?
        .arg("update")
        .assert()
        .failure()
        .stderr(contains("`ava update` is not available in debug builds"));

    Ok(())
}
