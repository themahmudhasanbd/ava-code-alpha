import 'package:flutter/material.dart';

Widget buildBrowserIFrame({
  required String url,
  required String viewId,
  required bool isDark,
}) {
  return Center(
    child: Text(
      'Embedded preview for $url',
      style: const TextStyle(fontSize: 13, color: Colors.grey),
    ),
  );
}

Future<String> evaluateBrowserJs(String code, {String? viewId}) async {
  return 'JavaScript evaluation is only supported on Web platform view.';
}

