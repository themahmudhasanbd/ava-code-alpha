import 'dart:io';
import 'dart:typed_data';
import 'package:http/http.dart' as http;

/// Non-web stub implementation that saves file bytes to the local filesystem.
Future<bool> platformDownloadBytes({
  required Uint8List bytes,
  required String fileName,
  String? mimeType,
}) async {
  try {
    String targetDir = '/storage/emulated/0/Download';
    final dir = Directory(targetDir);
    if (!dir.existsSync()) {
      targetDir = Directory.systemTemp.path;
    }
    final file = File('$targetDir/$fileName');
    await file.writeAsBytes(bytes);
    return true;
  } catch (_) {
    return false;
  }
}

/// Downloads directly from a URL via http and saves to local storage.
Future<bool> platformDownloadFromUrl({
  required String url,
  required String fileName,
  Map<String, String>? headers,
}) async {
  try {
    final res = await http.get(Uri.parse(url), headers: headers);
    if (res.statusCode == 200) {
      return await platformDownloadBytes(
        bytes: res.bodyBytes,
        fileName: fileName,
      );
    }
    return false;
  } catch (_) {
    return false;
  }
}
