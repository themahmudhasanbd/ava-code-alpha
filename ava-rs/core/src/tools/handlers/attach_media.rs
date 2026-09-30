use crate::function_tool::FunctionCallError;
use crate::tools::context::ToolInvocation;
use crate::tools::context::ToolOutput;
use crate::tools::context::ToolPayload;
use crate::tools::context::boxed_tool_output;
use crate::tools::handlers::attach_media_spec::create_attach_media_tool;
use crate::tools::handlers::parse_arguments;
use crate::tools::registry::CoreToolRuntime;
use crate::tools::registry::ToolExecutor;
use ava_protocol::models::FunctionCallOutputPayload;
use ava_protocol::models::ResponseInputItem;
use ava_tools::ToolName;
use ava_tools::ToolSpec;
use serde::Deserialize;
use serde::Serialize;
use serde_json::Value as JsonValue;
use std::path::Path;
use std::path::PathBuf;

pub struct AttachMediaHandler;

/// Maximum file size per attachment (25MB).
const MAX_FILE_BYTES: u64 = 25 * 1024 * 1024;
/// Maximum number of files per `attach_media` call.
const MAX_FILES_PER_CALL: usize = 10;

/// A validated file attachment staged for the turn's final assistant message.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub(crate) struct AttachedMedia {
    /// Canonical server-local path. The mobile resolves it via `fs/readFile`.
    pub path: String,
    /// File name for display.
    pub name: String,
    /// File size in bytes.
    pub size: u64,
    /// One of "image" | "video" | "audio" | "file".
    pub media_type: String,
    pub mime_type: String,
    pub caption: Option<String>,
}

impl AttachedMedia {
    pub fn to_json(&self) -> JsonValue {
        let mut obj = serde_json::json!({
            "type": self.media_type,
            "url": self.path,
            "name": self.name,
            "size": self.size,
            "mimeType": self.mime_type,
        });
        if let Some(caption) = &self.caption {
            obj["caption"] = JsonValue::String(caption.clone());
        }
        obj
    }
}

#[derive(Debug, Clone, Deserialize)]
struct AttachMediaArgs {
    paths: Vec<String>,
    kind: Option<String>,
    caption: Option<String>,
}

pub struct AttachMediaToolOutput {
    pub message: String,
}

impl ToolOutput for AttachMediaToolOutput {
    fn log_output(&self) -> String {
        self.message.clone()
    }

    fn success_for_logging(&self) -> bool {
        true
    }

    fn to_response_item(&self, call_id: &str, _payload: &ToolPayload) -> ResponseInputItem {
        let mut output = FunctionCallOutputPayload::from_text(self.message.clone());
        output.success = Some(true);

        ResponseInputItem::FunctionCallOutput {
            call_id: call_id.to_string(),
            output,
        }
    }

    fn code_mode_result(&self, _payload: &ToolPayload) -> JsonValue {
        serde_json::json!({
            "status": "success",
            "message": self.message
        })
    }
}

impl ToolExecutor<ToolInvocation> for AttachMediaHandler {
    fn tool_name(&self) -> ToolName {
        ToolName::plain("attach_media")
    }

    fn spec(&self) -> ToolSpec {
        create_attach_media_tool()
    }

    fn handle<'a>(&'a self, invocation: ToolInvocation) -> ava_tools::ToolExecutorFuture<'a>
    where
        ToolInvocation: 'a,
    {
        Box::pin(Self::execute(invocation))
    }
}

impl CoreToolRuntime for AttachMediaHandler {
    fn is_builtin_control_tool(&self) -> bool {
        true
    }
}

impl AttachMediaHandler {
    pub(crate) async fn execute(
        invocation: ToolInvocation,
    ) -> Result<Box<dyn ToolOutput>, FunctionCallError> {
        let ToolInvocation {
            session,
            turn,
            step_context,
            payload,
            ..
        } = invocation;

        let arguments = match payload {
            ToolPayload::Function { arguments } => arguments,
            _ => {
                return Err(FunctionCallError::RespondToModel(
                    "attach_media received unsupported payload".to_string(),
                ));
            }
        };

        let args: AttachMediaArgs = parse_arguments(&arguments)?;

        if args.paths.is_empty() {
            return Err(FunctionCallError::RespondToModel(
                "attach_media requires at least one path".to_string(),
            ));
        }
        if args.paths.len() > MAX_FILES_PER_CALL {
            return Err(FunctionCallError::RespondToModel(format!(
                "attach_media accepts at most {MAX_FILES_PER_CALL} files per call"
            )));
        }

        let kind = args.kind.as_deref().unwrap_or("file");
        if !matches!(kind, "image" | "gallery" | "file") {
            return Err(FunctionCallError::RespondToModel(
                "attach_media kind must be one of: image, gallery, file".to_string(),
            ));
        }

        // Resolve the workspace root from the turn's primary environment.
        let root = resolve_workspace_root(&step_context, &turn).ok_or_else(|| {
            FunctionCallError::RespondToModel(
                "attach_media is unavailable: no workspace root for this turn".to_string(),
            )
        })?;
        let canonical_root = std::fs::canonicalize(&root).map_err(|e| {
            FunctionCallError::RespondToModel(format!(
                "attach_media cannot resolve workspace root {}: {e}",
                root.display()
            ))
        })?;

        let mut attached = Vec::with_capacity(args.paths.len());
        for raw_path in &args.paths {
            let validated =
                validate_attachment(raw_path, &root, &canonical_root, args.caption.clone())?;
            attached.push(validated);
        }

        let names: Vec<String> = attached.iter().map(|a| a.name.clone()).collect();
        session.add_attached_media(&turn.sub_id, attached).await;

        let message = format!(
            "Attached {} file(s) to your next message: {}. They will appear with your final answer.",
            names.len(),
            names.join(", ")
        );
        Ok(boxed_tool_output(AttachMediaToolOutput { message }))
    }
}

