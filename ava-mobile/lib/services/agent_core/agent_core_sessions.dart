import "dart:async";
import "../../models/app_models.dart";
import "agent_core_base.dart";

mixin AgentCoreSessionsMixin on AgentCoreBase {
  final Map<String, String?> _sessionCursors = {};
  final Map<String, bool> _hasMoreHistoryMap = {};

  Future<bool> isSessionActive(String id) async {
    if (id.isEmpty) return false;
    return id == activeRunningSessionId && isStreaming;
  }

  String? getSessionCursor(String id) => _sessionCursors[id];
  void setSessionCursor(String id, String? cursor) {
    _sessionCursors[id] = cursor;
  }

  bool hasMoreHistory(String id) => _hasMoreHistoryMap[id] ?? false;

  Stream<Map<String, dynamic>> attachToActiveSession(String id) {
    lastActiveSessionId = id;
    return eventStream.where((event) {
      final tid = event["threadId"]?.toString() ??
          (event["params"] is Map ? event["params"]["threadId"]?.toString() : null);
      return tid == null || tid.isEmpty || tid == id;
    });
  }

  Future<void> updateCachedSessionTitle(String id, String title) async {
    final list = await loadSessionsListFromCache();
    for (final s in list) {
      if (s["id"] == id || s["sessionId"] == id) {
        s["title"] = title;
        s["name"] = title;
      }
    }
    await saveSessionsListToCache(list);
  }

  Future<bool> updateSessionTitle(String sessionId, String newTitle) async {
    return renameSession(sessionId, newTitle);
  }

  Future<int> purgeSessionsOlderThanOneMonth() async {
    return 0;
  }

  // ─── Sessions / Threads ───────────────────────────────────────────────────

  Future<List<Map<String, dynamic>>> fetchSessions({
    bool all = true,
    int limit = 100,
    String? directory,
    String? activeSessionId,
    String? cursor,
  }) async {
    try {
      final res = await sendRpc("thread/list", {
        "limit": limit,
        if (cursor != null) "cursor": cursor,
      });

      final List<Map<String, dynamic>> sessions = [];
      if (res is Map && res["data"] is List) {
        for (final item in (res["data"] as List)) {
          if (item is Map) {
            final t = Map<String, dynamic>.from(item);
            final tid = t["id"]?.toString() ?? "";
            if (tid.isEmpty) continue;

            final title = t["preview"]?.toString() ?? t["name"]?.toString() ?? "New Session";
            final cwd = t["cwd"]?.toString() ?? (workspacePath.isNotEmpty ? workspacePath : "/");
            final createdAt = t["createdAt"] is num ? (t["createdAt"] as num).toInt() : null;
            final updatedAt = t["updatedAt"] is num ? (t["updatedAt"] as num).toInt() : null;

            sessions.add({
              "id": tid,
              "sessionId": tid,
              "title": title,
              "directory": cwd,
              "workspacePath": cwd,
              "model": t["model"],
              "modelProvider": t["modelProvider"],
              "createdAt": createdAt,
              "updatedAt": updatedAt,
              "raw": t,
            });
          }
        }
      }

      if (sessions.isNotEmpty) {
        await saveSessionsListToCache(sessions);
      }
      return sessions;
    } catch (err) {
      AgentCoreBase.addDebugLog("fetchSessions error: $err");
      final cached = await loadSessionsListFromCache();
      return cached;
    }
  }

  Future<Map<String, dynamic>?> fetchSession(String sessionId) async {
    if (sessionId.isEmpty) return null;
    try {
      final res = await sendRpc("thread/resume", {
        "threadId": sessionId,
      });
      if (res is Map && res["thread"] is Map) {
        final thread = Map<String, dynamic>.from(res["thread"] as Map);
        final title = thread["preview"]?.toString() ?? thread["name"]?.toString() ?? "Active Session";
        final cwd = thread["cwd"]?.toString() ?? (workspacePath.isNotEmpty ? workspacePath : "/");
        return {
          "id": sessionId,
          "sessionId": sessionId,
          "title": title,
          "directory": cwd,
          "workspacePath": cwd,
          "thread": thread,
          ...thread,
        };
      }
    } catch (err) {
      AgentCoreBase.addDebugLog("fetchSession error: $err");
    }
    return null;
  }

  Future<String?> createSession({
    String? directory,
    String? agent,
    String? model,
    String? provider,
    String? title,
  }) async {
    try {
      final targetCwd = (directory != null && directory.isNotEmpty)
          ? directory
          : (workspacePath.isNotEmpty ? workspacePath : "/");

      final params = <String, dynamic>{
        "cwd": targetCwd,
      };
      if (model != null && model.isNotEmpty) {
        params["model"] = AgentCoreBase.normalizeModelId(model, provider: provider);
      }

      final res = await sendRpc("thread/start", params);
      if (res is Map && res["thread"] is Map) {
        final thread = Map<String, dynamic>.from(res["thread"] as Map);
        final id = thread["id"]?.toString() ?? "";
        if (id.isNotEmpty) {
          lastActiveSessionId = id;
          return id;
        }
      }
    } catch (err) {
      AgentCoreBase.addDebugLog("createSession error: $err");
    }
    return null;
  }

  Future<bool> deleteSession(String sessionId) async {
    try {
      await sendRpc("thread/delete", {"threadId": sessionId});
      await deleteSessionFromCache(sessionId);
      return true;
    } catch (err) {
      AgentCoreBase.addDebugLog("deleteSession error: $err");
      try {
        await sendRpc("thread/archive", {"threadId": sessionId});
        await deleteSessionFromCache(sessionId);
        return true;
      } catch (_) {}
    }
    return false;
  }

  Future<bool> renameSession(String sessionId, String newTitle) async {
    try {
      await sendRpc("thread/name/set", {
        "threadId": sessionId,
        "name": newTitle,
      });
      await updateCachedSessionTitle(sessionId, newTitle);
      return true;
    } catch (err) {
      AgentCoreBase.addDebugLog("renameSession error: $err");
    }
    return false;
  }

  Future<String?> forkSession(String sessionId, {String? targetMessageId}) async {
    try {
      final res = await sendRpc("thread/fork", {
        "threadId": sessionId,
      });
      if (res is Map && res["thread"] is Map) {
        final thread = Map<String, dynamic>.from(res["thread"] as Map);
        final newId = thread["id"]?.toString() ?? "";
        if (newId.isNotEmpty) {
          lastActiveSessionId = newId;
          return newId;
        }
      }
    } catch (err) {
      AgentCoreBase.addDebugLog("forkSession error: $err");
    }
    return null;
  }

  Future<bool> compactSession(String sessionId, {String? providerId, String? modelId}) async {
    try {
      await sendRpc("thread/compact/start", {
        "threadId": sessionId,
      });
      return true;
    } catch (err) {
      AgentCoreBase.addDebugLog("compactSession error: $err");
    }
    return false;
  }

  Future<bool> revertSession(String sessionId) async {
    try {
      await sendRpc("turn/revert", {"threadId": sessionId});
      return true;
    } catch (err) {
      AgentCoreBase.addDebugLog("revertSession error: $err");
      return false;
    }
  }

  Future<bool> unrevertSession(String sessionId) async {
    try {
      await sendRpc("turn/unrevert", {"threadId": sessionId});
      return true;
    } catch (err) {
      AgentCoreBase.addDebugLog("unrevertSession error: $err");
      return false;
    }
  }

  Future<String?> shareSession(String sessionId) async {
    return "$baseUrl/share/$sessionId";
  }

  Future<bool> unshareSession(String sessionId) async {
    return true;
  }

  Future<bool> switchSessionModel({
    required String sessionId,
    required String modelId,
    String? providerId,
  }) async {
    lastActiveSessionId = sessionId;
    return true;
  }

  Future<bool> killBackgroundTask(String taskId, {String? sessionId}) async {
    return true;
  }

  Future<List<Map<String, String>>> fetchSuggestions({
    String? agent,
    String? workspace,
    String? sessionId,
  }) async {
    return [
      {"title": "Git status", "prompt": "Check git status and report changes"},
      {"title": "PM2 status", "prompt": "Run pm2 status and list services"},
      {"title": "Audit project", "prompt": "Audit the workspace and report any issues"},
    ];
  }

  // ─── Fetch Messages For Session ───────────────────────────────────────────

  Future<Map<String, dynamic>> fetchSessionMessages(
    String sessionId, {
    String? cursor,
    String? beforeCursor,
    int limit = 50,
    bool isInitial = false,
  }) async {
    if (sessionId.isEmpty) return {"messages": <ChatMessageModel>[], "hasMore": false};

    try {
      final res = await sendRpc("thread/resume", {
        "threadId": sessionId,
      });

      if (res is Map && res["thread"] is Map) {
        final thread = Map<String, dynamic>.from(res["thread"] as Map);
        final turns = thread["turns"];
        final List<ChatMessageModel> messages = [];

        if (turns is List) {
          for (int turnIdx = 0; turnIdx < turns.length; turnIdx++) {
            final turn = turns[turnIdx];
            if (turn is! Map) continue;
            final turnMap = Map<String, dynamic>.from(turn);
            final turnId = turnMap["id"]?.toString() ?? "turn_$turnIdx";
            final rawItems = turnMap["items"];

            if (rawItems is List) {
              String userText = "";
              String? userMsgId;
              final List<MessagePartModel> assistantParts = [];
              String assistantText = "";
              String? assistantMsgId;

              for (int itemIdx = 0; itemIdx < rawItems.length; itemIdx++) {
                final item = rawItems[itemIdx];
                if (item is! Map) continue;
                final itemMap = Map<String, dynamic>.from(item);
                final itemType = itemMap["type"]?.toString() ?? "";
                final itemId = itemMap["id"]?.toString() ?? "item_${turnIdx}_$itemIdx";

                if (itemType == "userMessage") {
                  userMsgId = itemId;
                  final content = itemMap["content"];
                  if (content is List) {
                    for (final c in content) {
                      if (c is Map && c["text"] != null) {
                        userText += (userText.isNotEmpty ? "\n" : "") + c["text"].toString();
                      }
                    }
                  }
                } else {
                  final part = AgentCoreBase.parsePart(itemMap, itemIdx, messageId: itemId, turnId: turnId);
                  assistantParts.add(part);
                  if (part.type == "text" && part.text.isNotEmpty) {
                    assistantText += (assistantText.isNotEmpty ? "\n\n" : "") + part.text;
                    assistantMsgId ??= itemId;
                  }
                }
              }

              if (userText.isNotEmpty) {
                messages.add(ChatMessageModel(
                  id: userMsgId ?? "user_$turnId",
                  sender: "user",
                  text: userText,
                  timestamp: DateTime.now().toIso8601String(),
                ));
              }

              if (assistantParts.isNotEmpty || assistantText.isNotEmpty) {
                messages.add(ChatMessageModel(
                  id: assistantMsgId ?? "agent_$turnId",
                  sender: "agent",
                  text: assistantText,
                  timestamp: DateTime.now().toIso8601String(),
                  parts: assistantParts,
                ));
              }
            }
          }
        }

        if (messages.isNotEmpty) {
          await saveSessionMessagesToCache(sessionId, messages);
        }
        return {"messages": messages, "hasMore": false};
      }
    } catch (err) {
      AgentCoreBase.addDebugLog("fetchSessionMessages error: $err");
      final cached = await loadSessionMessagesFromCache(sessionId);
      if (cached.isNotEmpty) return {"messages": cached, "hasMore": false};
    }
    return {"messages": <ChatMessageModel>[], "hasMore": false};
  }
}
