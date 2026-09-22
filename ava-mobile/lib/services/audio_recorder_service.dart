import 'package:flutter/foundation.dart';
import 'audio_recorder_service_stub.dart'
    if (dart.library.js_interop) 'audio_recorder_service_web.dart';

class AudioRecordingResult {
  final Uint8List bytes;
  final String base64Data;
  final String mimeType;
  final Duration duration;
  final String extension;

  const AudioRecordingResult({
    required this.bytes,
    required this.base64Data,
    required this.mimeType,
    required this.duration,
    required this.extension,
  });
}

class AudioRecorderService {
  static bool get isSupported => AudioRecorderServiceImpl.isSupported;

  static void startRecording({
    required VoidCallback onStarted,
    required void Function(String error) onError,
  }) {
    AudioRecorderServiceImpl.startRecording(
      onStarted: onStarted,
      onError: onError,
    );
  }

  static Future<AudioRecordingResult?> stopRecording() {
    return AudioRecorderServiceImpl.stopRecording();
  }
}
