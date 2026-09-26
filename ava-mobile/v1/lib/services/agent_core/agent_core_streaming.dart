import "dart:async";
import "../../models/app_models.dart";
import "agent_core_base.dart";

mixin AgentCoreStreamingMixin on AgentCoreBase {
  final Set<StreamController<Map<String, dynamic>>> _activePromptControllers = {};
  final Set<StreamSubscription> _activePromptSubscriptions = {};

  // ─── Interrupt Turn ───────────────────────────────────────────────────────
  Future<void> interruptSession(String sessionId) async {
    AgentCoreBase.addDebugLog("Interrupting session: $sessionId");
    activeRunningSessionId = null;

    for (final ctrl in List<StreamController<Map<String, dynamic>>>.from(_activePromptControllers)) {
      if (!ctrl.isClosed) {
        try {
          ctrl.add({
            "type": "done",
            "status": "interrupted",
            "reply": "Turn stopped by user.",
            "sessionId": sessionId,
          });
          ctrl.close();
        } catch (_) {}
      }
    }
    _activePromptControllers.clear();

    try {
      await sendRpc("turn/interrupt", {
        "threadId": sessionId,
      });
      AgentCoreBase.addDebugLog("Turn interrupted via turn/interrupt on AvA Core");
    } catch (err) {
      AgentCoreBase.addDebugLog("interruptSession RPC error: $err");
    }
  }

  // ─── Question & Permission Replies ────────────────────────────────────────
  Future<bool> replyQuestion(String requestId, dynamic answer, {String? sessionId}) async {
    try {
      await sendRpc("thread/approveGuardianDeniedAction", {
        "threadId": sessionId ?? lastActiveSessionId ?? "",
        "requestId": requestId,
        "answer": answer,
      });
      return true;
    } catch (err) {
      AgentCoreBase.addDebugLog("replyQuestion error: $err");
      return false;
    }
  }

  Future<bool> replyPermission(String requestId, bool approved, {String? sessionId, String? command}) async {
    try {
      await sendRpc("thread/approveGuardianDeniedAction", {
        "threadId": sessionId ?? lastActiveSessionId ?? "",
        "requestId": requestId,
        "approved": approved,
        if (command != null) "command": command,
      });
      return true;
    } catch (err) {
      AgentCoreBase.addDebugLog("replyPermission error: $err");
      return false;
    }
  }

  // ─── Direct Prompt Sending ────────────────────────────────────────────────
  Future<Map<String, dynamic>?> sendPrompt({
    required String prompt,
    String? sessionId,
    String? mode,
    String? agent,
  }) async {
    final sessId = sessionId ?? lastActiveSessionId;
    if (sessId == null || sessId.isEmpty) return null;
    try {
      final res = await sendRpc("turn/start", {
        "threadId": sessId,
        "input": [
          {"type": "text", "text": prompt}
        ],
      });
      if (res is Map) return Map<String, dynamic>.from(res);
    } catch (err) {
      AgentCoreBase.addDebugLog("sendPrompt error: $err");
    }
    return null;
  }

  // ─── Prompt Streaming (Native JSON-RPC 2.0 Notification Stream) ───────────
  Stream<Map<String, dynamic>> sendPromptStream({
    required String prompt,
    required String modelId,
    required String provider,
    required String mode,
    String? agent,
    String? sessionId,
    List<String>? attachments,
    String reasoningEffort = "max",
  }) {
    final controller = StreamController<Map<String, dynamic>>();
    _activePromptControllers.add(controller);

    () async {
      StreamSubscription? eventSub;
      bool isFinished = false;

      controller.onCancel = () {
        isFinished = true;
        activeRunningSessionId = null;
        eventSub?.cancel();
        _activePromptControllers.remove(controller);
        if (eventSub != null) _activePromptSubscriptions.remove(eventSub);
      };

      try {
        await ensureSseConnected();

        String activeThreadId = (sessionId != null && sessionId.isNotEmpty) ? sessionId.trim() : "";
        final bool isValidUuid = RegExp(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$").hasMatch(activeThreadId);

        // If no active thread ID or invalid UUID format, start a new thread via thread/start
        if (activeThreadId.isEmpty || !isValidUuid) {
          final startParams = <String, dynamic>{
            "cwd": workspacePath.isNotEmpty ? workspacePath : "/",
          };
          if (modelId.isNotEmpty) {
            startParams["model"] = AgentCoreBase.normalizeModelId(modelId);
          }
          if (reasoningEffort.isNotEmpty) {
            startParams["effort"] = reasoningEffort.toLowerCase();
          }
          final threadRes = await sendRpc("thread/start", startParams);
          if (threadRes is Map && threadRes["thread"] is Map) {
            activeThreadId = threadRes["thread"]["id"]?.toString() ?? "";
          }
          if (activeThreadId.isEmpty) {
            final errMsg = "Failed to start thread on AvA Core: $threadRes";
            controller.add({
              "type": "done",
              "status": "error",
              "reply": errMsg,
            });
            controller.close();
            return;
          }
          lastActiveSessionId = activeThreadId;
          AgentCoreBase.addDebugLog("Created fresh AvA Core thread: $activeThreadId");
        }

        activeRunningSessionId = activeThreadId;

        // Emit session/thread ID
        controller.add({"type": "session_id", "sessionId": activeThreadId});
        controller.add({"type": "sessionId", "sessionId": activeThreadId});
        controller.add({"type": "turn_started", "sessionId": activeThreadId});

        // State accumulators for real-time agentic loop
        final Map<String, MessagePartModel> livePartsMap = {};
        final List<String> partOrder = [];
        final String cleanPrompt = prompt.trim();

        void emitLivePartsUpdate() {
          if (isFinished || controller.isClosed) return;
          final List<MessagePartModel> orderedParts = [];
          for (final id in partOrder) {
            final p = livePartsMap[id];
            if (p != null) {
              if (p.type == "text" && p.text.trim() == cleanPrompt) continue;
              orderedParts.add(p);
            }
          }
          String totalText = "";
          String totalReasoning = "";
          for (final p in orderedParts) {
            if (p.type == "text" && p.text.isNotEmpty && p.text.trim() != cleanPrompt) {
              totalText += (totalText.isNotEmpty ? "\n\n" : "") + p.text;
            } else if (p.type == "reasoning" && p.text.isNotEmpty) {
              totalReasoning += (totalReasoning.isNotEmpty ? "\n\n" : "") + p.text;
            }
          }
          controller.add({
            "type": "parts_update",
            "parts": orderedParts,
            "text": totalText,
            "reasoning": totalReasoning,
            "sessionId": activeThreadId,
          });
        }

        void finishTurn([Map<String, dynamic>? completionData]) {
          if (isFinished) return;
          isFinished = true;
          activeRunningSessionId = null;
          eventSub?.cancel();
          if (!controller.isClosed) {
            if (completionData != null) {
              controller.add(completionData);
            } else {
              final List<MessagePartModel> orderedParts = [];
              for (final id in partOrder) {
                final p = livePartsMap[id];
                if (p != null && (p.type != "text" || p.text.trim() != cleanPrompt)) {
                  orderedParts.add(p);
                }
              }
              String totalText = "";
              for (final p in orderedParts) {
                if (p.type == "text" && p.text.isNotEmpty) {
                  totalText += (totalText.isNotEmpty ? "\n\n" : "") + p.text;
                }
              }
              controller.add({
                "type": "done",
                "status": "completed",
                "reply": totalText.isNotEmpty ? totalText : "Task completed.",
                "parts": orderedParts,
                "sessionId": activeThreadId,
              });
            }
            controller.close();
          }
        }

        // Attach listener for native JSON-RPC notifications from AvA Core
        eventSub = eventStream.listen((event) {
          if (isFinished || controller.isClosed) return;

          final method = event["method"]?.toString() ?? event["type"]?.toString() ?? "";
          final params = (event["params"] is Map)
              ? Map<String, dynamic>.from(event["params"] as Map)
              : ((event["data"] is Map) ? Map<String, dynamic>.from(event["data"] as Map) : <String, dynamic>{});

          final targetThreadId = params["threadId"]?.toString() ?? event["threadId"]?.toString();
          if (targetThreadId != null && targetThreadId.isNotEmpty && targetThreadId != activeThreadId) {
            return;
          }

          // 1. item/started
          if (method == "item/started") {
            final rawItem = params["item"];
            if (rawItem is Map) {
              final itemMap = Map<String, dynamic>.from(rawItem);
              final itemId = itemMap["id"]?.toString() ?? "item_${DateTime.now().millisecondsSinceEpoch}";
              final itemType = itemMap["type"]?.toString() ?? "agentMessage";

              if (itemType == "agentMessage") {
                final initialText = itemMap["text"]?.toString() ?? "";
                livePartsMap[itemId] = MessagePartModel(
                  id: itemId,
                  messageId: itemId,
                  turnId: params["turnId"]?.toString(),
                  type: "text",
                  text: initialText,
                  status: "running",
                );
                if (!partOrder.contains(itemId)) partOrder.add(itemId);
                controller.add({
                  "type": "text",
                  "id": itemId,
                  "delta": initialText,
                  "text": initialText,
                  "status": "running",
                });
              } else if (itemType == "reasoning") {
                livePartsMap[itemId] = MessagePartModel(
                  id: itemId,
                  messageId: itemId,
                  turnId: params["turnId"]?.toString(),
                  type: "reasoning",
                  text: "",
                  status: "running",
                );
                if (!partOrder.contains(itemId)) partOrder.add(itemId);
              } else if (itemType == "commandExecution") {
                final cmd = itemMap["command"]?.toString() ?? "";
                livePartsMap[itemId] = MessagePartModel(
                  id: itemId,
                  callId: itemId,
                  messageId: itemId,
                  turnId: params["turnId"]?.toString(),
                  type: "tool",
                  tool: "command",
                  input: {"command": cmd, "cwd": itemMap["cwd"]},
                  status: "running",
                );
                if (!partOrder.contains(itemId)) partOrder.add(itemId);
                controller.add({
                  "type": "tool_use",
                  "id": itemId,
                  "callID": itemId,
                  "tool": "command",
                  "status": "running",
                  "input": {"command": cmd},
                });
              } else if (itemType == "fileChange") {
                final filePath = itemMap["path"]?.toString() ?? itemMap["filePath"]?.toString() ?? "";
                livePartsMap[itemId] = MessagePartModel(
                  id: itemId,
                  callId: itemId,
                  messageId: itemId,
                  turnId: params["turnId"]?.toString(),
                  type: "tool",
                  tool: "file_change",
                  input: {"path": filePath},
                  status: "running",
                );
                if (!partOrder.contains(itemId)) partOrder.add(itemId);
              } else if (itemType == "mcpToolCall" || itemType == "dynamicToolCall" || itemType == "collabAgentToolCall") {
                final toolName = itemMap["tool"]?.toString() ?? itemMap["name"]?.toString() ?? "tool";
                livePartsMap[itemId] = MessagePartModel(
                  id: itemId,
                  callId: itemId,
                  messageId: itemId,
                  turnId: params["turnId"]?.toString(),
                  type: "tool",
                  tool: toolName,
                  input: itemMap["args"] ?? itemMap["input"] ?? itemMap["arguments"],
                  status: "running",
                );
                if (!partOrder.contains(itemId)) partOrder.add(itemId);
              } else if (itemType == "subAgentActivity") {
                final kind = itemMap["kind"]?.toString() ?? "subagent";
                final agentPath = itemMap["agentPath"]?.toString() ?? "";
                livePartsMap[itemId] = MessagePartModel(
                  id: itemId,
                  messageId: itemId,
                  turnId: params["turnId"]?.toString(),
                  type: "subagent",
                  tool: "agent",
                  text: agentPath,
                  status: "running",
                );
                if (!partOrder.contains(itemId)) partOrder.add(itemId);
              } else if (itemType == "plan") {
                final planText = itemMap["text"]?.toString() ?? "";
                livePartsMap[itemId] = MessagePartModel(
                  id: itemId,
                  messageId: itemId,
                  turnId: params["turnId"]?.toString(),
                  type: "step",
                  text: planText,
                  status: "running",
                );
                if (!partOrder.contains(itemId)) partOrder.add(itemId);
              }
              emitLivePartsUpdate();
            }
          }
          // 2. item/agentMessage/delta
          else if (method == "item/agentMessage/delta") {
            final itemId = params["itemId"]?.toString();
            final delta = params["delta"]?.toString() ?? "";
            if (delta.isNotEmpty) {
              final targetKey = (itemId != null && livePartsMap.containsKey(itemId))
                  ? itemId
                  : (partOrder.isNotEmpty ? partOrder.last : "msg_live");

              if (livePartsMap.containsKey(targetKey)) {
                final existing = livePartsMap[targetKey]!;
                livePartsMap[targetKey] = existing.copyWith(text: existing.text + delta, status: "running");
              } else {
                livePartsMap[targetKey] = MessagePartModel(
                  id: targetKey,
                  type: "text",
                  text: delta,
                  status: "running",
                );
                partOrder.add(targetKey);
              }

              controller.add({
                "type": "text",
                "id": targetKey,
                "delta": delta,
                "text": livePartsMap[targetKey]!.text,
                "status": "running",
              });
              emitLivePartsUpdate();
            }
          }
          // 3. item/reasoning/textDelta & item/reasoning/summaryTextDelta
          else if (method == "item/reasoning/textDelta" || method == "item/reasoning/summaryTextDelta") {
            final itemId = params["itemId"]?.toString();
            final delta = params["delta"]?.toString() ?? "";
            if (delta.isNotEmpty) {
              final targetKey = (itemId != null && livePartsMap.containsKey(itemId))
                  ? itemId
                  : (partOrder.isNotEmpty && livePartsMap[partOrder.last]?.type == "reasoning"
                      ? partOrder.last
                      : "reasoning_${DateTime.now().millisecondsSinceEpoch}");

              if (livePartsMap.containsKey(targetKey)) {
                final existing = livePartsMap[targetKey]!;
                livePartsMap[targetKey] = existing.copyWith(text: existing.text + delta, status: "running");
              } else {
                livePartsMap[targetKey] = MessagePartModel(
                  id: targetKey,
                  type: "reasoning",
                  text: delta,
                  status: "running",
                );
                if (!partOrder.contains(targetKey)) partOrder.add(targetKey);
              }

              controller.add({
                "type": "reasoning",
                "id": targetKey,
                "delta": delta,
                "text": livePartsMap[targetKey]!.text,
                "status": "running",
              });
              emitLivePartsUpdate();
            }
          }
          // 4. item/commandExecution/outputDelta
          else if (method == "item/commandExecution/outputDelta") {
            final itemId = params["itemId"]?.toString();
            final delta = params["delta"]?.toString() ?? "";
            if (delta.isNotEmpty) {
              final targetKey = (itemId != null && livePartsMap.containsKey(itemId))
                  ? itemId
                  : (partOrder.isNotEmpty && livePartsMap[partOrder.last]?.tool == "command" ? partOrder.last : null);
              if (targetKey != null && livePartsMap.containsKey(targetKey)) {
                final existing = livePartsMap[targetKey]!;
                final newOutput = (existing.output ?? "") + delta;
                livePartsMap[targetKey] = existing.copyWith(output: newOutput, status: "running");
                controller.add({
                  "type": "tool_use",
                  "id": targetKey,
                  "callID": targetKey,
                  "tool": existing.tool ?? "command",
                  "status": "running",
                  "output": newOutput,
                });
                emitLivePartsUpdate();
              }
            }
          }
          // 5. item/fileChange/patchUpdated
          else if (method == "item/fileChange/patchUpdated") {
            final itemId = params["itemId"]?.toString();
            final patch = params["patch"]?.toString() ?? "";
            if (itemId != null && livePartsMap.containsKey(itemId)) {
              final existing = livePartsMap[itemId]!;
              livePartsMap[itemId] = existing.copyWith(output: patch, status: "running");
              emitLivePartsUpdate();
            }
          }
          // 6. item/completed
          else if (method == "item/completed") {
            final rawItem = params["item"];
            if (rawItem is Map) {
              final itemMap = Map<String, dynamic>.from(rawItem);
              final itemId = itemMap["id"]?.toString();
              if (itemId != null && livePartsMap.containsKey(itemId)) {
                final existing = livePartsMap[itemId]!;
                final outVal = itemMap["aggregatedOutput"] ?? itemMap["output"] ?? itemMap["result"];
                final outStr = outVal != null ? outVal.toString() : existing.output;
                final textVal = itemMap["text"]?.toString();
                final durMs = itemMap["durationMs"] is num ? (itemMap["durationMs"] as num).toInt() : existing.durationMs;
                livePartsMap[itemId] = existing.copyWith(
                  status: "completed",
                  output: (existing.type == "tool") ? (outStr ?? existing.output) : existing.output,
                  text: (existing.type == "text" && textVal != null && textVal.isNotEmpty) ? textVal : existing.text,
                  durationMs: durMs,
                );
                emitLivePartsUpdate();
              }
            }
          }
          // 7. turn/diff/updated or turn/plan/updated
          else if (method == "turn/diff/updated" || method == "turn/plan/updated") {
            emitLivePartsUpdate();
          }
          // 8. error
          else if (method == "error") {
            final errorData = params["error"] ?? params;
            final errorMessage = AgentCoreBase.extractCoreErrorMessage(errorData);
            final willRetry = params["willRetry"] == true;
            if (!willRetry) {
              finishTurn({
                "type": "done",
                "status": "error",
                "reply": errorMessage.isNotEmpty ? errorMessage : "An error occurred during turn execution.",
                "sessionId": activeThreadId,
              });
            }
          }
          // 9. turn/completed
          else if (method == "turn/completed") {
            final rawTurn = params["turn"];
            if (rawTurn is Map) {
              final items = rawTurn["items"];
              if (items is List) {
                for (final it in items) {
                  if (it is Map && it["type"] == "agentMessage" && it["text"] != null) {
                    final itText = it["text"].toString();
                    if (itText.trim().isNotEmpty) {
                      final itId = it["id"]?.toString() ?? "msg_final";
                      if (livePartsMap.containsKey(itId)) {
                        livePartsMap[itId] = livePartsMap[itId]!.copyWith(text: itText, status: "completed");
                      } else {
                        livePartsMap[itId] = MessagePartModel(id: itId, type: "text", text: itText, status: "completed");
                        if (!partOrder.contains(itId)) partOrder.add(itId);
                      }
                    }
                  }
                }
              }
            }
            finishTurn();
          }
        });
        _activePromptSubscriptions.add(eventSub);

        // Dispatch turn/start RPC
        final turnInput = <Map<String, dynamic>>[
          {
            "type": "text",
            "text": prompt,
          }
        ];

        if (attachments != null && attachments.isNotEmpty) {
          for (final att in attachments) {
            turnInput.add({
              "type": "localImage",
              "path": att,
            });
          }
        }

        final turnParams = <String, dynamic>{
          "threadId": activeThreadId,
          "input": turnInput,
        };

        if (modelId.isNotEmpty) {
          turnParams["model"] = AgentCoreBase.normalizeModelId(modelId);
        }
        if (reasoningEffort.isNotEmpty) {
          turnParams["effort"] = reasoningEffort.toLowerCase();
        }

        try {
          await sendRpc("turn/start", turnParams);
          AgentCoreBase.addDebugLog("Dispatched turn/start for thread $activeThreadId");
        } catch (turnErr) {
          final errStr = turnErr.toString();
          if (errStr.contains("invalid thread") || errStr.contains("not found") || errStr.contains("-32600") || errStr.contains("UUID")) {
            AgentCoreBase.addDebugLog("Stale thread $activeThreadId, auto-creating new thread...");
            final startParams = <String, dynamic>{
              "cwd": workspacePath.isNotEmpty ? workspacePath : "/",
              if (modelId.isNotEmpty) "model": AgentCoreBase.normalizeModelId(modelId),
              if (reasoningEffort.isNotEmpty) "effort": reasoningEffort.toLowerCase(),
            };
            final newRes = await sendRpc("thread/start", startParams);
            if (newRes is Map && newRes["thread"] is Map) {
              activeThreadId = newRes["thread"]["id"]?.toString() ?? "";
              lastActiveSessionId = activeThreadId;
              activeRunningSessionId = activeThreadId;
              controller.add({"type": "session_id", "sessionId": activeThreadId});
              turnParams["threadId"] = activeThreadId;
              await sendRpc("turn/start", turnParams);
              AgentCoreBase.addDebugLog("Dispatched turn/start for new thread $activeThreadId");
            } else {
              rethrow;
            }
          } else {
            rethrow;
          }
        }
      } catch (err) {
        final errText = AgentCoreBase.extractCoreErrorMessage(err);
        AgentCoreBase.addDebugLog("sendPromptStream error: $errText");
        controller.add({
          "type": "done",
          "status": "error",
          "reply": errText.isNotEmpty ? errText : "Failed to execute prompt on AvA Core.",
        });
        controller.close();
      }
    }();

    return controller.stream;
  }
}
