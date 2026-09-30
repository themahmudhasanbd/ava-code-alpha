use anyhow::Result;
use ava_execpolicy::ExecPolicyCheckCommand;
use clap::Parser;

/// CLI for evaluating exec policies
#[derive(Parser)]
#[command(name = "ava-execpolicy")]
enum Cli {
    /// Evaluate a command against a policy.
    Check(ExecPolicyCheckCommand),
}

fn main() -> Result<()> {
    let cli = Cli::parse();
    match cli {
        Cli::Check(cmd) => cmd.run(),
    }
}
