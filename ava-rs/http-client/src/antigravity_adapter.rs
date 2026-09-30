use crate::error::TransportError;
use crate::request::EncodedJsonBody;
use crate::request::Request;
use crate::request::RequestBody;
use crate::request::Response;
use crate::transport::ByteStream;
use bytes::Bytes;
use futures::StreamExt;
use http::HeaderMap;
use http::HeaderName;
use http::HeaderValue;
use http::Method;
use serde_json::Value;
use serde_json::json;
use std::time::SystemTime;
use std::time::UNIX_EPOCH;

pub const ANTIGRAVITY_USER_AGENT: &str = "antigravity/ide/2.5.5 darwin/arm64";
pub const ANTIGRAVITY_API_CLIENT: &str = "gl-node/22.21.1";

/// Checks if a request URL points to Google Cloud Code PA / Antigravity endpoints.
pub fn is_antigravity_url(url: &str) -> bool {
    url.contains("cloudcode-pa.googleapis.com")
        || url.contains("daily-cloudcode-pa")
        || url.contains("cloudcode")
        || url.contains("antigravity")
}

/// Checks if headers indicate an Antigravity request.
pub fn is_antigravity_request(url: &str, headers: &HeaderMap) -> bool {
    is_antigravity_url(url)
        || headers
            .get("User-Agent")
            .and_then(|v| v.to_str().ok())
            .is_some_and(|ua| ua.contains("antigravity"))
        || headers
            .get("x-provider")
            .and_then(|v| v.to_str().ok())
            .is_some_and(|p| p.eq_ignore_ascii_case("antigravity"))
        || headers
            .get("x-model-provider")
            .and_then(|v| v.to_str().ok())
            .is_some_and(|p| p.eq_ignore_ascii_case("antigravity"))
}

/// Extracts a JSON `Value` from an optional `RequestBody`.
fn extract_body_value(body: &Option<RequestBody>) -> Option<Value> {
    match body {
        Some(RequestBody::Json(v)) => Some(v.clone()),
        Some(RequestBody::EncodedJson(e)) => serde_json::from_slice(e.as_bytes()).ok(),
        Some(RequestBody::Raw(b)) => serde_json::from_slice(b).ok(),
        None => None,
    }
}

/// Adapts an outbound OpenAI Responses request into the Google Cloud Code PA envelope format.
pub fn adapt_antigravity_request(
    mut req: Request,
    is_stream: bool,
) -> Result<Request, TransportError> {
    let url_str = req.url.clone();
    let base = if let Some(idx) = url_str.find("/v1internal") {
        &url_str[..idx]
    } else if let Some(idx) = url_str.find("/v1") {
        &url_str[..idx]
    } else if let Some(idx) = url_str.find("/responses") {
        &url_str[..idx]
    } else {
        url_str.trim_end_matches('/')
    };

    let target_endpoint = if is_stream {
        format!("{base}/v1internal:streamGenerateContent?alt=sse")
    } else {
        format!("{base}/v1internal:generateContent")
    };
    req.url = target_endpoint;
    req.method = Method::POST;

    if let Ok(val) = HeaderValue::from_str(ANTIGRAVITY_USER_AGENT) {
        req.headers.insert(http::header::USER_AGENT, val);
    }
    if let (Ok(name), Ok(val)) = (
        HeaderName::from_bytes(b"x-goog-api-client"),
        HeaderValue::from_str(ANTIGRAVITY_API_CLIENT),
    ) {
        req.headers.insert(name, val);
    }
    req.headers.insert(
        http::header::CONTENT_TYPE,
        HeaderValue::from_static("application/json"),
    );

    if let Some(body_json) = extract_body_value(&req.body) {
        let transformed = transform_responses_to_gemini(&body_json);
        if let Ok(encoded) = EncodedJsonBody::encode(&transformed) {
            req.body = Some(RequestBody::EncodedJson(encoded));
        } else {
            req.body = Some(RequestBody::Json(transformed));
        }
    }

    Ok(req)
}

/// Recursively removes schema attributes that Google Cloud Code PA proto schema validator rejects.
fn clean_gemini_schema(val: &mut Value) {
    if let Some(obj) = val.as_object_mut() {
        obj.remove("$schema");
        if let Some(props) = obj.get_mut("properties").and_then(|p| p.as_object_mut()) {
            for (_, prop_val) in props.iter_mut() {
                clean_gemini_schema(prop_val);
            }
        }
        if let Some(items) = obj.get_mut("items") {
            clean_gemini_schema(items);
        }
    }
}

