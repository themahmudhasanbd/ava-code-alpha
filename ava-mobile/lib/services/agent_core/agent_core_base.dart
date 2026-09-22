import "dart:async";
import "dart:convert";
import "package:flutter/foundation.dart";
import "package:http/http.dart" as http;
import "package:shared_preferences/shared_preferences.dart";
import "package:web_socket_channel/web_socket_channel.dart";
import "../../models/app_models.dart";

abstract class AgentCoreBase {
  final String baseUrl;
  String workspacePath;

  AgentCoreBase({
    required this.baseUrl,
    required this.workspacePath,
    String? initialAuthToken,
  }) : _authToken = initialAuthToken {
    _startPersistentConnection();
  }

  void setWorkspacePath(String path) {
    if (path.isNotEmpty) {
      workspacePath = path;
    }
  }

  String? lastActiveSessionId;
  String? activeRunningSessionId;
  String? get currentSessionId => lastActiveSessionId;
  bool get isStreaming => activeRunningSessionId != null && activeRunningSessionId!.isNotEmpty;

  void setLastActiveSessionId(String? sessionId) {
    lastActiveSessionId = sessionId;
  }

  // ─── Reactive Connection State ─────────────────────────────────────────────
  final ValueNotifier<bool> isConnectedNotifier = ValueNotifier<bool>(false);
  final ValueNotifier<CoreConnectionStatus> connectionStatusNotifier =
      ValueNotifier<CoreConnectionStatus>(CoreConnectionStatus.connecting);

  final StreamController<void> _authExpiredController = StreamController<void>.broadcast();
  Stream<void> get authExpiredStream => _authExpiredController.stream;
  DateTime? _lastAuthExpiredEvent;

  // ─── User Profile State ────────────────────────────────────────────────────
  final ValueNotifier<AvaUserProfile?> userProfileNotifier =
      ValueNotifier<AvaUserProfile?>(AvaUserProfile.fromJson({}));

  // ─── Realtime Event Broadcast Stream ────────────────────────────────────────
  final StreamController<Map<String, dynamic>> _rawEventController =
      StreamController<Map<String, dynamic>>.broadcast();

  Stream<Map<String, dynamic>> get eventStream => _rawEventController.stream;
  StreamController<Map<String, dynamic>> get rawEventController => _rawEventController;

  // ─── WebSocket JSON-RPC 2.0 State ──────────────────────────────────────────
  WebSocketChannel? _wsChannel;
  StreamSubscription? _wsSubscription;
  final Map<int, Completer<dynamic>> _pendingRpc = {};
  int _rpcIdCounter = 1;
  bool _isWsConnecting = false;
  Timer? _wsReconnectTimer;
  Timer? _healthTimer;
  bool _isDisposed = false;
  bool get isDisposed => _isDisposed;

  static List<AvaModelItem>? cachedCatalogModels;
  static String? cachedDefaultModelId;

  String _activeSandboxMode = "danger-full-access";

  void setSandboxMode(String mode) {
    if (mode.isNotEmpty) {
      _activeSandboxMode = mode;
    }
  }

  String get activeSandboxMode => _activeSandboxMode;

  // ─── Authentication Credentials ───────────────────────────────────────────
  String? _authToken;

  void setAuthCredentials(String username, String password) {
    _authToken = base64Encode(utf8.encode("$username:$password"));
  }

  void setAuthToken(String? token) {
    _authToken = token;
  }

  String? get authToken => _authToken;

  Map<String, String> get authHeaders {
    final headers = <String, String>{
      "x-ava-client": "mobile",
      "x-avacode-client": "mobile",
    };
    if (_authToken != null && _authToken!.isNotEmpty) {
      headers["Authorization"] = "Basic $_authToken";
    }
    if (workspacePath.isNotEmpty) {
      headers["x-ava-directory"] = workspacePath;
      headers["x-avacode-directory"] = workspacePath;
    }
    if (_activeSandboxMode.isNotEmpty) {
      headers["x-ava-sandbox-mode"] = _activeSandboxMode;
    }
    return headers;
  }

  Map<String, String> jsonHeaders([Map<String, String>? extra]) {
    return {
      "Content-Type": "application/json",
      ...authHeaders,
      ...?extra,
    };
  }

  // ─── Debug Logging ─────────────────────────────────────────────────────────
  static final List<String> debugLogs = [];
  static const int _maxDebugLogs = 400;

  static void addDebugLog(String msg) {
    final entry = "[${DateTime.now().toIso8601String().substring(11, 23)}] $msg";
    debugLogs.add(entry);
    if (debugLogs.length > _maxDebugLogs) {
      debugLogs.removeRange(0, debugLogs.length - _maxDebugLogs);
    }
  }

