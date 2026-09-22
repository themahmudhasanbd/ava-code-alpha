import 'package:flutter/foundation.dart';

class AudioPlayerServiceImpl {
  static bool get isSupported => false;

  static void play({
    required String url,
    required void Function(double currentSeconds, double totalSeconds) onTimeUpdate,
    required VoidCallback onEnded,
    required void Function(String error) onError,
  }) {
    onError('Audio player not supported on this platform');
  }

  static void pause() {}

  static void resume() {}

  static void seek(double seconds) {}

  static void stop() {}
}
