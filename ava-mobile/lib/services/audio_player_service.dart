import 'package:flutter/foundation.dart';
import 'audio_player_service_stub.dart'
    if (dart.library.js_interop) 'audio_player_service_web.dart';

class AudioPlayerService {
  static bool get isSupported => AudioPlayerServiceImpl.isSupported;

  static void play({
    required String url,
    required void Function(double currentSeconds, double totalSeconds) onTimeUpdate,
    required VoidCallback onEnded,
    required void Function(String error) onError,
  }) {
    AudioPlayerServiceImpl.play(
      url: url,
      onTimeUpdate: onTimeUpdate,
      onEnded: onEnded,
      onError: onError,
    );
  }

  static void pause() => AudioPlayerServiceImpl.pause();

  static void resume() => AudioPlayerServiceImpl.resume();

  static void seek(double seconds) => AudioPlayerServiceImpl.seek(seconds);

  static void stop() => AudioPlayerServiceImpl.stop();
}
