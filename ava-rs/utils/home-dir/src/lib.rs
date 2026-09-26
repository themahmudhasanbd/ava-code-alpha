use codex_utils_absolute_path::AbsolutePathBuf;
use dirs::home_dir;
use std::path::PathBuf;

/// Returns the path to the AvA configuration directory, which can be
/// specified by the `AVA_CODE_HOME` or `AVA_HOME` environment variable. If not set, defaults to
/// `~/.ava-code`.
///
/// - If `AVA_CODE_HOME` or `AVA_HOME` is set, the value must exist and be a directory. The
///   value will be canonicalized and this function will Err otherwise.
/// - If neither is set, this function does not verify that the directory exists.
pub fn find_codex_home() -> std::io::Result<AbsolutePathBuf> {
    let home_env = std::env::var("AVA_CODE_HOME")
        .or_else(|_| std::env::var("AVA_HOME"))
        .ok()
        .filter(|val| !val.is_empty());
    find_codex_home_from_env(home_env.as_deref())
}

pub fn find_ava_home() -> std::io::Result<AbsolutePathBuf> {
    find_codex_home()
}

fn find_codex_home_from_env(home_env: Option<&str>) -> std::io::Result<AbsolutePathBuf> {
    // Honor the `AVA_CODE_HOME` / `AVA_HOME` environment variable when it is set
    match home_env {
        Some(val) => {
            let path = PathBuf::from(val);
            let metadata = std::fs::metadata(&path).map_err(|err| match err.kind() {
                std::io::ErrorKind::NotFound => std::io::Error::new(
                    std::io::ErrorKind::NotFound,
                    format!("Home directory points to {val:?}, but that path does not exist"),
                ),
                _ => std::io::Error::new(
                    err.kind(),
                    format!("failed to read home directory {val:?}: {err}"),
                ),
            })?;

            if !metadata.is_dir() {
                Err(std::io::Error::new(
                    std::io::ErrorKind::InvalidInput,
                    format!("Home directory points to {val:?}, but that path is not a directory"),
                ))
            } else {
                let canonical = path.canonicalize().map_err(|err| {
                    std::io::Error::new(
                        err.kind(),
                        format!("failed to canonicalize home directory {val:?}: {err}"),
                    )
                })?;
                AbsolutePathBuf::from_absolute_path(canonical)
            }
        }
        None => {
            let user_home = home_dir().ok_or_else(|| {
                std::io::Error::new(
                    std::io::ErrorKind::NotFound,
                    "Could not find user home directory",
                )
            })?;

            let ava_code = user_home.join(".ava-code");

            AbsolutePathBuf::from_absolute_path(ava_code)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::find_codex_home_from_env;
    use codex_utils_absolute_path::AbsolutePathBuf;
    use dirs::home_dir;
    use pretty_assertions::assert_eq;
    use std::fs;
    use std::io::ErrorKind;
    use tempfile::TempDir;

    #[test]
    fn find_codex_home_env_missing_path_is_fatal() {
        let temp_home = TempDir::new().expect("temp home");
        let missing = temp_home.path().join("missing-ava-home");
        let missing_str = missing
            .to_str()
            .expect("missing ava home path should be valid utf-8");

        let err = find_codex_home_from_env(Some(missing_str)).expect_err("missing AVA_CODE_HOME");
        assert_eq!(err.kind(), ErrorKind::NotFound);
        assert!(
            err.to_string().contains("does not exist"),
            "unexpected error: {err}"
        );
    }

    #[test]
    fn find_codex_home_env_file_path_is_fatal() {
        let temp_home = TempDir::new().expect("temp home");
        let file_path = temp_home.path().join("ava-home.txt");
        fs::write(&file_path, "not a directory").expect("write temp file");
        let file_str = file_path
            .to_str()
            .expect("file ava home path should be valid utf-8");

        let err = find_codex_home_from_env(Some(file_str)).expect_err("file AVA_CODE_HOME");
        assert_eq!(err.kind(), ErrorKind::InvalidInput);
        assert!(
            err.to_string().contains("not a directory"),
            "unexpected error: {err}"
        );
    }

    #[test]
    fn find_codex_home_env_valid_directory_canonicalizes() {
        let temp_home = TempDir::new().expect("temp home");
        let temp_str = temp_home
            .path()
            .to_str()
            .expect("temp ava home path should be valid utf-8");

        let resolved = find_codex_home_from_env(Some(temp_str)).expect("valid AVA_CODE_HOME");
        let expected = temp_home
            .path()
            .canonicalize()
            .expect("canonicalize temp home");
        let expected = AbsolutePathBuf::from_absolute_path(expected).expect("absolute home");
        assert_eq!(resolved, expected);
    }

    #[test]
    fn find_codex_home_without_env_uses_default_home_dir() {
        let resolved = find_codex_home_from_env(/*home_env*/ None).expect("default AVA_HOME");
        let mut expected = home_dir().expect("home dir");
        expected.push(".ava-code");
        let expected = AbsolutePathBuf::from_absolute_path(expected).expect("absolute home");
        assert_eq!(resolved, expected);
    }
}
