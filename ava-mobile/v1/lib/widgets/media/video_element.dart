import 'package:flutter/material.dart';
import 'video_element_stub.dart'
    if (dart.library.html) 'video_element_web.dart' as platform;

Widget buildPlatformVideoView({
  required String url,
  required String viewId,
  required bool isDark,
}) {
  return platform.buildVideoElement(
    url: url,
    viewId: viewId,
    isDark: isDark,
  );
}
