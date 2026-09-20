import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../constants/app_constants.dart';

/// JSON-RPC 2.0 response wrapper
class JsonRpcResponse {
  final String id;
  final dynamic result;
  final Map<String, dynamic>? error;

  JsonRpcResponse({required this.id, this.result, this.error});

  bool get isSuccess => error == null;

  factory JsonRpcResponse.fromJson(Map<String, dynamic> json) {
    return JsonRpcResponse(
      id: json['id']?.toString() ?? '',
      result: json['result'],
      error: json['error'] as Map<String, dynamic>?,
    );
  }
}

/// JSON-RPC 2.0 client for communicating with AvA Code Alpha app-server
/// Enforces Bearer token authentication on all outgoing requests for security
class JsonRpcClient {
  final String baseUrl;
  final http.Client _httpClient;
  String? _authToken;
  int _requestId = 0;

  JsonRpcClient({
    String? baseUrl,
    String? authToken,
    http.Client? httpClient,
  })  : baseUrl = baseUrl ?? _resolveDefaultBaseUrl(),
        _authToken = authToken,
        _httpClient = httpClient ?? http.Client();

  static String _resolveDefaultBaseUrl() {
    if (kIsWeb) {
      return '/api';
    }
    return '${AppConstants.defaultHost}/api';
  }

  /// Updates the active session token
  void setAuthToken(String? token) {
    _authToken = token;
  }

  /// Sends an authenticated JSON-RPC 2.0 request
  Future<JsonRpcResponse> call(String method, [Map<String, dynamic>? params]) async {
    _requestId++;
    final payload = {
      'jsonrpc': '2.0',
      'id': 'req-$_requestId',
      'method': method,
      if (params != null) 'params': params,
    };

    final headers = <String, String>{
      'Content-Type': 'application/json',
      'X-AvA-Client-Version': AppConstants.appVersion,
      'X-AvA-Developer': AppConstants.developer,
    };

    if (_authToken != null && _authToken!.isNotEmpty) {
      headers['Authorization'] = 'Bearer $_authToken';
    }

    try {
      final response = await _httpClient.post(
        Uri.parse(baseUrl),
        headers: headers,
        body: jsonEncode(payload),
      );

      if (response.statusCode == 401 || response.statusCode == 403) {
        return JsonRpcResponse(
          id: 'req-$_requestId',
          error: {
            'code': 401,
            'message': 'Unauthorized: Valid AvA authentication token required.',
          },
        );
      }

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final decoded = jsonDecode(response.body) as Map<String, dynamic>;
        return JsonRpcResponse.fromJson(decoded);
      } else {
        return JsonRpcResponse(
          id: 'req-$_requestId',
          error: {
            'code': response.statusCode,
            'message': 'HTTP ${response.statusCode}: ${response.body}',
          },
        );
      }
    } catch (e) {
      return JsonRpcResponse(
        id: 'req-$_requestId',
        error: {'code': -32000, 'message': e.toString()},
      );
    }
  }

  // --- Domain Helper APIs ---

  /// Execute command on host bash shell
  Future<Map<String, dynamic>?> executeTerminal(String command, {String? cwd}) async {
    final res = await call('terminal/execute', {
      'command': command,
      if (cwd != null) 'cwd': cwd,
    });
    if (res.isSuccess && res.result is Map<String, dynamic>) {
      return res.result as Map<String, dynamic>;
    }
    return null;
  }

  /// List files in workspace path
  Future<Map<String, dynamic>?> getWorkspaceFiles(String path) async {
    final res = await call('workspace/files', {'path': path});
    if (res.isSuccess && res.result is Map<String, dynamic>) {
      return res.result as Map<String, dynamic>;
    }
    return null;
  }

  /// Read file contents from workspace
  Future<Map<String, dynamic>?> readWorkspaceFile(String path) async {
    final res = await call('workspace/read', {'path': path});
    if (res.isSuccess && res.result is Map<String, dynamic>) {
      return res.result as Map<String, dynamic>;
    }
    return null;
  }

  /// Write file contents to workspace
  Future<bool> writeWorkspaceFile(String path, String content) async {
    final res = await call('workspace/write', {'path': path, 'content': content});
    return res.isSuccess;
  }

  /// Delete file from workspace
  Future<bool> deleteWorkspaceFile(String path) async {
    final res = await call('workspace/delete', {'path': path});
    return res.isSuccess;
  }

  /// Fetch host system performance metrics & PM2 list
  Future<Map<String, dynamic>?> getSystemStats() async {
    final res = await call('system/stats');
    if (res.isSuccess && res.result is Map<String, dynamic>) {
      return res.result as Map<String, dynamic>;
    }
    return null;
  }

  /// Restart a PM2 process
  Future<bool> restartPm2Process(String processName) async {
    final res = await call('system/restart-process', {'processName': processName});
    return res.isSuccess;
  }

  /// Fetch MCP servers and tools status
  Future<Map<String, dynamic>?> getMcpStatus() async {
    final res = await call('mcp/status');
    if (res.isSuccess && res.result is Map<String, dynamic>) {
      return res.result as Map<String, dynamic>;
    }
    return null;
  }

  /// Fetch available providers & models catalog
  Future<List<dynamic>?> getProviders() async {
    final res = await call('provider/list');
    if (res.isSuccess && res.result is Map<String, dynamic>) {
      return (res.result as Map<String, dynamic>)['providers'] as List<dynamic>?;
    }
    return null;
  }

  /// Fetch session threads
  Future<List<dynamic>?> getThreads() async {
    final res = await call('thread/list');
    if (res.isSuccess && res.result is Map<String, dynamic>) {
      return (res.result as Map<String, dynamic>)['threads'] as List<dynamic>?;
    }
    return null;
  }

  /// Create new session thread
  Future<Map<String, dynamic>?> createThread({
    required String title,
    String? provider,
    String? model,
    String? workingDirectory,
  }) async {
    final res = await call('thread/create', {
      'title': title,
      if (provider != null) 'provider': provider,
      if (model != null) 'model': model,
      if (workingDirectory != null) 'workingDirectory': workingDirectory,
    });
    if (res.isSuccess && res.result is Map<String, dynamic>) {
      return res.result as Map<String, dynamic>;
    }
    return null;
  }

  /// Delete a thread
  Future<bool> deleteThread(String threadId) async {
    final res = await call('thread/delete', {'threadId': threadId});
    return res.isSuccess;
  }

  /// Send a turn prompt to the agent
  Future<Map<String, dynamic>?> sendTurn({
    required String threadId,
    required String prompt,
  }) async {
    final res = await call('thread/turn', {
      'threadId': threadId,
      'prompt': prompt,
    });
    if (res.isSuccess && res.result is Map<String, dynamic>) {
      return res.result as Map<String, dynamic>;
    }
    return null;
  }

  void close() {
    _httpClient.close();
  }
}
