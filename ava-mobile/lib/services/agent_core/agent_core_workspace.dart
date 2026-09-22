import 'dart:convert';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import 'agent_core_base.dart';

mixin AgentCoreWorkspaceMixin on AgentCoreBase {
  // ─── Workspace / Files ────────────────────────────────────────────────────

  Future<List<Map<String, dynamic>>> fetchWorkspaceFilesTree([String? path]) async {
    final targetPath = (path != null && path.isNotEmpty) ? path : workspacePath;
    try {
      final uri = Uri.parse(
        '$baseUrl/file?directory=${Uri.encodeComponent(targetPath)}&path=.',
      );
      final response = await http.get(uri, headers: authHeaders).timeout(const Duration(seconds: 8));
      if (response.statusCode == 200) {
        final dynamic decoded = jsonDecode(response.body);
        if (decoded is List) {
          return decoded.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
        } else if (decoded is Map && decoded['tree'] is List) {
          return (decoded['tree'] as List).whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
        }
      }
    } catch (err) {
      AgentCoreBase.addDebugLog('fetchWorkspaceFilesTree error: $err');
    }
    return [];
  }

  Future<List<Map<String, dynamic>>> fetchWorkspaceMediaFiles([String? path]) async {
    final targetPath = (path != null && path.isNotEmpty) ? path : '/root/shared-media';
    try {
      final uri = Uri.parse(
        '$baseUrl/api/workspace/media?path=${Uri.encodeComponent(targetPath)}',
      );
      final response = await http.get(uri, headers: authHeaders).timeout(const Duration(seconds: 8));
      if (response.statusCode == 200) {
        final dynamic decoded = jsonDecode(response.body);
        if (decoded is Map && decoded['items'] is List) {
          return (decoded['items'] as List).whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
        } else if (decoded is List) {
          return decoded.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
        }
      }
    } catch (err) {
      AgentCoreBase.addDebugLog('fetchWorkspaceMediaFiles error: $err');
    }
    return [];
  }

  Future<String?> fetchFileContent(String filePath, [String? directory]) async {
    try {
      String targetDir = directory ?? workspacePath;
      String targetPath = filePath;

      if (filePath.startsWith('/')) {
        final lastSlash = filePath.lastIndexOf('/');
        if (lastSlash > 0) {
          targetDir = filePath.substring(0, lastSlash);
          targetPath = filePath.substring(lastSlash + 1);
        } else if (lastSlash == 0) {
          targetDir = '/';
          targetPath = filePath.substring(1);
        }
      }

      final uri = Uri.parse(
        '$baseUrl/file/content?directory=${Uri.encodeComponent(targetDir)}&path=${Uri.encodeComponent(targetPath)}',
      );
      final response = await http.get(uri, headers: authHeaders).timeout(const Duration(seconds: 8));
      if (response.statusCode == 200) {
        final dynamic decoded = jsonDecode(response.body);
        if (decoded is Map && decoded['content'] != null) {
          return decoded['content'].toString();
        }
        return response.body;
      }
    } catch (err) {
      AgentCoreBase.addDebugLog('fetchFileContent error: $err');
    }
    return null;
  }

  Future<String?> fetchWorkspaceFileContent(String filePath) => fetchFileContent(filePath);

  Future<bool> updateWorkspaceFileContent(String filePath, String content) async {
    try {
      String targetDir = workspacePath;
      String targetPath = filePath;

      if (filePath.startsWith('/')) {
        final lastSlash = filePath.lastIndexOf('/');
        if (lastSlash > 0) {
          targetDir = filePath.substring(0, lastSlash);
          targetPath = filePath.substring(lastSlash + 1);
        } else if (lastSlash == 0) {
          targetDir = '/';
          targetPath = filePath.substring(1);
        }
      }

      final uri = Uri.parse(
        '$baseUrl/file/content?directory=${Uri.encodeComponent(targetDir)}&path=${Uri.encodeComponent(targetPath)}',
      );
      final response = await http
          .post(
            uri,
            headers: jsonHeaders(),
            body: jsonEncode({'content': content}),
          )
          .timeout(const Duration(seconds: 8));

      return response.statusCode == 200;
    } catch (err) {
      AgentCoreBase.addDebugLog('updateWorkspaceFileContent error: $err');
      return false;
    }
  }

  /// Global Media & File Uploader
  Future<Map<String, dynamic>?> uploadFile({
    required String targetDirectory,
    required String fileName,
    required Uint8List fileBytes,
  }) async {
    try {
      final base64Data = base64Encode(fileBytes);
      final uri = Uri.parse('$baseUrl/api/workspace/upload');
      final res = await http
          .post(
            uri,
            headers: jsonHeaders(),
            body: jsonEncode({
              'targetDir': targetDirectory.isNotEmpty ? targetDirectory : '/root/shared-media',
              'fileName': fileName,
              'base64Data': base64Data,
            }),
          )
          .timeout(const Duration(seconds: 45));

      if (res.statusCode == 200) {
        final decoded = jsonDecode(res.body);
        if (decoded is Map<String, dynamic> && decoded['status'] == 'ok') {
          AgentCoreBase.addDebugLog('File uploaded: ${decoded['fullPath']} (${decoded['size']})');
          return decoded;
        }
      } else {
        AgentCoreBase.addDebugLog('uploadFile failed: ${res.statusCode} ${res.body}');
      }
    } catch (err) {
      AgentCoreBase.addDebugLog('uploadFile error: $err');
    }
    return null;
  }

  /// Download asset directly from remote URL into target directory on VPS
  Future<Map<String, dynamic>?> downloadFileFromUrl({
    required String targetDirectory,
    required String url,
    String? fileName,
  }) async {
    try {
      final uri = Uri.parse('$baseUrl/api/workspace/upload');
      final res = await http
          .post(
            uri,
            headers: jsonHeaders(),
            body: jsonEncode({
              'targetDir': targetDirectory.isNotEmpty ? targetDirectory : '/root/shared-media',
              'url': url,
              if (fileName != null && fileName.isNotEmpty) 'fileName': fileName,
            }),
          )
          .timeout(const Duration(seconds: 60));

      if (res.statusCode == 200) {
        final decoded = jsonDecode(res.body);
        if (decoded is Map<String, dynamic> && decoded['status'] == 'ok') {
          AgentCoreBase.addDebugLog('File downloaded from URL: ${decoded['fullPath']} (${decoded['size']})');
          return decoded;
        }
      } else {
        AgentCoreBase.addDebugLog('downloadFileFromUrl failed: ${res.statusCode} ${res.body}');
      }
    } catch (err) {
      AgentCoreBase.addDebugLog('downloadFileFromUrl error: $err');
    }
    return null;
  }

  /// Delete file or directory on VPS
  Future<bool> deleteWorkspaceFile(String fullPath) async {
    try {
      final uri = Uri.parse('$baseUrl/api/workspace/delete');
      final res = await http
          .post(
            uri,
            headers: jsonHeaders(),
            body: jsonEncode({'path': fullPath}),
          )
          .timeout(const Duration(seconds: 15));

      if (res.statusCode == 200) {
        final decoded = jsonDecode(res.body);
        if (decoded is Map<String, dynamic> && decoded['status'] == 'ok') {
          AgentCoreBase.addDebugLog('Deleted workspace file: $fullPath');
          return true;
        }
      } else {
        AgentCoreBase.addDebugLog('deleteWorkspaceFile failed: ${res.statusCode} ${res.body}');
      }
    } catch (err) {
      AgentCoreBase.addDebugLog('deleteWorkspaceFile error: $err');
    }
    return false;
  }

  String getRawFileUrl(String fullPath) {
    final tokenParam = (authToken != null && authToken!.isNotEmpty)
        ? '&token=${Uri.encodeComponent(authToken!)}'
        : '';
    return '$baseUrl/api/workspace/raw?path=${Uri.encodeComponent(fullPath)}$tokenParam';
  }

  Future<Map<String, dynamic>?> archiveFiles({
    required String targetDirectory,
    required List<String> fileNames,
    String? archiveName,
    String format = 'zip',
  }) async {
    try {
      final uri = Uri.parse('$baseUrl/api/workspace/archive');
      final res = await http
          .post(
            uri,
            headers: jsonHeaders(),
            body: jsonEncode({
              'targetDir': targetDirectory,
              'files': fileNames,
              'archiveName': archiveName,
              'format': format,
            }),
          )
          .timeout(const Duration(seconds: 60));

      if (res.statusCode == 200) {
        final decoded = jsonDecode(res.body);
        if (decoded is Map<String, dynamic> && decoded['status'] == 'ok') {
          AgentCoreBase.addDebugLog('Archived successfully: ${decoded['archiveName']}');
          return decoded;
        }
      } else {
        AgentCoreBase.addDebugLog('archiveFiles failed: ${res.statusCode} ${res.body}');
      }
    } catch (err) {
      AgentCoreBase.addDebugLog('archiveFiles error: $err');
    }
    return null;
  }

  Future<Map<String, dynamic>?> unarchiveFile({
    required String archivePath,
    String? targetDirectory,
  }) async {
    try {
      final uri = Uri.parse('$baseUrl/api/workspace/unarchive');
      final res = await http
          .post(
            uri,
            headers: jsonHeaders(),
            body: jsonEncode({
              'archivePath': archivePath,
              if (targetDirectory != null && targetDirectory.isNotEmpty) 'targetDir': targetDirectory,
            }),
          )
          .timeout(const Duration(seconds: 60));

      if (res.statusCode == 200) {
        final decoded = jsonDecode(res.body);
        if (decoded is Map<String, dynamic> && decoded['status'] == 'ok') {
          AgentCoreBase.addDebugLog('Unarchived successfully: ${decoded['archivePath']}');
          return decoded;
        }
      } else {
        AgentCoreBase.addDebugLog('unarchiveFile failed: ${res.statusCode} ${res.body}');
      }
    } catch (err) {
      AgentCoreBase.addDebugLog('unarchiveFile error: $err');
    }
    return null;
  }

  Future<Map<String, dynamic>> fetchGitStatus({String? path}) async {
    try {
      final p = path ?? workspacePath;
      final target = p.isNotEmpty ? p : '/root';
      final res = await http.get(
        Uri.parse('$baseUrl/api/workspace/git/status?path=${Uri.encodeComponent(target)}'),
        headers: authHeaders,
      ).timeout(const Duration(seconds: 4));
      if (res.statusCode == 200) {
        return Map<String, dynamic>.from(jsonDecode(res.body));
      }
    } catch (err) {
      AgentCoreBase.addDebugLog('fetchGitStatus error: $err');
    }
    return {'branch': 'main', 'modifiedCount': 0, 'status': ''};
  }

  Future<List<Map<String, dynamic>>> getMemories({String? scope, String? domain, int? limit}) async {
    try {
      final queryParams = <String, String>{};
      if (scope != null) queryParams['scope'] = scope;
      if (domain != null) queryParams['domain'] = domain;
      if (limit != null) queryParams['limit'] = limit.toString();
      final uri = Uri.parse('$baseUrl/api/memory/list').replace(queryParameters: queryParams.isNotEmpty ? queryParams : null);

      final res = await http.get(
        uri,
        headers: authHeaders,
      ).timeout(const Duration(seconds: 8));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data is Map && data['memories'] is List) {
          return List<Map<String, dynamic>>.from(data['memories']);
        }
      }
    } catch (err) {
      AgentCoreBase.addDebugLog('getMemories error: $err');
    }
    return [];
  }

  Future<bool> saveMemory(
    String key,
    String value, {
    String? scope,
    String? importance,
    String? evidence,
    List<String>? tags,
  }) async {
    try {
      final payload = <String, dynamic>{
        'key': key,
        'domain': key,
        'value': value,
        'content': value,
      };
      if (scope != null) payload['scope'] = scope;
      if (importance != null) payload['importance'] = importance;
      if (evidence != null) payload['evidence'] = evidence;
      if (tags != null) payload['tags'] = tags;

      final res = await http.post(
        Uri.parse('$baseUrl/api/memory/add'),
        headers: {'Content-Type': 'application/json', ...authHeaders},
        body: jsonEncode(payload),
      ).timeout(const Duration(seconds: 5));
      return res.statusCode >= 200 && res.statusCode < 300;
    } catch (err) {
      AgentCoreBase.addDebugLog('saveMemory error: $err');
      return false;
    }
  }

  Future<bool> updateMemory({
    required String id,
    String? content,
    String? domain,
    String? importance,
    String? evidence,
    List<String>? tags,
    String? scope,
  }) async {
    try {
      final payload = <String, dynamic>{'id': id};
      if (content != null) {
        payload['content'] = content;
        payload['value'] = content;
      }
      if (domain != null) {
        payload['domain'] = domain;
        payload['key'] = domain;
      }
      if (importance != null) payload['importance'] = importance;
      if (evidence != null) payload['evidence'] = evidence;
      if (tags != null) payload['tags'] = tags;
      if (scope != null) payload['scope'] = scope;

      final res = await http.post(
        Uri.parse('$baseUrl/api/memory/update'),
        headers: {'Content-Type': 'application/json', ...authHeaders},
        body: jsonEncode(payload),
      ).timeout(const Duration(seconds: 5));
      return res.statusCode >= 200 && res.statusCode < 300;
    } catch (err) {
      AgentCoreBase.addDebugLog('updateMemory error: $err');
      return false;
    }
  }

  Future<bool> deleteMemory({
    String? id,
    List<String>? ids,
    String? domain,
    String? scope,
  }) async {
    try {
      final payload = <String, dynamic>{};
      if (id != null) payload['id'] = id;
      if (ids != null) payload['ids'] = ids;
      if (domain != null) payload['domain'] = domain;
      if (scope != null) payload['scope'] = scope;

      final res = await http.post(
        Uri.parse('$baseUrl/api/memory/delete'),
        headers: {'Content-Type': 'application/json', ...authHeaders},
        body: jsonEncode(payload),
      ).timeout(const Duration(seconds: 5));
      return res.statusCode >= 200 && res.statusCode < 300;
    } catch (err) {
      AgentCoreBase.addDebugLog('deleteMemory error: $err');
      return false;
    }
  }

  Future<bool> resetMemory({String? scope = 'all', String? domain}) async {
    try {
      final payload = <String, dynamic>{
        'scope': scope ?? 'all',
      };
      if (domain != null) payload['domain'] = domain;

      final res = await http.post(
        Uri.parse('$baseUrl/api/memory/reset'),
        headers: {'Content-Type': 'application/json', ...authHeaders},
        body: jsonEncode(payload),
      ).timeout(const Duration(seconds: 5));
      return res.statusCode >= 200 && res.statusCode < 300;
    } catch (err) {
      AgentCoreBase.addDebugLog('resetMemory error: $err');
      return false;
    }
  }

  Future<List<Map<String, dynamic>>> searchMemories(
    String query, {
    String? scope,
    String? domain,
    int? limit,
  }) async {
    try {
      final queryParams = <String, String>{
        'q': query,
      };
      if (scope != null) queryParams['scope'] = scope;
      if (domain != null) queryParams['domain'] = domain;
      if (limit != null) queryParams['limit'] = limit.toString();

      final uri = Uri.parse('$baseUrl/api/memory/search').replace(queryParameters: queryParams);
      final res = await http.get(uri, headers: authHeaders).timeout(const Duration(seconds: 5));
      if (res.statusCode == 200) {
        final dynamic data = jsonDecode(res.body);
        if (data is List) {
          return data.whereType<Map>().map((m) => Map<String, dynamic>.from(m)).toList();
        }
      }
    } catch (err) {
      AgentCoreBase.addDebugLog('searchMemories error: $err');
    }
    return [];
  }

  Future<Map<String, dynamic>?> getMemoryStats({String? scope}) async {
    try {
      final queryParams = <String, String>{};
      if (scope != null) queryParams['scope'] = scope;

      final uri = Uri.parse('$baseUrl/api/memory/stats').replace(queryParameters: queryParams.isNotEmpty ? queryParams : null);
      final res = await http.get(uri, headers: authHeaders).timeout(const Duration(seconds: 5));
      if (res.statusCode == 200) {
        final dynamic data = jsonDecode(res.body);
        if (data is Map) {
          return Map<String, dynamic>.from(data);
        }
      }
    } catch (err) {
      AgentCoreBase.addDebugLog('getMemoryStats error: $err');
    }
    return null;
  }
}
