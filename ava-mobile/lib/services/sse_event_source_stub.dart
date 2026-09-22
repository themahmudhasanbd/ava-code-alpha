import 'dart:async';

Stream<String>? connectPlatformSse(String url, {String? authToken}) {
  // On non-web platforms, return null to use http.Client streamed response
  return null;
}

void closePlatformSse() {
  // No-op on non-web
}
