import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../firebase_options.dart';
import 'agent_core_service.dart';
import 'native_agent_service.dart';

/// Top-level background message handler for Firebase Cloud Messaging.
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
  } catch (e) {
    debugPrint('[FCM Background Init Error] $e');
  }
  debugPrint('[FCM Background] Message received: ${message.messageId} - ${message.notification?.title}');
}

/// Represents the live state of an active agent turn for ongoing notifications and in-app banners.
class AgentTurnOngoingState {
  final String sessionId;
  final DateTime startTime;
  final String currentAction;
  final String? toolName;
  final String? modelName;
  final int elapsedSeconds;
  final bool isRunning;

  const AgentTurnOngoingState({
    required this.sessionId,
    required this.startTime,
    required this.currentAction,
    this.toolName,
    this.modelName,
    required this.elapsedSeconds,
    this.isRunning = true,
  });

  AgentTurnOngoingState copyWith({
    String? currentAction,
    String? toolName,
    int? elapsedSeconds,
    bool? isRunning,
  }) {
    return AgentTurnOngoingState(
      sessionId: sessionId,
      startTime: startTime,
      currentAction: currentAction ?? this.currentAction,
      toolName: toolName ?? this.toolName,
      modelName: modelName,
      elapsedSeconds: elapsedSeconds ?? this.elapsedSeconds,
      isRunning: isRunning ?? this.isRunning,
    );
  }
}

/// Singleton service managing Firebase Cloud Messaging, local push notifications,
/// and live ongoing execution notifications for AvA Code AI agent execution.
class PushNotificationService {
  PushNotificationService._();
  static final PushNotificationService instance = PushNotificationService._();

  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  static const String notificationChannelId = 'ava_agent_channel';
  static const String notificationChannelName = 'AvA Agent Execution';
  static const String notificationChannelDesc =
      'Notifications delivered when an AI agent completes a task or turn';

  static const String ongoingChannelId = 'ava_ongoing_turn_channel';
  static const String ongoingChannelName = 'AvA Live Agent Execution';
  static const String ongoingChannelDesc =
      'Ongoing notification displaying live reasoning, tool execution, and timer during agent turns';

  static const int ongoingNotificationId = 1001;

  bool _initialized = false;
  String? _fcmToken;
  String? get fcmToken => _fcmToken;
  bool get isInitialized => _initialized;
  AvaAgentCoreService? _agentService;
  String? _lastRegisteredUrl;

  bool _ongoingNotificationsEnabled = true;
  bool get ongoingNotificationsEnabled => _ongoingNotificationsEnabled;

  /// Callback when a user taps a notification leading to a session.
  void Function(String sessionId)? onSessionNotificationTapped;

  /// ValueNotifier holding the latest agent notification data for in-app UI.
  final ValueNotifier<Map<String, dynamic>?> latestNotificationNotifier =
      ValueNotifier<Map<String, dynamic>?>(null);

  /// ValueNotifier broadcasting the live ongoing agent execution turn state.
  final ValueNotifier<AgentTurnOngoingState?> ongoingTurnNotifier =
      ValueNotifier<AgentTurnOngoingState?>(null);

  Timer? _turnTickerTimer;
  DateTime? _currentTurnStartTime;
  String? _currentTurnSessionId;
  String? _currentTurnModelName;
  String _currentTurnAction = 'Initializing turn...';
  String? _currentTurnTool;
  DateTime? _lastNotificationUpdateTime;

