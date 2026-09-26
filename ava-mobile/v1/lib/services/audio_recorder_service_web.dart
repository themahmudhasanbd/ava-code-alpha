import 'dart:async';
import 'dart:convert';
import 'dart:js_interop';
import 'package:flutter/foundation.dart';
import 'audio_recorder_service.dart';

@JS('avaAudioRecordIsSupported')
external bool _avaAudioRecordIsSupported();

@JS('avaAudioRecordStart')
external void _avaAudioRecordStart(
  JSFunction onStarted,
  JSFunction onError,
);

@JS('avaAudioRecordStop')
external void _avaAudioRecordStop(
  JSFunction onSuccess,
  JSFunction onError,
);

class AudioRecorderServiceImpl {
  static bool get isSupported {
    if (!kIsWeb) return false;
    try {
      return _avaAudioRecordIsSupported();
    } catch (_) {
      return false;
    }
  }

  static void startRecording({
    required VoidCallback onStarted,
    required void Function(String error) onError,
  }) {
    try {
      final jsOnStarted = (() {
        onStarted();
      }).toJS;

      final jsOnError = ((JSString err) {
        onError(err.toDart);
      }).toJS;

      _avaAudioRecordStart(jsOnStarted, jsOnError);
    } catch (e) {
      onError(e.toString());
    }
  }

  static Future<AudioRecordingResult?> stopRecording() {
    final completer = Completer<AudioRecordingResult?>();

    try {
      final jsOnSuccess = ((JSString dataUrl, JSString mimeType, JSNumber durationMs) {
        try {
          final dataUrlStr = dataUrl.toDart;
          final mimeStr = mimeType.toDart;
          final duration = Duration(milliseconds: durationMs.toDartInt);

          final commaIdx = dataUrlStr.indexOf(',');
          final base64Raw = commaIdx != -1 ? dataUrlStr.substring(commaIdx + 1) : dataUrlStr;
          final bytes = base64Decode(base64Raw);

          String ext = 'webm';
          if (mimeStr.contains('wav')) {
            ext = 'wav';
          } else if (mimeStr.contains('mp4') || mimeStr.contains('m4a')) {
            ext = 'm4a';
          } else if (mimeStr.contains('ogg')) {
            ext = 'ogg';
          } else if (mimeStr.contains('mp3') || mimeStr.contains('mpeg')) {
            ext = 'mp3';
          }

          completer.complete(AudioRecordingResult(
            bytes: bytes,
            base64Data: dataUrlStr,
            mimeType: mimeStr,
            duration: duration,
            extension: ext,
          ));
        } catch (e) {
          completer.complete(null);
        }
      }).toJS;

      final jsOnError = ((JSString err) {
        completer.complete(null);
      }).toJS;

      _avaAudioRecordStop(jsOnSuccess, jsOnError);
    } catch (e) {
      completer.complete(null);
    }

    return completer.future;
  }
}
