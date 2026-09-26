import 'dart:js_interop';
import 'package:flutter/foundation.dart';

@JS('avaSpeechIsSupported')
external bool _avaSpeechIsSupported();

@JS('avaSpeechStart')
external void _avaSpeechStart(
  JSFunction onResult,
  JSFunction onError,
  JSFunction onEnd,
  JSFunction onStarted,
);

@JS('avaSpeechStop')
external void _avaSpeechStop();

class SpeechServiceImpl {
  static bool get isSupported {
    if (!kIsWeb) return false;
    try {
      return _avaSpeechIsSupported();
    } catch (_) {
      return false;
    }
  }

  static void startListening({
    required void Function(String text) onResult,
    required void Function(String error) onError,
    required VoidCallback onEnd,
    required VoidCallback onStarted,
  }) {
    try {
      final jsOnResult = ((JSString text) {
        onResult(text.toDart);
      }).toJS;

      final jsOnError = ((JSString error) {
        onError(error.toDart);
      }).toJS;

      final jsOnEnd = (() {
        onEnd();
      }).toJS;

      final jsOnStarted = (() {
        onStarted();
      }).toJS;

      _avaSpeechStart(jsOnResult, jsOnError, jsOnEnd, jsOnStarted);
    } catch (e) {
      onError(e.toString());
      onEnd();
    }
  }

  static void stopListening() {
    try {
      _avaSpeechStop();
    } catch (e) { print('Ignored error: $e'); }
  }
}
