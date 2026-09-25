mod actions;
mod cdp;
mod coordinator;
mod engine;
mod extension;
mod observer;
mod prompts;
mod schema;
pub mod tools;

pub use extension::install;
pub use tools::{BROWSER_TOOL_NAME, BrowserArgs, BrowserResponse, BrowserTool};

#[cfg(test)]
mod tests;
