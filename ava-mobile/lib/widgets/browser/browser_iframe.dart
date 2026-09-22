import 'package:flutter/material.dart';
import 'browser_iframe_stub.dart'
    if (dart.library.html) 'browser_iframe_web.dart' as platform;

Widget buildPlatformBrowserIFrame({
  required String url,
  required String viewId,
  required bool isDark,
}) {
  return platform.buildBrowserIFrame(
    url: url,
    viewId: viewId,
    isDark: isDark,
  );
}

Future<String> evaluatePlatformBrowserJs(String code, {String? viewId}) {
  return platform.evaluateBrowserJs(code, viewId: viewId);
}

