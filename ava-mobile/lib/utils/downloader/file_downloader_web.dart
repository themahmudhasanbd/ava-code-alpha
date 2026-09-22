// ignore_for_file: avoid_web_libraries_in_flutter, deprecated_member_use
import 'dart:async';
import 'dart:html' as html;
import 'dart:typed_data';

/// Direct in-browser file downloader that avoids opening new windows or redirecting the current page.
Future<bool> platformDownloadBytes({
  required Uint8List bytes,
  required String fileName,
  String? mimeType,
}) async {
  try {
    final blob = html.Blob([bytes], mimeType ?? 'application/octet-stream');
    final url = html.Url.createObjectUrlFromBlob(blob);
    final anchor = html.AnchorElement(href: url)
      ..download = fileName
      ..style.display = 'none';

    html.document.body?.children.add(anchor);
    anchor.click();

    // Clean up
    Timer(const Duration(seconds: 2), () {
      anchor.remove();
      html.Url.revokeObjectUrl(url);
    });

    return true;
  } catch (err) {
    return false;
  }
}

/// Downloads directly from a URL via Blob inside the browser.
Future<bool> platformDownloadFromUrl({
  required String url,
  required String fileName,
  Map<String, String>? headers,
}) async {
  try {
    final anchor = html.AnchorElement(href: url)
      ..download = fileName
      ..style.display = 'none';

    html.document.body?.children.add(anchor);
    anchor.click();

    Timer(const Duration(seconds: 2), () {
      anchor.remove();
    });
    return true;
  } catch (err) {
    return false;
  }
}
