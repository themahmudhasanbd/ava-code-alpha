import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Flutter-side MethodChannel wrapper for the native Android agent foreground service.
///
/// Communicates with [MainActivity]'s MethodChannel handler to:
/// - Start / update / stop the native [AvaAgentForegroundService]
/// - Persist session-active state for boot recovery
/// - Retrieve the native debug log
/// - Listen for boot-restore callbacks from the native layer
///
/// On non-Android platforms all methods are no-ops.
class NativeAgentService {
  NativeAgentService._();
  static final NativeAgentService instance = NativeAgentService._();

  static const MethodChannel _channel =
      MethodChannel('com.avacode.mobile/agent_service');

  bool _initialized = false;

  /// Called when the device boots and a previous session needs to be restored.
  void Function(String sessionId)? onBootRestore;

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /// Register the method call handler for native → Flutter callbacks.
  /// Must be called once at app startup (from main.dart or push service init).
  void initialize() {
    if (_initialized) return;
    _initialized = true;

    _channel.setMethodCallHandler((call) async {
      switch (call.method) {
        case 'onBootRestore':
          final sessionId = call.arguments['sessionId']?.toString() ?? '';
          if (sessionId.isNotEmpty) {
            debugPrint('[NativeAgentService] Boot restore: session=$sessionId');
            onBootRestore?.call(sessionId);
          }
        default:
          debugPrint('[NativeAgentService] Unhandled native call: ${call.method}');
      }
    });

    debugPrint('[NativeAgentService] Initialized and listening for native callbacks.');
  }

  // ── Foreground Service Control ────────────────────────────────────────────

  /// Starts the native foreground service with an ongoing pinned notification.
  Future<void> startForegroundService({
    required String sessionId,
    required String modelName,
    required String currentAction,
    required DateTime startTime,
  }) async {
    if (!_isAndroid) return;
    try {
      await _channel.invokeMethod<bool>('startForegroundService', {
        'sessionId': sessionId,
        'modelName': modelName,
        'currentAction': currentAction,
        'startTimeMs': startTime.millisecondsSinceEpoch,
      });
      debugPrint('[NativeAgentService] startForegroundService: $sessionId');
    } catch (e) {
      debugPrint('[NativeAgentService] startForegroundService error: $e');
    }
  }

  /// Updates the notification body with the latest action/tool name.
  Future<void> updateForegroundService({
    required String currentAction,
    String? toolName,
  }) async {
    if (!_isAndroid) return;
    try {
      await _channel.invokeMethod<bool>('updateForegroundService', {
        'currentAction': currentAction,
        'toolName': toolName,
      });
    } catch (e) {
      debugPrint('[NativeAgentService] updateForegroundService error: $e');
    }
  }

  /// Stops the foreground service and dismisses the pinned notification.
  Future<void> stopForegroundService({
    required String sessionId,
    bool isSuccess = true,
  }) async {
    if (!_isAndroid) return;
    try {
      await _channel.invokeMethod<bool>('stopForegroundService', {
        'sessionId': sessionId,
        'isSuccess': isSuccess,
      });
      debugPrint('[NativeAgentService] stopForegroundService: $sessionId success=$isSuccess');
    } catch (e) {
      debugPrint('[NativeAgentService] stopForegroundService error: $e');
    }
  }

  // ── Session State Persistence (Boot Recovery) ─────────────────────────────

  /// Persists whether a session is currently active so AvaBootReceiver can
  /// auto-relaunch the app after a device reboot.
  Future<void> saveSessionActive(String sessionId, {required bool active}) async {
    if (!_isAndroid) return;
    try {
      // Also persist via SharedPreferences directly so native can read it
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('ava_session_was_active', active);
      if (active && sessionId.isNotEmpty) {
        await prefs.setString('ava_last_session_id', sessionId);
      }
      // Also inform native layer
      await _channel.invokeMethod<bool>('saveSessionActive', {
        'sessionId': sessionId,
        'active': active,
      });
    } catch (e) {
      debugPrint('[NativeAgentService] saveSessionActive error: $e');
    }
  }

  // ── Server URL Sync ───────────────────────────────────────────────────────

  /// Persists the server URL so native components (AvaNotificationDebugLogger)
  /// can POST error logs without needing Flutter runtime.
  Future<void> saveServerUrl(String url) async {
    if (!_isAndroid) return;
    try {
      await _channel.invokeMethod<bool>('saveServerUrl', {'url': url});
      debugPrint('[NativeAgentService] Server URL saved to native: $url');
    } catch (e) {
      debugPrint('[NativeAgentService] saveServerUrl error: $e');
    }
  }

  // ── Debug Log ─────────────────────────────────────────────────────────────

  /// Retrieves the full contents of the native ava_debug.log file.
  Future<String> getDebugLog() async {
    if (!_isAndroid) return '(Debug log only available on Android)';
    try {
      final log = await _channel.invokeMethod<String>('getDebugLog');
      return log ?? '(empty log)';
    } catch (e) {
      return 'Failed to read debug log: $e';
    }
  }

  /// Clears the native debug log file.
  Future<void> clearDebugLog() async {
    if (!_isAndroid) return;
    try {
      await _channel.invokeMethod<bool>('clearDebugLog');
    } catch (e) {
      debugPrint('[NativeAgentService] clearDebugLog error: $e');
    }
  }

  // ── Android Permissions & Background Optimization ──────────────────────────

  /// Checks system permissions (Notifications, Microphone, Battery Optimization).
  Future<Map<String, bool>> checkPermissions() async {
    if (!_isAndroid) {
      return {
        'notifications': true,
        'microphone': true,
        'batteryOptimizationIgnored': true,
      };
    }
    try {
      final res = await _channel.invokeMapMethod<String, dynamic>('checkPermissions');
      if (res != null) {
        return {
          'notifications': res['notifications'] == true,
          'microphone': res['microphone'] == true,
          'batteryOptimizationIgnored': res['batteryOptimizationIgnored'] == true,
        };
      }
    } catch (e) {
      debugPrint('[NativeAgentService] checkPermissions error: $e');
    }
    return {
      'notifications': false,
      'microphone': false,
      'batteryOptimizationIgnored': false,
    };
  }

  /// Proactively requests runtime permissions (Notifications, Audio/Microphone).
  Future<bool> requestPermissions() async {
    if (!_isAndroid) return true;
    try {
      final res = await _channel.invokeMapMethod<String, dynamic>('requestPermissions');
      return res?['granted'] == true;
    } catch (e) {
      debugPrint('[NativeAgentService] requestPermissions error: $e');
      return false;
    }
  }

  /// Prompts the system to exempt AvA Code from aggressive battery saving kills.
  Future<bool> requestIgnoreBatteryOptimizations() async {
    if (!_isAndroid) return true;
    try {
      final res = await _channel.invokeMethod<bool>('requestIgnoreBatteryOptimizations');
      return res == true;
    } catch (e) {
      debugPrint('[NativeAgentService] requestIgnoreBatteryOptimizations error: $e');
      return false;
    }
  }

  /// Opens the app system settings page for manual permission grant.
  Future<bool> openAppSettings() async {
    if (!_isAndroid) return false;
    try {
      final res = await _channel.invokeMethod<bool>('openAppSettings');
      return res == true;
    } catch (e) {
      debugPrint('[NativeAgentService] openAppSettings error: $e');
      return false;
    }
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  bool get _isAndroid => !kIsWeb && defaultTargetPlatform == TargetPlatform.android;
}