/// Returns the turn's workspace root as a filesystem path.
fn resolve_workspace_root(
    step_context: &crate::session::step_context::StepContext,
    turn: &crate::session::turn_context::TurnContext,
) -> Option<PathBuf> {
    let environments = &step_context.environments;
    if let Some(primary) = environments.primary() {
        let roots = primary.workspace_roots();
        if let Some(first) = roots.first() {
            return Some(first.to_path_buf());
        }
        return Some(primary.cwd().to_path_buf());
    }
    // Fallback to the (deprecated) turn cwd.
    #[allow(deprecated)]
    Some(turn.cwd.to_path_buf())
}

/// Validates a single user-supplied path:
/// - resolves relative paths against the workspace root,
/// - rejects anything that escapes the workspace root (path traversal),
/// - requires an existing regular file within the 25MB size limit.
fn validate_attachment(
    raw_path: &str,
    root: &Path,
    canonical_root: &Path,
    caption: Option<String>,
) -> Result<AttachedMedia, FunctionCallError> {
    let raw_path = raw_path.trim();
    if raw_path.is_empty() {
        return Err(FunctionCallError::RespondToModel(
            "attach_media received an empty path".to_string(),
        ));
    }

    let candidate = PathBuf::from(raw_path);
    let joined = if candidate.is_absolute() {
        candidate
    } else {
        root.join(candidate)
    };

    let canonical = std::fs::canonicalize(&joined).map_err(|_| {
        FunctionCallError::RespondToModel(format!(
            "attach_media: file not found or unreadable: {raw_path}"
        ))
    })?;

    if !canonical.starts_with(canonical_root) {
        return Err(FunctionCallError::RespondToModel(format!(
            "attach_media: path escapes the workspace and was rejected: {raw_path}"
        )));
    }

    let metadata = std::fs::metadata(&canonical).map_err(|_| {
        FunctionCallError::RespondToModel(format!(
            "attach_media: cannot read file metadata: {raw_path}"
        ))
    })?;
    if !metadata.is_file() {
        return Err(FunctionCallError::RespondToModel(format!(
            "attach_media: not a regular file: {raw_path}"
        )));
    }
    let size = metadata.len();
    if size > MAX_FILE_BYTES {
        return Err(FunctionCallError::RespondToModel(format!(
            "attach_media: file exceeds the 25MB limit: {raw_path}"
        )));
    }

    let name = canonical
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(raw_path)
        .to_string();
    let media_type = media_type_for(&name).to_string();
    let mime_type = mime_type_for(&name).to_string();

    Ok(AttachedMedia {
        path: canonical.to_string_lossy().to_string(),
        name,
        size,
        media_type,
        mime_type,
        caption,
    })
}

fn media_type_for(file_name: &str) -> &'static str {
    match extension_of(file_name).as_str() {
        "png" | "jpg" | "jpeg" | "webp" | "gif" | "bmp" | "ico" | "svg" => "image",
        "mp4" | "mov" | "webm" => "video",
        "mp3" | "wav" | "ogg" | "m4a" => "audio",
        _ => "file",
    }
}

fn mime_type_for(file_name: &str) -> &'static str {
    match extension_of(file_name).as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        "gif" => "image/gif",
        "bmp" => "image/bmp",
        "ico" => "image/x-icon",
        "svg" => "image/svg+xml",
        "mp4" => "video/mp4",
        "mov" => "video/quicktime",
        "webm" => "video/webm",
        "mp3" => "audio/mpeg",
        "wav" => "audio/wav",
        "ogg" => "audio/ogg",
        "m4a" => "audio/mp4",
        "pdf" => "application/pdf",
        "json" => "application/json",
        "zip" => "application/zip",
        "txt" | "md" => "text/plain",
        _ => "application/octet-stream",
    }
}

fn extension_of(file_name: &str) -> String {
    Path::new(file_name)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase()
}