  /// Initializes Firebase, FCM listeners, local notification channels, and settings.
  Future<void> initialize({AvaAgentCoreService? agentService}) async {
    if (agentService != null) {
      _agentService = agentService;
    }

    await _loadSavedPreferences();

    if (_initialized) {
      if (agentService != null && _fcmToken != null) {
        await syncTokenWithService(agentService);
      }
      return;
    }

    try {
      // 1. Initialize Firebase Core
      await Firebase.initializeApp(
        options: DefaultFirebaseOptions.currentPlatform,
      );
      _initialized = true;
      debugPrint('[PushNotificationService] Firebase initialized successfully.');

      // 2. Setup background messaging handler (non-web)
      if (!kIsWeb) {
        FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
      }

      // 3. Initialize Local Notifications Plugin (for foreground banner/heads-up on Android)
      await _initializeLocalNotifications();

      // 4. Request User Permission
      final messaging = FirebaseMessaging.instance;
      final settings = await messaging.requestPermission(
        alert: true,
        announcement: false,
        badge: true,
        carPlay: false,
        criticalAlert: false,
        provisional: false,
        sound: true,
      );
      debugPrint('[PushNotificationService] Permission status: ${settings.authorizationStatus}');

      // 5. Setup foreground presentation options
      await messaging.setForegroundNotificationPresentationOptions(
        alert: true,
        badge: true,
        sound: true,
      );

      // 6. Retrieve FCM Token
      try {
        _fcmToken = await messaging.getToken();
        debugPrint('[PushNotificationService] FCM Token: $_fcmToken');

        if (_fcmToken != null && _agentService != null) {
          await syncTokenWithService(_agentService!);
        }
      } catch (tokenErr) {
        debugPrint('[PushNotificationService] Failed to retrieve token: $tokenErr');
      }

      // 7. Listen for Token Refreshes
      messaging.onTokenRefresh.listen((newToken) {
        _fcmToken = newToken;
        _lastRegisteredUrl = null; // force re-registration
        debugPrint('[PushNotificationService] FCM Token Refreshed: $newToken');
        if (_agentService != null) {
          syncTokenWithService(_agentService!);
        }
      });

      // 8. Listen to Foreground FCM Messages
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        debugPrint('[PushNotificationService] Foreground message: ${message.notification?.title}');
        _handleIncomingMessage(message);
      });

