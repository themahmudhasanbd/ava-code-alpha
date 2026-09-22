import 'package:flutter/foundation.dart';

class SpeechServiceImpl {
  static bool get isSupported => false;

  static void startListening({
    required void Function(String text) onResult,
    required void Function(String error) onError,
    required VoidCallback onEnd,
    required VoidCallback onStarted,
  }) {
    onError('Speech recognition is not supported on this platform');
    onEnd();
  }

  static void stopListening() {}
}
