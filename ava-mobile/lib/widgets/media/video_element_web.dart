// ignore_for_file: avoid_web_libraries_in_flutter, deprecated_member_use
import 'dart:html' as html;
import 'dart:ui_web' as ui_web;
import 'package:flutter/material.dart';

final Set<String> _registeredVideoViews = {};

Widget buildVideoElement({
  required String url,
  required String viewId,
  required bool isDark,
}) {
  final safeUrlHash = url.hashCode.abs();
  final uniqueId = 'ava-video-${viewId}_$safeUrlHash';

  if (!_registeredVideoViews.contains(uniqueId)) {
    _registeredVideoViews.add(uniqueId);
    ui_web.platformViewRegistry.registerViewFactory(uniqueId, (int id) {
      final video = html.VideoElement()
        ..src = url
        ..controls = true
        ..autoplay = false
        ..preload = 'auto'
        ..crossOrigin = 'anonymous'
        ..style.border = 'none'
        ..style.width = '100%'
        ..style.height = '100%'
        ..style.backgroundColor = isDark ? '#090A0F' : '#F1F5F9'
        ..style.objectFit = 'contain';
      return video;
    });
  }

  return HtmlElementView(
    key: ValueKey(uniqueId),
    viewType: uniqueId,
  );
}
