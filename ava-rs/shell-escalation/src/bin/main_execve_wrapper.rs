#[cfg(not(unix))]
fn main() {
    eprintln!("ava-execve-wrapper is only implemented for UNIX");
    std::process::exit(1);
}

#[cfg(unix)]
pub use ava_shell_escalation::main_execve_wrapper as main;