/// Translates OpenAI Responses JSON payload to Google Cloud Code PA format.
pub fn transform_responses_to_gemini(input: &Value) -> Value {
    let model = input
        .get("model")
        .and_then(|v| v.as_str())
        .unwrap_or_default();

    let raw_model = model
        .strip_prefix("antigravity/")
        .or_else(|| model.strip_prefix("google/"))
        .unwrap_or(model);

    let instructions = input
        .get("instructions")
        .and_then(|v| v.as_str())
        .unwrap_or_default();

    let mut contents: Vec<Value> = Vec::new();

    if let Some(items) = input.get("input").and_then(|v| v.as_array()) {
        for item in items {
            let item_type = item
                .get("type")
                .and_then(|v| v.as_str())
                .unwrap_or("message");
            match item_type {
                "message" => {
                    let role = item.get("role").and_then(|v| v.as_str()).unwrap_or("user");
                    let gemini_role = if role == "assistant" { "model" } else { "user" };

                    let mut parts: Vec<Value> = Vec::new();
                    if let Some(content_array) = item.get("content").and_then(|v| v.as_array()) {
                        for c in content_array {
                            if let Some(text) = c.get("text").and_then(|v| v.as_str()) {
                                if !text.is_empty() {
                                    parts.push(json!({ "text": text }));
                                }
                            } else if let Some(image_url) = c.get("image_url").and_then(|v| {
                                if let Some(s) = v.as_str() {
                                    Some(s)
                                } else {
                                    v.get("url").and_then(|u| u.as_str())
                                }
                            }) {
                                if let Some(data) = parse_base64_data_url(image_url) {
                                    parts.push(json!({
                                        "inlineData": {
                                            "mimeType": data.0,
                                            "data": data.1
                                        }
                                    }));
                                } else {
                                    parts.push(json!({ "text": format!("[Image: {image_url}]") }));
                                }
                            } else if let Some(audio_url) =
                                c.get("audio_url").and_then(|v| v.as_str())
                            {
                                if let Some(data) = parse_base64_data_url(audio_url) {
                                    parts.push(json!({
                                        "inlineData": {
                                            "mimeType": data.0,
                                            "data": data.1
                                        }
                                    }));
                                }
                            }
                        }
                    } else if let Some(text) = item.get("content").and_then(|v| v.as_str()) {
                        if !text.is_empty() {
                            parts.push(json!({ "text": text }));
                        }
                    }

                    if !parts.is_empty() {
                        contents.push(json!({
                            "role": gemini_role,
                            "parts": parts
                        }));
                    }
                }
                "function_call" => {
                    let name = item.get("name").and_then(|v| v.as_str()).unwrap_or("tool");
                    let args = item
                        .get("arguments")
                        .and_then(|v| {
                            if let Some(s) = v.as_str() {
                                serde_json::from_str::<Value>(s).ok()
                            } else {
                                Some(v.clone())
                            }
                        })
                        .unwrap_or_else(|| json!({}));

                    contents.push(json!({
                        "role": "model",
                        "parts": [{
                            "functionCall": {
                                "name": name,
                                "args": args
                            }
                        }]
                    }));
                }
                "function_call_output" => {
                    let name = item.get("name").and_then(|v| v.as_str()).unwrap_or("tool");
                    let output = item.get("output").cloned().unwrap_or_else(|| json!(""));
                    let output_val = if let Some(s) = output.as_str() {
                        json!({ "output": s })
                    } else if output.is_object() {
                        output
                    } else {
                        json!({ "output": output })
                    };

                    contents.push(json!({
                        "role": "user",
                        "parts": [{
                            "functionResponse": {
                                "name": name,
                                "response": output_val
                            }
                        }]
                    }));
                }
                "reasoning" => {
                    if let Some(text) = item.get("content").and_then(|v| {
                        if let Some(s) = v.as_str() {
                            Some(s)
                        } else if let Some(arr) = v.as_array() {
                            arr.first()
                                .and_then(|c| c.get("text"))
                                .and_then(|t| t.as_str())
                        } else {
                            None
                        }
                    }) {
                        if !text.is_empty() {
                            contents.push(json!({
                                "role": "model",
                                "parts": [{
                                    "thought": true,
                                    "text": text
                                }]
                            }));
                        }
                    }
                }
                _ => {}
            }
        }
    }

    // Merge consecutive turns with the same role (Gemini requirement)
    let mut merged_contents: Vec<Value> = Vec::new();
    for content in contents {
        let role = content
            .get("role")
            .and_then(|v| v.as_str())
            .unwrap_or("user");
        let parts = content
            .get("parts")
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default();

        if let Some(last) = merged_contents.last_mut() {
            let last_role = last.get("role").and_then(|v| v.as_str()).unwrap_or("");
            if last_role == role {
                if let Some(last_parts) = last.get_mut("parts").and_then(|v| v.as_array_mut()) {
                    last_parts.extend(parts);
                    continue;
                }
            }
        }

        merged_contents.push(json!({
            "role": role,
            "parts": parts
        }));
    }

    // Gemini API requires multi-turn conversations to start with a user turn
    if let Some(first) = merged_contents.first() {
        if first.get("role").and_then(|r| r.as_str()) == Some("model") {
            merged_contents.insert(
                0,
                json!({
                    "role": "user",
                    "parts": [{ "text": "Continue" }]
                }),
            );
        }
    }

    if merged_contents.is_empty() {
        merged_contents.push(json!({
            "role": "user",
            "parts": [{ "text": "Hello" }]
        }));
    }

    let system_instruction = if !instructions.trim().is_empty() {
        Some(json!({
            "parts": [{ "text": instructions }]
        }))
    } else {
        None
    };

    let mut tools_list: Vec<Value> = Vec::new();
    if let Some(tools_val) = input.get("tools").and_then(|v| v.as_array()) {
        let mut declarations: Vec<Value> = Vec::new();
        for t in tools_val {
            let t_type = t.get("type").and_then(|v| v.as_str()).unwrap_or("");
            if t_type == "function" {
                let name = t
                    .get("name")
                    .or_else(|| t.get("function").and_then(|f| f.get("name")));
                let desc = t
                    .get("description")
                    .or_else(|| t.get("function").and_then(|f| f.get("description")));
                let params = t
                    .get("parameters")
                    .or_else(|| t.get("function").and_then(|f| f.get("parameters")));

                if let Some(name_str) = name.and_then(|v| v.as_str()) {
                    let desc_str = desc.and_then(|v| v.as_str()).unwrap_or("");
                    let mut params_obj = params
                        .cloned()
                        .unwrap_or_else(|| json!({ "type": "object" }));
                    clean_gemini_schema(&mut params_obj);

                    declarations.push(json!({
                        "name": name_str,
                        "description": desc_str,
                        "parameters": params_obj
                    }));
                }
            }
        }
        if !declarations.is_empty() {
            tools_list.push(json!({
                "functionDeclarations": declarations
            }));
        }
    }

    // Reasoning / Thinking configuration mapping for Antigravity models
    let reasoning_effort = input
        .get("reasoning")
        .and_then(|r| r.get("effort"))
        .and_then(|e| e.as_str())
        .or_else(|| input.get("reasoning_effort").and_then(|e| e.as_str()))
        .unwrap_or("medium");

    let thinking_config = match reasoning_effort {
        "none" | "disabled" => json!({
            "includeThoughts": false,
            "thinkingBudget": 0
        }),
        "low" | "minimal" => json!({
            "includeThoughts": true,
            "thinkingBudget": 2048
        }),
        "medium" => json!({
            "includeThoughts": true,
            "thinkingBudget": 8192
        }),
        "high" | "max" => json!({
            "includeThoughts": true,
            "thinkingBudget": 24576
        }),
        "ultra" | "xhigh" => json!({
            "includeThoughts": true,
            "thinkingBudget": 65536
        }),
        _ => json!({
            "includeThoughts": true,
            "thinkingBudget": 8192
        }),
    };

    let generation_config = json!({
        "temperature": input.get("temperature").and_then(|t| t.as_f64()).unwrap_or(0.2),
        "maxOutputTokens": 65536,
        "thinkingConfig": thinking_config
    });

    let mut request_obj = json!({
        "contents": merged_contents,
        "generationConfig": generation_config
    });

    if let Some(sys) = system_instruction {
        request_obj["systemInstruction"] = sys;
    }
    if !tools_list.is_empty() {
        request_obj["tools"] = json!(tools_list);
    }

    let project = input
        .get("project")
        .and_then(|v| v.as_str())
        .or_else(|| input.get("project_id").and_then(|v| v.as_str()))
        .map(|s| s.to_string())
        .or_else(|| {
            std::env::var("ANTIGRAVITY_PROJECT_ID")
                .or_else(|_| std::env::var("GOOGLE_CLOUD_PROJECT"))
                .or_else(|_| std::env::var("CLOUDSDK_CORE_PROJECT"))
                .ok()
        });

    let mut result = json!({
        "model": raw_model,
        "request": request_obj
    });

    if let Some(project) = project {
        let trimmed = project.trim();
        if !trimmed.is_empty() {
            result["project"] = json!(trimmed);
        }
    }

    result
}

