import 'dart:convert';
import 'package:http/http.dart' as http;

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
class JsonRpcClient {
  final String baseUrl;
  final http.Client _httpClient;
  int _requestId = 0;

  JsonRpcClient({required this.baseUrl, http.Client? httpClient})
      : _httpClient = httpClient ?? http.Client();

  Future<JsonRpcResponse> call(String method, [Map<String, dynamic>? params]) async {
    _requestId++;
    final payload = {
      'jsonrpc': '2.0',
      'id': 'req-$_requestId',
      'method': method,
      if (params != null) 'params': params,
    };

    try {
      final response = await _httpClient.post(
        Uri.parse(baseUrl),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(payload),
      );

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

  void close() {
    _httpClient.close();
  }
}
