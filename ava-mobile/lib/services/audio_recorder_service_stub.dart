import 'package:flutter/foundation.dart';
import 'audio_recorder_service.dart';

class AudioRecorderServiceImpl {
  static bool get isSupported => false;

  static void startRecording({
    required VoidCallback onStarted,
    required void Function(String error) onError,
  }) {
    onError('Audio recording is not supported on this platform.');
  }

  static Future<AudioRecordingResult?> stopRecording() async {
    return null;
  }
}