fn parse_base64_data_url(url: &str) -> Option<(String, String)> {
    if !url.starts_with("data:") {
        return None;
    }
    let after_data = &url[5..];
    let (mime_part, base64_part) = after_data.split_once(";base64,")?;
    Some((mime_part.to_string(), base64_part.to_string()))
}

fn now_millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}

/// Converts a streaming byte stream from Google Cloud Code PA to OpenAI Responses SSE byte events.
pub fn adapt_antigravity_stream(stream: ByteStream) -> ByteStream {
    let (tx, rx) = tokio::sync::mpsc::channel::<Result<Bytes, TransportError>>(100);

    tokio::spawn(async move {
        let mut stream = stream;
        let mut byte_buffer: Vec<u8> = Vec::new();

        let response_id = format!("resp_ag_{}", now_millis());
        let mut created_emitted = false;
        let mut output_index: usize = 0;

        let mut current_thought_active = false;
        let mut current_thought_index: usize = 0;
        let mut accumulated_thought = String::new();

        let mut current_msg_active = false;
        let mut current_msg_index: usize = 0;
        let mut current_msg_part_added = false;
        let mut accumulated_text = String::new();

        let mut prompt_tokens: i64 = 0;
        let mut candidates_tokens: i64 = 0;
        let mut thoughts_tokens: i64 = 0;
        let mut total_tokens: i64 = 0;

        while let Some(chunk_result) = stream.next().await {
            match chunk_result {
                Ok(bytes) => {
                    byte_buffer.extend_from_slice(&bytes);

                    while let Some(newline_pos) = byte_buffer.iter().position(|&b| b == b'\n') {
                        let line_bytes = &byte_buffer[..newline_pos];
                        let line = String::from_utf8_lossy(line_bytes).trim().to_string();
                        byte_buffer.drain(..=newline_pos);

                        if line.is_empty() {
                            continue;
                        }

                        if let Some(json_str) = line.strip_prefix("data:") {
                            let json_str = json_str.trim();
                            if json_str.is_empty() || json_str == "[DONE]" {
                                continue;
                            }

                            if let Ok(val) = serde_json::from_str::<Value>(json_str) {
                                if !created_emitted {
                                    created_emitted = true;
                                    let created_event = format!(
                                        "event: response.created\ndata: {}\n\n",
                                        json!({
                                            "type": "response.created",
                                            "response": {
                                                "id": response_id,
                                                "status": "in_progress",
                                                "output": []
                                            }
                                        })
                                    );
                                    let _ = tx.send(Ok(Bytes::from(created_event))).await;
                                }

                                let resp_node = val.get("response").unwrap_or(&val);
                                if let Some(candidates) =
                                    resp_node.get("candidates").and_then(|v| v.as_array())
                                {
                                    for candidate in candidates {
                                        if let Some(parts) = candidate
                                            .get("content")
                                            .and_then(|c| c.get("parts"))
                                            .and_then(|p| p.as_array())
                                        {
                                            for part in parts {
                                                // A. Thought / Reasoning
                                                if part
                                                    .get("thought")
                                                    .and_then(|v| v.as_bool())
                                                    .unwrap_or(false)
                                                    || (part.get("thought").is_some()
                                                        && part.get("text").is_some())
                                                {
                                                    if let Some(thought_text) =
                                                        part.get("text").and_then(|v| v.as_str())
                                                    {
                                                        if !current_thought_active {
                                                            if current_msg_active {
                                                                current_msg_active = false;
                                                                let text_done = format!(
                                                                    "event: response.output_text.done\ndata: {}\n\n",
                                                                    json!({
                                                                        "type": "response.output_text.done",
                                                                        "output_index": current_msg_index,
                                                                        "content_index": 0,
                                                                        "text": accumulated_text
                                                                    })
                                                                );
                                                                let _ = tx
                                                                    .send(Ok(Bytes::from(
                                                                        text_done,
                                                                    )))
                                                                    .await;

                                                                let done_ev = format!(
                                                                    "event: response.output_item.done\ndata: {}\n\n",
                                                                    json!({
                                                                        "type": "response.output_item.done",
                                                                        "output_index": current_msg_index,
                                                                        "item": {
                                                                            "id": format!("msg_{current_msg_index}"),
                                                                            "type": "message",
                                                                            "role": "assistant",
                                                                            "content": [{ "type": "output_text", "text": accumulated_text }]
                                                                        }
                                                                    })
                                                                );
                                                                let _ = tx
                                                                    .send(Ok(Bytes::from(done_ev)))
                                                                    .await;
                                                            }

                                                            current_thought_active = true;
                                                            current_thought_index = output_index;
                                                            accumulated_thought.clear();
                                                            output_index += 1;

                                                            let add_ev = format!(
                                                                "event: response.output_item.added\ndata: {}\n\n",
                                                                json!({
                                                                    "type": "response.output_item.added",
                                                                    "output_index": current_thought_index,
                                                                    "item": {
                                                                        "id": format!("thought_{current_thought_index}"),
                                                                        "type": "reasoning",
                                                                        "summary": [],
                                                                        "content": []
                                                                    }
                                                                })
                                                            );
                                                            let _ = tx
                                                                .send(Ok(Bytes::from(add_ev)))
                                                                .await;
                                                        }

                                                        accumulated_thought.push_str(thought_text);
                                                        let delta_ev = format!(
                                                            "event: response.reasoning_text.delta\ndata: {}\n\n",
                                                            json!({
                                                                "type": "response.reasoning_text.delta",
                                                                "output_index": current_thought_index,
                                                                "content_index": 0,
                                                                "delta": thought_text
                                                            })
                                                        );
                                                        let _ = tx
                                                            .send(Ok(Bytes::from(delta_ev)))
                                                            .await;
                                                    }
                                                }
                                                // B. Regular text
                                                else if let Some(delta_text) =
                                                    part.get("text").and_then(|v| v.as_str())
                                                {
                                                    if current_thought_active {
                                                        current_thought_active = false;
                                                        let done_ev = format!(
                                                            "event: response.output_item.done\ndata: {}\n\n",
                                                            json!({
                                                                "type": "response.output_item.done",
                                                                "output_index": current_thought_index,
                                                                "item": {
                                                                    "id": format!("thought_{current_thought_index}"),
                                                                    "type": "reasoning",
                                                                    "summary": [],
                                                                    "content": [{ "type": "reasoning_text", "text": accumulated_thought }]
                                                                }
                                                            })
                                                        );
                                                        let _ =
                                                            tx.send(Ok(Bytes::from(done_ev))).await;
                                                    }

                                                    if !current_msg_active {
                                                        current_msg_active = true;
                                                        current_msg_index = output_index;
                                                        accumulated_text.clear();
                                                        output_index += 1;
                                                        current_msg_part_added = false;

                                                        let add_ev = format!(
                                                            "event: response.output_item.added\ndata: {}\n\n",
                                                            json!({
                                                                "type": "response.output_item.added",
                                                                "output_index": current_msg_index,
                                                                "item": {
                                                                    "id": format!("msg_{current_msg_index}"),
                                                                    "type": "message",
                                                                    "role": "assistant",
                                                                    "content": [{ "type": "output_text", "text": "" }]
                                                                }
                                                            })
                                                        );
                                                        let _ =
                                                            tx.send(Ok(Bytes::from(add_ev))).await;
                                                    }

                                                    if !current_msg_part_added {
                                                        current_msg_part_added = true;
                                                        let part_ev = format!(
                                                            "event: response.content_part.added\ndata: {}\n\n",
                                                            json!({
                                                                "type": "response.content_part.added",
                                                                "output_index": current_msg_index,
                                                                "content_index": 0,
                                                                "part": { "type": "output_text", "text": "" }
                                                            })
                                                        );
                                                        let _ =
                                                            tx.send(Ok(Bytes::from(part_ev))).await;
                                                    }

                                                    accumulated_text.push_str(delta_text);
                                                    let text_ev = format!(
                                                        "event: response.output_text.delta\ndata: {}\n\n",
                                                        json!({
                                                            "type": "response.output_text.delta",
                                                            "output_index": current_msg_index,
                                                            "content_index": 0,
                                                            "delta": delta_text
                                                        })
                                                    );
                                                    let _ = tx.send(Ok(Bytes::from(text_ev))).await;
                                                }
                                                // C. Function Call
                                                else if let Some(fc) = part.get("functionCall") {
                                                    if current_thought_active {
                                                        current_thought_active = false;
                                                        let done_ev = format!(
                                                            "event: response.output_item.done\ndata: {}\n\n",
                                                            json!({
                                                                "type": "response.output_item.done",
                                                                "output_index": current_thought_index,
                                                                "item": {
                                                                    "id": format!("thought_{current_thought_index}"),
                                                                    "type": "reasoning",
                                                                    "summary": [],
                                                                    "content": [{ "type": "reasoning_text", "text": accumulated_thought }]
                                                                }
                                                            })
                                                        );
                                                        let _ =
                                                            tx.send(Ok(Bytes::from(done_ev))).await;
                                                    }
                                                    if current_msg_active {
                                                        current_msg_active = false;
                                                        let text_done = format!(
                                                            "event: response.output_text.done\ndata: {}\n\n",
                                                            json!({
                                                                "type": "response.output_text.done",
                                                                "output_index": current_msg_index,
                                                                "content_index": 0,
                                                                "text": accumulated_text
                                                            })
                                                        );
                                                        let _ = tx
                                                            .send(Ok(Bytes::from(text_done)))
                                                            .await;

                                                        let done_ev = format!(
                                                            "event: response.output_item.done\ndata: {}\n\n",
                                                            json!({
                                                                "type": "response.output_item.done",
                                                                "output_index": current_msg_index,
                                                                "item": {
                                                                    "id": format!("msg_{current_msg_index}"),
                                                                    "type": "message",
                                                                    "role": "assistant",
                                                                    "content": [{ "type": "output_text", "text": accumulated_text }]
                                                                }
                                                            })
                                                        );
                                                        let _ =
                                                            tx.send(Ok(Bytes::from(done_ev))).await;
                                                    }

                                                    let fn_name = fc
                                                        .get("name")
                                                        .and_then(|v| v.as_str())
                                                        .unwrap_or("tool");
                                                    let fn_args = fc
                                                        .get("args")
                                                        .cloned()
                                                        .unwrap_or_else(|| json!({}));
                                                    let args_str = serde_json::to_string(&fn_args)
                                                        .unwrap_or_default();
                                                    let call_id = format!(
                                                        "call_{}_{}",
                                                        fn_name,
                                                        now_millis() % 100000
                                                    );
                                                    let call_idx = output_index;
                                                    output_index += 1;

                                                    let add_call = format!(
                                                        "event: response.output_item.added\ndata: {}\n\n",
                                                        json!({
                                                            "type": "response.output_item.added",
                                                            "output_index": call_idx,
                                                            "item": {
                                                                "id": call_id,
                                                                "type": "function_call",
                                                                "name": fn_name,
                                                                "call_id": call_id,
                                                                "arguments": ""
                                                            }
                                                        })
                                                    );
                                                    let _ =
                                                        tx.send(Ok(Bytes::from(add_call))).await;

                                                    let delta_args = format!(
                                                        "event: response.function_call_arguments.delta\ndata: {}\n\n",
                                                        json!({
                                                            "type": "response.function_call_arguments.delta",
                                                            "output_index": call_idx,
                                                            "call_id": call_id,
                                                            "delta": args_str
                                                        })
                                                    );
                                                    let _ =
                                                        tx.send(Ok(Bytes::from(delta_args))).await;

                                                    let done_args = format!(
                                                        "event: response.function_call_arguments.done\ndata: {}\n\n",
                                                        json!({
                                                            "type": "response.function_call_arguments.done",
                                                            "output_index": call_idx,
                                                            "call_id": call_id,
                                                            "arguments": args_str
                                                        })
                                                    );
                                                    let _ =
                                                        tx.send(Ok(Bytes::from(done_args))).await;

                                                    let done_item = format!(
                                                        "event: response.output_item.done\ndata: {}\n\n",
                                                        json!({
                                                            "type": "response.output_item.done",
                                                            "output_index": call_idx,
                                                            "item": {
                                                                "id": call_id,
                                                                "type": "function_call",
                                                                "name": fn_name,
                                                                "call_id": call_id,
                                                                "arguments": args_str
                                                            }
                                                        })
                                                    );
                                                    let _ =
                                                        tx.send(Ok(Bytes::from(done_item))).await;
                                                }
                                            }
                                        }
                                    }
                                }

                                if let Some(usage) = resp_node.get("usageMetadata") {
                                    if let Some(p) =
                                        usage.get("promptTokenCount").and_then(|v| v.as_i64())
                                    {
                                        prompt_tokens = p;
                                    }
                                    if let Some(c) =
                                        usage.get("candidatesTokenCount").and_then(|v| v.as_i64())
                                    {
                                        candidates_tokens = c;
                                    }
                                    if let Some(th) =
                                        usage.get("thoughtsTokenCount").and_then(|v| v.as_i64())
                                    {
                                        thoughts_tokens = th;
                                    }
                                    if let Some(t) =
                                        usage.get("totalTokenCount").and_then(|v| v.as_i64())
                                    {
                                        total_tokens = t;
                                    }
                                }

                                if let Some(err) = val.get("error") {
                                    let msg = err
                                        .get("message")
                                        .and_then(|v| v.as_str())
                                        .unwrap_or("Antigravity API error");
                                    let err_ev = format!(
                                        "event: error\ndata: {}\n\n",
                                        json!({
                                            "type": "error",
                                            "code": "antigravity_error",
                                            "message": msg
                                        })
                                    );
                                    let _ = tx.send(Ok(Bytes::from(err_ev))).await;
                                }
                            }
                        }
                    }
                }
                Err(e) => {
                    let _ = tx.send(Err(e)).await;
                    return;
                }
            }
        }

        if current_thought_active {
            let done_ev = format!(
                "event: response.output_item.done\ndata: {}\n\n",
                json!({
                    "type": "response.output_item.done",
                    "output_index": current_thought_index,
                    "item": {
                        "id": format!("thought_{current_thought_index}"),
                        "type": "reasoning",
                        "summary": [],
                        "content": [{ "type": "reasoning_text", "text": accumulated_thought }]
                    }
                })
            );
            let _ = tx.send(Ok(Bytes::from(done_ev))).await;
        }

        if current_msg_active {
            let text_done = format!(
                "event: response.output_text.done\ndata: {}\n\n",
                json!({
                    "type": "response.output_text.done",
                    "output_index": current_msg_index,
                    "content_index": 0,
                    "text": accumulated_text
                })
            );
            let _ = tx.send(Ok(Bytes::from(text_done))).await;

            let item_done = format!(
                "event: response.output_item.done\ndata: {}\n\n",
                json!({
                    "type": "response.output_item.done",
                    "output_index": current_msg_index,
                    "item": {
                        "id": format!("msg_{current_msg_index}"),
                        "type": "message",
                        "role": "assistant",
                        "content": [{ "type": "output_text", "text": accumulated_text }]
                    }
                })
            );
            let _ = tx.send(Ok(Bytes::from(item_done))).await;
        }

        let completed_ev = format!(
            "event: response.completed\ndata: {}\n\n",
            json!({
                "type": "response.completed",
                "response": {
                    "id": response_id,
                    "status": "completed",
                    "output": [],
                    "usage": {
                        "input_tokens": prompt_tokens,
                        "output_tokens": candidates_tokens,
                        "output_tokens_details": {
                            "reasoning_tokens": thoughts_tokens
                        },
                        "total_tokens": if total_tokens > 0 { total_tokens } else { prompt_tokens + candidates_tokens }
                    }
                }
            })
        );
        let _ = tx.send(Ok(Bytes::from(completed_ev))).await;
    });

    let output_stream = futures::stream::unfold(rx, |mut rx| async move {
        rx.recv().await.map(|item| (item, rx))
    });

    Box::pin(output_stream)
}

