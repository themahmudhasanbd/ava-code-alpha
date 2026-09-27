#![allow(clippy::expect_used)]

use std::process::Command;

use divan::Bencher;

fn main() {
    divan::main();
}

/// Exercises the Bazel-backed end-to-end benchmark path with a cheap,
/// deterministic Ava invocation. Richer scenarios can add separate
/// benchmark binaries without making the shared harness depend on them.
#[divan::bench(sample_count = 20, sample_size = 1)]
fn ava_help(bencher: Bencher) {
    let ava = ava_utils_cargo_bin::cargo_bin("ava")
        .expect("ava binary should be available through Bazel runfiles");

    bencher.bench_local(move || {
        let output = Command::new(&ava)
            .arg("--help")
            .output()
            .expect("ava --help should run");
        assert!(output.status.success(), "ava --help should succeed");
    });
}
