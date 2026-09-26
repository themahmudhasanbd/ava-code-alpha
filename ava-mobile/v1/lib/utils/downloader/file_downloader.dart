import 'dart:typed_data';
import 'file_downloader_stub.dart'
    if (dart.library.html) 'file_downloader_web.dart' as impl;

/// Unified Cross-Platform File Downloader
class FileDownloader {
  /// Download bytes directly to device/browser download manager
  static Future<bool> downloadBytes({
    required Uint8List bytes,
    required String fileName,
    String? mimeType,
  }) =>
      impl.platformDownloadBytes(
        bytes: bytes,
        fileName: fileName,
        mimeType: mimeType,
      );

  /// Download from URL directly
  static Future<bool> downloadFromUrl({
    required String url,
    required String fileName,
    Map<String, String>? headers,
  }) =>
      impl.platformDownloadFromUrl(
        url: url,
        fileName: fileName,
        headers: headers,
      );
}
