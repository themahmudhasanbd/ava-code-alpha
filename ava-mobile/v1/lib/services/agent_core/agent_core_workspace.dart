import 'dart:convert';
import 'dart:typed_data';
import 'agent_core_base.dart';

mixin AgentCoreWorkspaceMixin on AgentCoreBase {
  // ─── Native Workspace / Files via AvA Core JSON-RPC 2.0 ─────────────────────

  /// Lists files and directories in [path] using native `fs/readDirectory` RPC.
  Future<List<Map<String, dynamic>>> fetchWorkspaceFilesTree([String? path]) async {
    final targetPath = (path != null && path.isNotEmpty) ? path : (workspacePath.isNotEmpty ? workspacePath : '/root');
    try {
      final res = await sendRpc('fs/readDirectory', {'path': targetPath});
      if (res is Map && res['entries'] is List) {
        final entries = res['entries'] as List;
        final List<Map<String, dynamic>> results = [];

        for (final item in entries) {
          if (item is Map) {
            final fileName = item['fileName']?.toString() ?? '';
            if (fileName.isEmpty) continue;

            final isDir = item['isDirectory'] == true;
            final isFile = item['isFile'] == true;
            final fullPath = targetPath == '/' ? '/$fileName' : '$targetPath/$fileName';
            final ext = isDir ? 'folder' : (fileName.contains('.') ? fileName.split('.').last.toLowerCase() : 'file');

            results.add({
              'name': fileName,
              'fileName': fileName,
              'isDirectory': isDir,
              'isFile': isFile,
              'path': fullPath,
              'fullPath': fullPath,
              'type': ext,
              'size': '',
              'children': <Map<String, dynamic>>[],
            });
          }
        }

        // Sort: directories first, then alphabetical files
        results.sort((a, b) {
          final aIsDir = a['isDirectory'] == true;
          final bIsDir = b['isDirectory'] == true;
          if (aIsDir && !bIsDir) return -1;
          if (!aIsDir && bIsDir) return 1;
          return (a['name'] as String).toLowerCase().compareTo((b['name'] as String).toLowerCase());
        });

        return results;
      }
    } catch (err) {
      AgentCoreBase.addDebugLog('fetchWorkspaceFilesTree error: $err');
    }
    return [];
  }

  /// Lists media and downloaded files in the target path
  Future<List<Map<String, dynamic>>> fetchWorkspaceMediaFiles([String? path]) async {
    final targetPath = (path != null && path.isNotEmpty) ? path : '/root/shared-media';
    try {
      final list = await fetchWorkspaceFilesTree(targetPath);
      final mediaExts = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'mp3', 'wav', 'ogg', 'm4a', 'mp4', 'webm', 'pdf'};
      return list.where((item) {
        if (item['isDirectory'] == true) return true;
        final ext = (item['type'] as String? ?? '').toLowerCase();
        return mediaExts.contains(ext);
      }).toList();
    } catch (err) {
      AgentCoreBase.addDebugLog('fetchWorkspaceMediaFiles error: $err');
    }
    return [];
  }

  /// Reads text or binary file content via native `fs/readFile` RPC.
  Future<String?> fetchFileContent(String filePath, [String? directory]) async {
    try {
      final targetPath = filePath.startsWith('/')
          ? filePath
          : ((directory ?? workspacePath).endsWith('/')
              ? '${directory ?? workspacePath}$filePath'
              : '${directory ?? workspacePath}/$filePath');

      final res = await sendRpc('fs/readFile', {'path': targetPath});
      if (res is Map && res['dataBase64'] != null) {
        final base64Str = res['dataBase64'].toString();
        final bytes = base64Decode(base64Str);
        try {
          return utf8.decode(bytes);
        } catch (_) {
          return latin1.decode(bytes);
        }
      }
    } catch (err) {
      AgentCoreBase.addDebugLog('fetchFileContent error: $err');
    }
    return null;
  }

  Future<String?> fetchWorkspaceFileContent(String filePath) => fetchFileContent(filePath);

  /// Writes text content to file via native `fs/writeFile` RPC.
  Future<bool> updateWorkspaceFileContent(String filePath, String content) async {
    try {
      final targetPath = filePath.startsWith('/')
          ? filePath
          : (workspacePath.endsWith('/') ? '$workspacePath$filePath' : '$workspacePath/$filePath');

      final base64Data = base64Encode(utf8.encode(content));
      await sendRpc('fs/writeFile', {
        'path': targetPath,
        'dataBase64': base64Data,
      });
      AgentCoreBase.addDebugLog('Saved workspace file: $targetPath');
      return true;
    } catch (err) {
      AgentCoreBase.addDebugLog('updateWorkspaceFileContent error: $err');
      return false;
    }
  }

  /// Creates a directory on the server via native `fs/createDirectory` RPC.
  Future<bool> createWorkspaceDirectory(String dirPath) async {
    try {
      await sendRpc('fs/createDirectory', {
        'path': dirPath,
        'recursive': true,
      });
      AgentCoreBase.addDebugLog('Created workspace directory: $dirPath');
      return true;
    } catch (err) {
      AgentCoreBase.addDebugLog('createWorkspaceDirectory error: $err');
      return false;
    }
  }

  /// Global Media & File Uploader: writes arbitrary bytes to VPS via native `fs/writeFile`.
  Future<Map<String, dynamic>?> uploadFile({
    required String targetDirectory,
    required String fileName,
    required Uint8List fileBytes,
  }) async {
    try {
      final cleanTargetDir = targetDirectory.isNotEmpty ? targetDirectory : '/root/shared-media';
      // Ensure target directory exists
      try {
        await sendRpc('fs/createDirectory', {
          'path': cleanTargetDir,
          'recursive': true,
        });
      } catch (_) {}

      final fullPath = cleanTargetDir == '/' ? '/$fileName' : '$cleanTargetDir/$fileName';
      final base64Data = base64Encode(fileBytes);

      await sendRpc('fs/writeFile', {
        'path': fullPath,
        'dataBase64': base64Data,
      });

      AgentCoreBase.addDebugLog('File uploaded successfully via native RPC: $fullPath (${fileBytes.length} bytes)');
      return {
        'status': 'ok',
        'fullPath': fullPath,
        'fileName': fileName,
        'size': fileBytes.length,
      };
    } catch (err) {
      AgentCoreBase.addDebugLog('uploadFile error: $err');
    }
    return null;
  }

  /// Download asset directly from remote URL into target directory on VPS using curl/command execution
  Future<Map<String, dynamic>?> downloadFileFromUrl({
    required String targetDirectory,
    required String url,
    String? fileName,
  }) async {
    try {
      final cleanDir = targetDirectory.isNotEmpty ? targetDirectory : '/root/shared-media';
      final name = fileName ?? url.split('?').first.split('/').last;
      final fullPath = cleanDir == '/' ? '/$name' : '$cleanDir/$name';

      final res = await sendRpc('command/exec', {
        'command': ['curl', '-sSL', '-o', fullPath, url],
        'cwd': cleanDir,
        'streamStdoutStderr': false,
      });

      if (res is Map && res['exitCode'] == 0) {
        AgentCoreBase.addDebugLog('File downloaded from URL: $fullPath');
        return {
          'status': 'ok',
          'fullPath': fullPath,
          'fileName': name,
        };
      }
    } catch (err) {
      AgentCoreBase.addDebugLog('downloadFileFromUrl error: $err');
    }
    return null;
  }

  /// Delete file or directory on VPS via native `fs/remove` RPC
  Future<bool> deleteWorkspaceFile(String fullPath) async {
    try {
      await sendRpc('fs/remove', {
        'path': fullPath,
        'recursive': true,
        'force': true,
      });
      AgentCoreBase.addDebugLog('Deleted workspace path: $fullPath');
      return true;
    } catch (err) {
      AgentCoreBase.addDebugLog('deleteWorkspaceFile error: $err');
    }
    return false;
  }

  /// Reads text or binary file content as raw Uint8List bytes via native `fs/readFile` RPC.
  Future<Uint8List?> fetchFileBytes(String filePath, [String? directory]) async {
    try {
      final targetPath = filePath.startsWith('/')
          ? filePath
          : ((directory ?? workspacePath).endsWith('/')
              ? '${directory ?? workspacePath}$filePath'
              : '${directory ?? workspacePath}/$filePath');

      final res = await sendRpc('fs/readFile', {'path': targetPath});
      if (res is Map && res['dataBase64'] != null) {
        final base64Str = res['dataBase64'].toString();
        return base64Decode(base64Str.replaceAll(RegExp(r'\s+'), ''));
      }
    } catch (err) {
      AgentCoreBase.addDebugLog('fetchFileBytes error: $err');
    }
    return null;
  }

  String getRawFileUrl(String fullPath) {
    if (fullPath.isEmpty) return '';
    if (fullPath.startsWith('http://') || fullPath.startsWith('https://') || fullPath.startsWith('data:')) {
      return fullPath;
    }
    final base = (baseUrl.endsWith('/') ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl).trim();
    if (fullPath.startsWith('/api/workspace/raw') || fullPath.startsWith('api/workspace/raw')) {
      final pathSuffix = fullPath.startsWith('/') ? fullPath : '/$fullPath';
      return base.isNotEmpty ? '$base$pathSuffix' : pathSuffix;
    }
    return base.isNotEmpty
        ? '$base/api/workspace/raw?path=${Uri.encodeComponent(fullPath)}'
        : '/api/workspace/raw?path=${Uri.encodeComponent(fullPath)}';
  }

  /// Archive multiple files/directories into a tar.gz via native `command/exec`
  Future<Map<String, dynamic>?> archiveFiles({
    required String targetDirectory,
    required List<String> fileNames,
    String? archiveName,
    String format = 'tar.gz',
  }) async {
    try {
      final outName = (archiveName != null && archiveName.isNotEmpty)
          ? (archiveName.endsWith('.tar.gz') ? archiveName : '$archiveName.tar.gz')
          : 'archive_${DateTime.now().millisecondsSinceEpoch}.tar.gz';

      final res = await sendRpc('command/exec', {
        'command': ['tar', '-czf', outName, ...fileNames],
        'cwd': targetDirectory,
        'streamStdoutStderr': false,
      });

      if (res is Map && res['exitCode'] == 0) {
        final fullPath = targetDirectory == '/' ? '/$outName' : '$targetDirectory/$outName';
        AgentCoreBase.addDebugLog('Archived successfully: $fullPath');
        return {
          'status': 'ok',
          'archiveName': outName,
          'fullPath': fullPath,
        };
      }
    } catch (err) {
      AgentCoreBase.addDebugLog('archiveFiles error: $err');
    }
    return null;
  }

  /// Unarchive a tar.gz or zip archive via native `command/exec`
  Future<Map<String, dynamic>?> unarchiveFile({
    required String archivePath,
    String? targetDirectory,
  }) async {
    try {
      final destDir = targetDirectory ?? (archivePath.contains('/') ? archivePath.substring(0, archivePath.lastIndexOf('/')) : '.');
      final isZip = archivePath.toLowerCase().endsWith('.zip');

      final cmd = isZip
          ? ['unzip', '-o', archivePath, '-d', destDir]
          : ['tar', '-xzf', archivePath, '-C', destDir];

      final res = await sendRpc('command/exec', {
        'command': cmd,
        'streamStdoutStderr': false,
      });

      if (res is Map && res['exitCode'] == 0) {
        AgentCoreBase.addDebugLog('Unarchived successfully: $archivePath');
        return {
          'status': 'ok',
          'archivePath': archivePath,
          'targetDir': destDir,
        };
      }
    } catch (err) {
      AgentCoreBase.addDebugLog('unarchiveFile error: $err');
    }
    return null;
  }

  /// Native git status check via `command/exec`
  Future<Map<String, dynamic>> fetchGitStatus({String? path}) async {
    final target = (path != null && path.isNotEmpty) ? path : (workspacePath.isNotEmpty ? workspacePath : '/var/www/ava-code');
    try {
      final res = await sendRpc('command/exec', {
        'command': ['git', 'status', '--porcelain', '-b'],
        'cwd': target,
        'streamStdoutStderr': false,
      });

      if (res is Map && res['exitCode'] == 0) {
        final stdout = res['stdout']?.toString() ?? '';
        final lines = stdout.split('\n').where((l) => l.trim().isNotEmpty).toList();
        String branch = 'main';
        int modifiedCount = 0;

        for (final line in lines) {
          if (line.startsWith('##')) {
            final branchPart = line.substring(2).trim().split('...').first;
            if (branchPart.isNotEmpty) branch = branchPart;
          } else {
            modifiedCount++;
          }
        }

        return {
          'branch': branch,
          'modifiedCount': modifiedCount,
          'status': stdout,
        };
      }
    } catch (err) {
      AgentCoreBase.addDebugLog('fetchGitStatus error: $err');
    }
    return {'branch': 'main', 'modifiedCount': 0, 'status': ''};
  }

  // ─── Memories via App-Server Protocol / Persistent Memory ──────────────────

  Future<List<Map<String, dynamic>>> getMemories({String? scope, String? domain, int? limit}) async {
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
    return true;
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
    return true;
  }

  Future<bool> deleteMemory({
    String? id,
    List<String>? ids,
    String? domain,
    String? scope,
  }) async {
    return true;
  }

  Future<bool> resetMemory({String? scope = 'all', String? domain}) async {
    return true;
  }

  Future<List<Map<String, dynamic>>> searchMemories(
    String query, {
    String? scope,
    String? domain,
    int? limit,
  }) async {
    return [];
  }

  Future<Map<String, dynamic>?> getMemoryStats({String? scope}) async {
    return null;
  }
}
