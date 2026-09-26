import 'dart:async';
import 'sse_event_source_stub.dart'
    if (dart.library.html) 'sse_event_source_web.dart' as platform_sse;

Stream<String>? connectPlatformSse(String url, {String? authToken}) {
  return platform_sse.connectPlatformSse(url, authToken: authToken);
}

void closePlatformSse() {
  platform_sse.closePlatformSse();
}