/// Converts a non-streaming Response from Google Cloud Code PA into OpenAI Responses JSON format.
pub fn adapt_antigravity_response(resp: Response) -> Result<Response, TransportError> {
    if !resp.status.is_success() {
        return Ok(resp);
    }

    let Ok(val) = serde_json::from_slice::<Value>(&resp.body) else {
        return Ok(resp);
    };

    let resp_node = val.get("response").unwrap_or(&val);
    let mut outputs: Vec<Value> = Vec::new();
    let mut item_id = 0;

    if let Some(candidates) = resp_node.get("candidates").and_then(|v| v.as_array()) {
        for candidate in candidates {
            if let Some(parts) = candidate
                .get("content")
                .and_then(|c| c.get("parts"))
                .and_then(|p| p.as_array())
            {
                for part in parts {
                    if part
                        .get("thought")
                        .and_then(|v| v.as_bool())
                        .unwrap_or(false)
                        || (part.get("thought").is_some() && part.get("text").is_some())
                    {
                        if let Some(thought_text) = part.get("text").and_then(|v| v.as_str()) {
                            outputs.push(json!({
                                "id": format!("thought_{item_id}"),
                                "type": "reasoning",
                                "summary": [],
                                "content": [{ "type": "reasoning_text", "text": thought_text }]
                            }));
                            item_id += 1;
                        }
                    } else if let Some(text) = part.get("text").and_then(|v| v.as_str()) {
                        outputs.push(json!({
                            "id": format!("msg_{item_id}"),
                            "type": "message",
                            "role": "assistant",
                            "content": [{ "type": "output_text", "text": text }]
                        }));
                        item_id += 1;
                    } else if let Some(fc) = part.get("functionCall") {
                        let fn_name = fc.get("name").and_then(|v| v.as_str()).unwrap_or("tool");
                        let fn_args = fc.get("args").cloned().unwrap_or_else(|| json!({}));
                        let call_id = format!("call_{}_{}", fn_name, now_millis() % 100000);
                        outputs.push(json!({
                            "id": call_id,
                            "type": "function_call",
                            "name": fn_name,
                            "call_id": call_id,
                            "arguments": serde_json::to_string(&fn_args).unwrap_or_default()
                        }));
                        item_id += 1;
                    }
                }
            }
        }
    }

    let mut prompt_tokens: i64 = 0;
    let mut candidates_tokens: i64 = 0;
    let mut thoughts_tokens: i64 = 0;
    let mut total_tokens: i64 = 0;

    if let Some(usage) = resp_node.get("usageMetadata") {
        prompt_tokens = usage
            .get("promptTokenCount")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);
        candidates_tokens = usage
            .get("candidatesTokenCount")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);
        thoughts_tokens = usage
            .get("thoughtsTokenCount")
            .and_then(|v| v.as_i64())
            .unwrap_or(0);
        total_tokens = usage
            .get("totalTokenCount")
            .and_then(|v| v.as_i64())
            .unwrap_or(prompt_tokens + candidates_tokens);
    }

    let transformed = json!({
        "id": format!("resp_ag_{}", now_millis()),
        "status": "completed",
        "output": outputs,
        "usage": {
            "input_tokens": prompt_tokens,
            "output_tokens": candidates_tokens,
            "output_tokens_details": {
                "reasoning_tokens": thoughts_tokens
            },
            "total_tokens": total_tokens
        }
    });

    let bytes = serde_json::to_vec(&transformed).unwrap_or_default();
    Ok(Response {
        status: resp.status,
        headers: resp.headers,
        body: Bytes::from(bytes),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_transform_responses_to_gemini_basic() {
        let input = json!({
            "model": "antigravity/gemini-3.7-flash",
            "instructions": "You are a helpful coding assistant.",
            "reasoning": { "effort": "ultra" },
            "input": [
                {
                    "type": "message",
                    "role": "user",
                    "content": [{ "type": "text", "text": "Hello world" }]
                }
            ],
            "tools": [
                {
                    "type": "function",
                    "name": "exec_command",
                    "description": "Runs shell commands",
                    "parameters": {
                        "$schema": "http://json-schema.org/draft-07/schema#",
                        "type": "object",
                        "properties": {
                            "cmd": { "type": "string" }
                        },
                        "required": ["cmd"]
                    }
                }
            ]
        });

        let transformed = transform_responses_to_gemini(&input);
        assert_eq!(transformed["model"], "gemini-3.7-flash");
        assert_eq!(transformed.get("project"), None);

        let req = &transformed["request"];
        assert_eq!(
            req["systemInstruction"]["parts"][0]["text"],
            "You are a helpful coding assistant."
        );
        assert_eq!(
            req["generationConfig"]["thinkingConfig"]["thinkingBudget"],
            65536
        );
        assert_eq!(req["contents"][0]["role"], "user");
        assert_eq!(req["contents"][0]["parts"][0]["text"], "Hello world");

        let decl = &req["tools"][0]["functionDeclarations"][0];
        assert_eq!(decl["name"], "exec_command");
        assert!(
            !decl["parameters"]
                .as_object()
                .unwrap()
                .contains_key("$schema")
        );
    }


    #[test]
    fn test_transform_with_explicit_project() {
        let input = json!({
            "model": "antigravity/gemini-2.5-pro",
            "project": "custom-cloud-project-123",
            "input": [
                {
                    "type": "message",
                    "role": "user",
                    "content": [{ "type": "text", "text": "Testing project param" }]
                }
            ]
        });

        let transformed = transform_responses_to_gemini(&input);
        assert_eq!(transformed["model"], "gemini-2.5-pro");
        assert_eq!(transformed["project"], "custom-cloud-project-123");
    }

    #[test]
    fn test_consecutive_turns_merged() {
        let input = json!({
            "model": "gemini-3.7-flash",
            "input": [
                {
                    "type": "message",
                    "role": "user",
                    "content": [{ "type": "text", "text": "First prompt" }]
                },
                {
                    "type": "function_call_output",
                    "name": "exec_command",
                    "output": "Command output here"
                }
            ]
        });

        let transformed = transform_responses_to_gemini(&input);
        let contents = transformed["request"]["contents"].as_array().unwrap();
        // Consecutive user-role items merged into one
        assert_eq!(contents.len(), 1);
        assert_eq!(contents[0]["role"], "user");
        assert_eq!(contents[0]["parts"].as_array().unwrap().len(), 2);
    }
}
