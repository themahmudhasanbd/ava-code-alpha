import 'package:flutter/foundation.dart';
import 'speech_service_stub.dart'
    if (dart.library.js_interop) 'speech_service_web.dart';

class SpeechService {
  static bool get isSupported => SpeechServiceImpl.isSupported;

  static void startListening({
    required void Function(String text) onResult,
    required void Function(String error) onError,
    required VoidCallback onEnd,
    required VoidCallback onStarted,
  }) {
    SpeechServiceImpl.startListening(
      onResult: onResult,
      onError: onError,
      onEnd: onEnd,
      onStarted: onStarted,
    );
  }

  static void stopListening() {
    SpeechServiceImpl.stopListening();
  }
}