      // 9. Handle Notification Clicks (When app opened from background/terminated)
      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
        debugPrint('[PushNotificationService] App opened from message: ${message.data}');
        _handleNotificationTap(message);
      });

      // Check if app was opened directly from a terminated state notification
      final initialMessage = await messaging.getInitialMessage();
      if (initialMessage != null) {
        debugPrint('[PushNotificationService] Initial message: ${initialMessage.data}');
        _handleNotificationTap(initialMessage);
      }
    } catch (e, st) {
      debugPrint('[PushNotificationService] Initialization error (continuing safely): $e\n$st');
    }
  }

  Future<void> _loadSavedPreferences() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _ongoingNotificationsEnabled = prefs.getBool('ava_ongoing_notifs_enabled') ?? true;
    } catch (e) { print('Ignored error: $e'); }
  }

  /// Toggles whether ongoing notification with live timer should be shown in system tray.
  Future<void> setOngoingNotificationsEnabled(bool enabled) async {
    _ongoingNotificationsEnabled = enabled;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('ava_ongoing_notifs_enabled', enabled);
    } catch (e) { print('Ignored error: $e'); }

    if (!enabled) {
      await cancelOngoingTurnNotification();
    } else if (ongoingTurnNotifier.value != null && ongoingTurnNotifier.value!.isRunning) {
      // Re-trigger ongoing notification if currently running
      await _showOrUpdateOngoingSystemNotification();
    }
  }

  /// Explicitly syncs / registers the device FCM token with the given AvA Agent Core Service.
  Future<bool> syncTokenWithService(AvaAgentCoreService agentService, {bool force = false}) async {
    _agentService = agentService;
    final token = _fcmToken;
    if (token == null || token.isEmpty) {
      try {
        _fcmToken = await FirebaseMessaging.instance.getToken();
      } catch (e) { print('Ignored error: $e'); }
    }

    final effectiveToken = _fcmToken;
    if (effectiveToken == null || effectiveToken.isEmpty) {
      debugPrint('[PushNotificationService] Cannot sync: no FCM token available.');
      return false;
    }

    final targetUrl = agentService.baseUrl;
    if (!force && _lastRegisteredUrl == targetUrl) {
      return true;
    }

    final platform = kIsWeb
        ? 'web'
        : (defaultTargetPlatform == TargetPlatform.android
            ? 'android'
            : 'ios');

    final success = await agentService.registerDeviceToken(effectiveToken, platform: platform);
    if (success) {
      _lastRegisteredUrl = targetUrl;
      debugPrint('[PushNotificationService] Successfully registered FCM token with $targetUrl');
    } else {
      debugPrint('[PushNotificationService] Failed to register FCM token with $targetUrl');
    }
    return success;
  }

  /// Sets up Android notification channels and local notification settings.
  Future<void> _initializeLocalNotifications() async {
    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    const darwinInit = DarwinInitializationSettings();
    const initSettings = InitializationSettings(
      android: androidInit,
      iOS: darwinInit,
      macOS: darwinInit,
    );

    await _localNotifications.initialize(
      settings: initSettings,
      onDidReceiveNotificationResponse: (NotificationResponse response) {
        final payload = response.payload;
        if (payload != null && payload.isNotEmpty) {
          onSessionNotificationTapped?.call(payload);
        }
      },
    );

    // Create high-importance Android channel for completions & test pushes
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      final androidPlugin = _localNotifications
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>();
      if (androidPlugin != null) {
        const channel = AndroidNotificationChannel(
          notificationChannelId,
          notificationChannelName,
          description: notificationChannelDesc,
          importance: Importance.max,
          enableVibration: true,
          playSound: true,
        );
        await androidPlugin.createNotificationChannel(channel);

        // Ongoing channel: silent, low importance so updates don't buzz
        const ongoingChannel = AndroidNotificationChannel(
          ongoingChannelId,
          ongoingChannelName,
          description: ongoingChannelDesc,
          importance: Importance.low,
          enableVibration: false,
          playSound: false,
          showBadge: false,
        );
        await androidPlugin.createNotificationChannel(ongoingChannel);
      }
    }
  }

  // ─── Ongoing Agent Turn Notification & Timer ──────────────────────────────

  /// Starts the ongoing execution notification and live timer ticker.
  Future<void> startOngoingTurnNotification({
    required String sessionId,
    String? initialPrompt,
    String? modelName,
  }) async {
    _currentTurnSessionId = sessionId;
    _currentTurnStartTime = DateTime.now();
    _currentTurnModelName = modelName ?? 'AvA Agent';
    _currentTurnAction = (initialPrompt != null && initialPrompt.trim().isNotEmpty)
        ? 'Processing prompt...'
        : 'Starting execution turn...';
    _currentTurnTool = null;

    ongoingTurnNotifier.value = AgentTurnOngoingState(
      sessionId: sessionId,
      startTime: _currentTurnStartTime!,
      currentAction: _currentTurnAction,
      modelName: _currentTurnModelName,
      elapsedSeconds: 0,
      isRunning: true,
    );

    _turnTickerTimer?.cancel();
    _turnTickerTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_currentTurnStartTime == null) return;
      final elapsed = DateTime.now().difference(_currentTurnStartTime!).inSeconds;
      final current = ongoingTurnNotifier.value;
      if (current != null) {
        ongoingTurnNotifier.value = current.copyWith(elapsedSeconds: elapsed);
      }
    });

    // Start native foreground service (keeps notification alive in background)
    unawaited(NativeAgentService.instance.startForegroundService(
      sessionId: sessionId,
      modelName: _currentTurnModelName ?? 'AvA Agent',
      currentAction: _currentTurnAction,
      startTime: _currentTurnStartTime!,
    ));
    unawaited(NativeAgentService.instance.saveSessionActive(sessionId, active: true));

    await _showOrUpdateOngoingSystemNotification();
  }

  /// Updates the ongoing turn notification with live loop events (e.g. reasoning, tool calls).
  Future<void> updateOngoingTurnNotification({
    required String currentAction,
    String? toolName,
  }) async {
    if (_currentTurnStartTime == null) return;
    _currentTurnAction = currentAction;
    _currentTurnTool = toolName;

    final current = ongoingTurnNotifier.value;
    if (current != null) {
      ongoingTurnNotifier.value = current.copyWith(
        currentAction: currentAction,
        toolName: toolName,
      );
    }

    // Update native foreground service notification
    unawaited(NativeAgentService.instance.updateForegroundService(
      currentAction: currentAction,
      toolName: toolName,
    ));

    // Throttle Flutter local notification updates to at most once per second
    final now = DateTime.now();
    if (_lastNotificationUpdateTime == null ||
        now.difference(_lastNotificationUpdateTime!).inMilliseconds >= 800) {
      _lastNotificationUpdateTime = now;
      await _showOrUpdateOngoingSystemNotification();
    }
  }

  /// Finishes the ongoing turn, cancels the ongoing notification, and triggers completion alert.
  Future<void> finishOngoingTurnNotification({
    required String sessionId,
    bool isSuccess = true,
    String? completionMessage,
  }) async {
    _turnTickerTimer?.cancel();
    _turnTickerTimer = null;
    final finishedSessionId = _currentTurnSessionId ?? sessionId;
    _currentTurnStartTime = null;
    _currentTurnSessionId = null;

    ongoingTurnNotifier.value = null;

    // Stop native foreground service
    unawaited(NativeAgentService.instance.stopForegroundService(
      sessionId: finishedSessionId,
      isSuccess: isSuccess,
    ));
    unawaited(NativeAgentService.instance.saveSessionActive(finishedSessionId, active: false));

    await cancelOngoingTurnNotification();

    // Show heads-up completion notification if enabled on mobile
    if (!kIsWeb) {
      final title = isSuccess ? 'AvA Agent Finished' : 'AvA Agent Error';
      final body = completionMessage ??
          (isSuccess ? 'Agent execution turn completed successfully.' : 'Agent encountered an error.');
      await showLocalNotification(
        title: title,
        body: body,
        payload: sessionId,
      );
    }
  }

  /// Cancels the ongoing system tray notification.
  Future<void> cancelOngoingTurnNotification() async {
    if (!kIsWeb) {
      try {
        await _localNotifications.cancel(id: ongoingNotificationId);
      } catch (e) { print('Ignored error: $e'); }
    }
  }

  Future<void> _showOrUpdateOngoingSystemNotification() async {
    if (kIsWeb || !_ongoingNotificationsEnabled || _currentTurnStartTime == null) return;

    try {
      final startMs = _currentTurnStartTime!.millisecondsSinceEpoch;
      final title = 'AvA Agent Running (${_currentTurnModelName ?? "Agent"})';
      final body = _currentTurnTool != null
          ? 'Executing: $_currentTurnTool\n$_currentTurnAction'
          : _currentTurnAction;

      final androidDetails = AndroidNotificationDetails(
        ongoingChannelId,
        ongoingChannelName,
        channelDescription: ongoingChannelDesc,
        importance: Importance.low,
        priority: Priority.low,
        ongoing: true,
        autoCancel: false,
        onlyAlertOnce: true,
        showWhen: true,
        when: startMs,
        usesChronometer: true, // Native Android live counting timer in notification shade!
        icon: '@drawable/ic_notification',
        category: AndroidNotificationCategory.progress,
        subText: 'Agent Loop Active',
        playSound: false,
        enableVibration: false,
      );

      final darwinDetails = DarwinNotificationDetails(
        presentAlert: false,
        presentBadge: true,
        presentSound: false,
      );

      final details = NotificationDetails(
        android: androidDetails,
        iOS: darwinDetails,
      );

      await _localNotifications.show(
        id: ongoingNotificationId,
        title: title,
        body: body,
        notificationDetails: details,
        payload: _currentTurnSessionId,
      );
    } catch (e) {
      debugPrint('[PushNotificationService] Ongoing notification error: $e');
    }
  }

  /// Processes incoming message: updates state notifier and displays local notification if in foreground.
  void _handleIncomingMessage(RemoteMessage message) {
    final title = message.notification?.title ?? message.data['title'] ?? 'AvA Agent Completed';
    final body = message.notification?.body ?? message.data['body'] ?? 'Agent execution turn finished.';
    final sessionId = message.data['sessionId'] ?? '';

    latestNotificationNotifier.value = {
      'title': title,
      'body': body,
      'sessionId': sessionId,
      'status': message.data['status'] ?? 'success',
      'timestamp': DateTime.now().millisecondsSinceEpoch,
    };

    if (!kIsWeb) {
      showLocalNotification(
        title: title,
        body: body,
        payload: sessionId,
      );
    }
  }

  /// Triggered when the user taps on a push notification.
  void _handleNotificationTap(RemoteMessage message) {
    final sessionId = message.data['sessionId']?.toString();
    if (sessionId != null && sessionId.isNotEmpty) {
      onSessionNotificationTapped?.call(sessionId);
    }
  }

  /// Manually display a local notification (e.g., test or execution finish).
  Future<void> showLocalNotification({
    required String title,
    required String body,
    String? payload,
  }) async {
    const androidDetails = AndroidNotificationDetails(
      notificationChannelId,
      notificationChannelName,
      channelDescription: notificationChannelDesc,
      icon: '@drawable/ic_notification',
      importance: Importance.max,
      priority: Priority.high,
      showWhen: true,
      enableVibration: true,
      playSound: true,
    );
    const darwinDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );
    const details = NotificationDetails(
      android: androidDetails,
      iOS: darwinDetails,
    );

    await _localNotifications.show(
      id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
      title: title,
      body: body,
      notificationDetails: details,
      payload: payload,
    );
  }
}

