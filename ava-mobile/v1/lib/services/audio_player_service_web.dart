import 'dart:js_interop';
import 'package:flutter/foundation.dart';

@JS('avaAudioPlay')
external void _avaAudioPlay(
  JSString url,
  JSFunction onTimeUpdate,
  JSFunction onEnded,
  JSFunction onError,
);

@JS('avaAudioPause')
external void _avaAudioPause();

@JS('avaAudioResume')
external void _avaAudioResume();

@JS('avaAudioSeek')
external void _avaAudioSeek(JSNumber seconds);

@JS('avaAudioStop')
external void _avaAudioStop();

class AudioPlayerServiceImpl {
  static bool get isSupported => kIsWeb;

  static void play({
    required String url,
    required void Function(double currentSeconds, double totalSeconds) onTimeUpdate,
    required VoidCallback onEnded,
    required void Function(String error) onError,
  }) {
    try {
      final jsTimeUpdate = ((JSNumber curr, JSNumber total) {
        onTimeUpdate(curr.toDartDouble, total.toDartDouble);
      }).toJS;

      final jsEnded = (() {
        onEnded();
      }).toJS;

      final jsError = ((JSString err) {
        onError(err.toDart);
      }).toJS;

      _avaAudioPlay(url.toJS, jsTimeUpdate, jsEnded, jsError);
    } catch (e) {
      onError(e.toString());
    }
  }

  static void pause() {
    try {
      _avaAudioPause();
    } catch (e) { print('Ignored error: $e'); }
  }

  static void resume() {
    try {
      _avaAudioResume();
    } catch (e) { print('Ignored error: $e'); }
  }

  static void seek(double seconds) {
    try {
      _avaAudioSeek(seconds.toJS);
    } catch (e) { print('Ignored error: $e'); }
  }

  static void stop() {
    try {
      _avaAudioStop();
    } catch (e) { print('Ignored error: $e'); }
  }
}