  // ─── Persistent Connection Management ──────────────────────────────────────
  void _startPersistentConnection() {
    if (_isDisposed) return;
    _connectWebSocket();

    _healthTimer?.cancel();
    _healthTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      if (!_isDisposed) {
        checkHealth();
      }
    });
  }

  String _resolveWebSocketUrl() {
    String base = baseUrl.trim();
    if (base.endsWith("/")) base = base.substring(0, base.length - 1);
    if (base.endsWith("/api")) base = base.substring(0, base.length - 4);
    if (base.endsWith("/")) base = base.substring(0, base.length - 1);

    if (base.startsWith("https://")) {
      return "wss://${base.substring('https://'.length)}/ws";
    } else if (base.startsWith("http://")) {
      return "ws://${base.substring('http://'.length)}/ws";
    } else if (base.startsWith("wss://") || base.startsWith("ws://")) {
      return base.endsWith("/ws") ? base : "$base/ws";
    }
    return "wss://$base/ws";
  }

  Future<void> _connectWebSocket() async {
    if (_isDisposed || _isWsConnecting) return;
    _isWsConnecting = true;

    try {
      final wsUrl = _resolveWebSocketUrl();
      addDebugLog("Connecting to AvA Native Core WebSocket: $wsUrl");

      await _wsSubscription?.cancel();
      _wsSubscription = null;
      await _wsChannel?.sink.close();
      _wsChannel = null;

      final uri = Uri.parse(wsUrl);
      _wsChannel = WebSocketChannel.connect(uri);

      _wsSubscription = _wsChannel!.stream.listen(
        (data) {
          _handleWsMessage(data);
        },
        onError: (err) {
          addDebugLog("WebSocket error: $err");
          _onWsDisconnected();
        },
        onDone: () {
          addDebugLog("WebSocket connection closed");
          _onWsDisconnected();
        },
        cancelOnError: false,
      );

      // Perform initialize RPC handshake
      final initRes = await sendRpc("initialize", {
        "clientInfo": {"name": "ava-mobile", "version": "1.0.0"},
        "capabilities": {},
      }).timeout(const Duration(seconds: 8));

      addDebugLog("AvA Native Core initialized successfully: $initRes");
      updateConnectionState(true);
    } catch (err) {
      addDebugLog("WebSocket connection failed: $err");
      _onWsDisconnected();
    } finally {
      _isWsConnecting = false;
    }
  }

  void _onWsDisconnected() {
    updateConnectionState(false);
    _wsSubscription?.cancel();
    _wsSubscription = null;
    _wsChannel = null;

    for (final entry in _pendingRpc.entries) {
      if (!entry.value.isCompleted) {
        entry.value.completeError("AvA Core connection disconnected");
      }
    }
    _pendingRpc.clear();

    if (!_isDisposed && (_wsReconnectTimer == null || !_wsReconnectTimer!.isActive)) {
      _wsReconnectTimer = Timer(const Duration(seconds: 3), () {
        _connectWebSocket();
      });
    }
  }

  void _handleWsMessage(dynamic raw) {
    try {
      final text = raw is String ? raw : utf8.decode(raw as List<int>);
      final decoded = jsonDecode(text);

      if (decoded is Map<String, dynamic> || decoded is Map) {
        final map = Map<String, dynamic>.from(decoded as Map);

        // 1. JSON-RPC Response (has "id")
        if (map.containsKey("id") && map["id"] != null) {
          final idVal = map["id"];
          final int? rpcId = idVal is int ? idVal : int.tryParse(idVal.toString());
          if (rpcId != null && _pendingRpc.containsKey(rpcId)) {
            final completer = _pendingRpc.remove(rpcId);
            if (completer != null && !completer.isCompleted) {
              if (map.containsKey("error") && map["error"] != null) {
                completer.completeError(map["error"]);
              } else {
                completer.complete(map["result"]);
              }
            }
          }
        }

        // 2. JSON-RPC Notification (has "method")
        if (map.containsKey("method") && map["method"] != null) {
          final method = map["method"].toString();
          final params = map["params"] is Map ? Map<String, dynamic>.from(map["params"] as Map) : <String, dynamic>{};
          
          final eventPayload = {
            "type": method,
            "method": method,
            "data": params,
            "properties": params,
            ...params,
          };

          if (!_rawEventController.isClosed) {
            _rawEventController.add(eventPayload);
          }
        }
      }
    } catch (err) {
      addDebugLog("Error parsing WS message: $err");
    }
  }

  /// Sends a JSON-RPC 2.0 request over the native WebSocket channel.
  Future<dynamic> sendRpc(String method, [Map<String, dynamic>? params]) async {
    if (_wsChannel == null) {
      await _connectWebSocket();
    }
    if (_wsChannel == null) {
      throw Exception("Cannot send RPC $method: AvA Core WebSocket is not connected.");
    }

    final id = _rpcIdCounter++;
    final completer = Completer<dynamic>();
    _pendingRpc[id] = completer;

    final request = {
      "jsonrpc": "2.0",
      "id": id,
      "method": method,
      "params": params ?? {},
    };

    try {
      final payload = jsonEncode(request);
      _wsChannel!.sink.add(payload);
    } catch (err) {
      _pendingRpc.remove(id);
      throw Exception("Failed to send RPC $method: $err");
    }

    return completer.future.timeout(const Duration(seconds: 45), onTimeout: () {
      _pendingRpc.remove(id);
      throw TimeoutException("RPC $method timed out after 45 seconds");
    });
  }

  Future<void> ensureSseConnected() async {
    if (_wsChannel == null) {
      await _connectWebSocket();
    }
  }

  void updateConnectionState(bool isHealthy) {
    if (_isDisposed) return;
    if (isHealthy) {
      if (!isConnectedNotifier.value) {
        isConnectedNotifier.value = true;
        connectionStatusNotifier.value = CoreConnectionStatus.connected;
        addDebugLog("Core connection status: ONLINE (Connected)");
      }
    } else {
      if (isConnectedNotifier.value) {
        isConnectedNotifier.value = false;
        connectionStatusNotifier.value = CoreConnectionStatus.disconnected;
        addDebugLog("Core connection status: OFFLINE (Disconnected)");
      }
    }
  }

  Future<bool> checkHealth() async {
    if (_isDisposed) return false;
    try {
      if (_wsChannel != null && isConnectedNotifier.value) {
        return true;
      }
      final cleanBase = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl;
      final response = await http
          .get(Uri.parse("$cleanBase/healthz"), headers: authHeaders)
          .timeout(const Duration(seconds: 4));
      if (response.statusCode == 200 || response.statusCode == 204 || response.statusCode == 400 || response.statusCode == 401 || response.statusCode == 403) {
        updateConnectionState(true);
        return true;
      }
    } catch (_) {}
    return false;
  }

  bool isAuthFailure(int statusCode) {
    if (statusCode != 401 && statusCode != 403) return false;
    final now = DateTime.now();
    if (_lastAuthExpiredEvent == null ||
        now.difference(_lastAuthExpiredEvent!) > const Duration(seconds: 10)) {
      _lastAuthExpiredEvent = now;
      if (!_authExpiredController.isClosed) {
        _authExpiredController.add(null);
      }
    }
    return true;
  }

  // ─── Dynamic Error Extraction ──────────────────────────────────────────────
  static String extractCoreErrorMessage(dynamic err) {
    if (err == null) return "";
    if (err is String) return err.trim();
    if (err is Map) {
      if (err["error"] is Map) {
        return extractCoreErrorMessage(err["error"]);
      }
      if (err["message"] != null) return extractCoreErrorMessage(err["message"]);
      if (err["error"] != null) return extractCoreErrorMessage(err["error"]);
      if (err["detail"] != null) return extractCoreErrorMessage(err["detail"]);
      if (err["statusText"] != null) return extractCoreErrorMessage(err["statusText"]);
      if (err["msg"] != null) return extractCoreErrorMessage(err["msg"]);
    }
    return err.toString();
  }

  // ─── Model & Provider Normalization ────────────────────────────────────────
  static String normalizeProviderId(String? provider, [String? modelId]) {
    if (provider != null && provider.trim().isNotEmpty) {
      return provider.trim();
    }
    if (modelId != null && modelId.contains("/")) {
      return modelId.split("/").first;
    }
    return "omniroute";
  }

  static String normalizeModelId(String? raw, {String? provider}) {
    final clean = (raw ?? "").trim();
    if (clean.isEmpty) return "powerful-coding-combo";
    if (clean.contains("/")) {
      return clean.split("/").last;
    }
    return clean;
  }

  static String normalizeEventType(String rawType) {
    final clean = rawType.trim();
    if (clean == "item/agentMessage/delta") return "text";
    if (clean == "item/reasoning/textDelta") return "reasoning";
    if (clean == "item/commandExecution/outputDelta") return "tool_use";
    return clean;
  }

  // ─── Message Part Parser ───────────────────────────────────────────────────
  static MessagePartModel parsePart(Map<String, dynamic> raw, int index, {String? messageId, String? turnId}) {
    final id = raw["id"]?.toString() ?? "${messageId ?? 'item'}_part_$index";
    final type = raw["type"]?.toString() ?? "text";

    if (type == "reasoning" || type == "reasoningSummary") {
      return MessagePartModel(
        id: id,
        messageId: messageId,
        turnId: turnId,
        type: "reasoning",
        text: raw["text"]?.toString() ?? "",
        status: raw["status"]?.toString() ?? "completed",
      );
    }

    if (type == "commandExecution" || type == "toolUse" || type == "tool_use" || type == "mcpToolCall" || type == "dynamicToolCall") {
      return MessagePartModel(
        id: id,
        callId: raw["callID"]?.toString() ?? raw["callId"]?.toString() ?? id,
        messageId: messageId,
        turnId: turnId,
        type: "tool",
        tool: raw["tool"]?.toString() ?? raw["name"]?.toString() ?? "command",
        input: raw["input"] ?? raw["args"] ?? (raw["command"] != null ? {"command": raw["command"]} : null),
        output: raw["output"]?.toString() ?? raw["aggregatedOutput"]?.toString() ?? raw["result"]?.toString(),
        status: raw["status"]?.toString() ?? "completed",
      );
    }

    if (type == "fileChange") {
      return MessagePartModel(
        id: id,
        callId: id,
        messageId: messageId,
        turnId: turnId,
        type: "tool",
        tool: "file_change",
        input: {"path": raw["path"] ?? raw["filePath"]},
        output: raw["patch"]?.toString() ?? raw["diff"]?.toString(),
        status: raw["status"]?.toString() ?? "completed",
      );
    }

    if (type == "plan" || type == "step") {
      return MessagePartModel(
        id: id,
        messageId: messageId,
        turnId: turnId,
        type: "step",
        text: raw["text"]?.toString() ?? raw["title"]?.toString() ?? "",
        status: raw["status"]?.toString() ?? "completed",
      );
    }

    return MessagePartModel(
      id: id,
      messageId: messageId,
      turnId: turnId,
      type: "text",
      text: raw["text"]?.toString() ?? "",
      status: raw["status"]?.toString() ?? "completed",
    );
  }

  // ─── Persistence Caching Helpers ───────────────────────────────────────────
  Future<void> saveSessionsListToCache(List<Map<String, dynamic>> sessions) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonStr = jsonEncode(sessions);
      await prefs.setString("ava_cached_sessions_list", jsonStr);
    } catch (_) {}
  }

  Future<List<Map<String, dynamic>>> loadSessionsListFromCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonStr = prefs.getString("ava_cached_sessions_list");
      if (jsonStr != null && jsonStr.isNotEmpty) {
        final decoded = jsonDecode(jsonStr);
        if (decoded is List) {
          return decoded.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
        }
      }
    } catch (_) {}
    return [];
  }

  Future<void> deleteSessionFromCache(String sessionId) async {
    try {
      final list = await loadSessionsListFromCache();
      list.removeWhere((s) => s["id"] == sessionId || s["sessionId"] == sessionId);
      await saveSessionsListToCache(list);
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove("ava_session_msgs_$sessionId");
    } catch (_) {}
  }

  Future<void> saveSessionMessagesToCache(String sessionId, List<ChatMessageModel> messages) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final list = messages.map((m) => m.toJson()).toList();
      await prefs.setString("ava_session_msgs_$sessionId", jsonEncode(list));
    } catch (_) {}
  }

  Future<List<ChatMessageModel>> loadSessionMessagesFromCache(String sessionId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonStr = prefs.getString("ava_session_msgs_$sessionId");
      if (jsonStr != null && jsonStr.isNotEmpty) {
        final decoded = jsonDecode(jsonStr);
        if (decoded is List) {
          return decoded.whereType<Map>().map((e) => ChatMessageModel.fromJson(Map<String, dynamic>.from(e))).toList();
        }
      }
    } catch (_) {}
    return [];
  }

  Future<void> saveModelsToCache(Map<String, dynamic> data) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString("ava_cached_models_catalog", jsonEncode(data));
    } catch (_) {}
  }

  Future<Map<String, dynamic>?> loadModelsFromCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonStr = prefs.getString("ava_cached_models_catalog");
      if (jsonStr != null && jsonStr.isNotEmpty) {
        return jsonDecode(jsonStr) as Map<String, dynamic>?;
      }
    } catch (_) {}
    return null;
  }

  Future<Map<String, dynamic>?> loadSettingsFromCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonStr = prefs.getString("ava_cached_user_settings");
      if (jsonStr != null && jsonStr.isNotEmpty) {
        return jsonDecode(jsonStr) as Map<String, dynamic>?;
      }
    } catch (_) {}
    return null;
  }

  void dispose() {
    _isDisposed = true;
    _healthTimer?.cancel();
    _wsReconnectTimer?.cancel();
    _wsSubscription?.cancel();
    _wsChannel?.sink.close();
    _rawEventController.close();
    _authExpiredController.close();
    isConnectedNotifier.dispose();
    connectionStatusNotifier.dispose();
    userProfileNotifier.dispose();
  }
}
