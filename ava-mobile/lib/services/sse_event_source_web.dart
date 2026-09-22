// ignore_for_file: avoid_web_libraries_in_flutter, deprecated_member_use
import 'dart:async';
import 'dart:html' as html;

html.EventSource? _activeWebEventSource;
StreamController<String>? _activeWebSseController;
StreamSubscription<html.MessageEvent>? _activeWebMessageSub;

/// Cancels the active web SSE stream. Returns true if a stream was active.
/// Previously closePlatformSse() closed the EventSource and controller but left
/// the onMessage subscription wired, which kept firing into the (now closed)
/// controller and leaked the closure.
bool closePlatformSse() {
  var wasActive = false;
  try {
    _activeWebMessageSub?.cancel();
    _activeWebMessageSub = null;
  } catch (e) { print('Ignored error: $e'); }
  try {
    if (_activeWebEventSource != null) {
      _activeWebEventSource?.close();
      _activeWebEventSource = null;
      wasActive = true;
    }
  } catch (e) { print('Ignored error: $e'); }
  try {
    if (_activeWebSseController != null && !_activeWebSseController!.isClosed) {
      _activeWebSseController?.close();
    }
    _activeWebSseController = null;
  } catch (e) { print('Ignored error: $e'); }
  return wasActive;
}

Stream<String>? connectPlatformSse(String url, {String? authToken}) {
  try {
    closePlatformSse();
    final controller = StreamController<String>.broadcast();
    _activeWebSseController = controller;

    final eventSource = html.EventSource(url);
    _activeWebEventSource = eventSource;

    // Stored so closePlatformSse() can cancel it. Previously the subscription
    // was discarded, leaking for the lifetime of the page.
    _activeWebMessageSub = eventSource.onMessage.listen((html.MessageEvent event) {
      final dynamic rawData = event.data;
      if (rawData != null) {
        final dataStr = rawData.toString().trim();
        if (dataStr.isNotEmpty && !controller.isClosed) {
          controller.add(dataStr);
        }
      }
    }, onError: (err) {
      // Browser EventSource automatically attempts to reconnect on error
    });

    return controller.stream;
  } catch (e) {
    closePlatformSse();
    return null;
  }
}
