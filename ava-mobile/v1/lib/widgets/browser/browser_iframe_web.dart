// ignore_for_file: avoid_web_libraries_in_flutter, deprecated_member_use
import 'dart:html' as html;
import 'dart:js' as js;
import 'dart:ui_web' as ui_web;
import 'package:flutter/material.dart';

final Set<String> _registeredViewIds = {};

Widget buildBrowserIFrame({
  required String url,
  required String viewId,
  required bool isDark,
}) {
  // For external URLs that may block iframes, route through our proxy
  String effectiveUrl = url;
  if (url.startsWith('https://') || url.startsWith('http://')) {
    final isLocalhost = url.contains('localhost') ||
        url.contains('127.0.0.1') ||
        url.contains('veliq.eu.cc') ||
        url.contains('test.thundernexus.com');
    if (!isLocalhost) {
      // Route external sites through veliq proxy to strip X-Frame-Options
      effectiveUrl =
          'https://veliq.eu.cc/__proxy?url=${Uri.encodeComponent(url)}';
    }
  }

  final uniqueId = 'ava-browser-$viewId';

  if (!_registeredViewIds.contains(uniqueId)) {
    _registeredViewIds.add(uniqueId);
    ui_web.platformViewRegistry.registerViewFactory(uniqueId, (int id) {
      final iframe = html.IFrameElement()
        ..id = uniqueId
        ..src = effectiveUrl
        ..style.border = 'none'
        ..style.width = '100%'
        ..style.height = '100%'
        ..style.backgroundColor = isDark ? '#090a0f' : '#ffffff'
        ..allow =
            'fullscreen; clipboard-read; clipboard-write; camera; microphone'
        ..title = 'AvA Embedded Browser'
        // Do NOT set sandbox — sandbox blocks scripts and causes blank pages
        ..setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
      return iframe;
    });
  }

  return HtmlElementView(
    key: ValueKey('$uniqueId-$effectiveUrl'),
    viewType: uniqueId,
  );
}

Future<String> evaluateBrowserJs(String code, {String? viewId}) async {
  try {
    if (viewId != null && viewId.isNotEmpty) {
      final iframe = html.document.getElementById('ava-browser-$viewId') as html.IFrameElement?;
      if (iframe != null && iframe.contentWindow != null) {
        try {
          final jsWin = js.JsObject.fromBrowserObject(iframe.contentWindow!);
          final res = jsWin.callMethod('eval', [code]);
          return res != null ? res.toString() : 'undefined';
        } catch (_) {
          // Cross-origin restriction; fallback to window eval
        }
      }
    }
    final res = js.context.callMethod('eval', [code]);
    return res != null ? res.toString() : 'undefined';
  } catch (e) {
    return 'Error: $e';
  }
}

