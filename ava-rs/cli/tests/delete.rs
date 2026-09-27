use predicates::prelude::*;

#[test]
fn missing_session_fails_before_delete_confirmation() -> anyhow::Result<()> {
    let ava_home = tempfile::tempdir()?;
    let mut cmd = assert_cmd::Command::new(ava_utils_cargo_bin::cargo_bin("ava")?);
    cmd.env("AVA_HOME", ava_home.path())
        .args(["delete", "123e4567-e89b-12d3-a456-426614174000"]);

    cmd.assert()
        .failure()
        .stderr(predicate::str::contains(
            "No active or archived session found matching",
        ))
        .stderr(predicate::str::contains("cannot confirm").not());
    Ok(())
}
