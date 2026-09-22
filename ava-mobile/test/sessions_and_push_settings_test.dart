import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:mobile/models/app_models.dart';
import 'package:mobile/screens/sessions_screen.dart';
import 'package:mobile/screens/settings_screen.dart';
import 'package:mobile/services/agent_core_service.dart';
import 'package:mobile/widgets/drawer_navigation.dart';

class MockFullAgentCoreService extends AvaAgentCoreService {
  final List<Map<String, dynamic>> sessionsList;
  final Map<String, dynamic> settingsMap;
  final Map<String, dynamic> fcmStatusMap;
  final Map<String, dynamic> schedulerSettingsMap;
  bool testPushCalled = false;
  bool updateSchedulerCalled = false;

  MockFullAgentCoreService({
    required this.sessionsList,
    required this.settingsMap,
    required this.fcmStatusMap,
    required this.schedulerSettingsMap,
  }) : super(baseUrl: 'http://127.0.0.1:4096', workspacePath: '/var/www/ava-code');

  @override
  Future<List<Map<String, dynamic>>> fetchSessions({
    bool all = true,
    int limit = 200,
    String? directory,
    String? activeSessionId,
    String? cursor,
  }) async {
    return List<Map<String, dynamic>>.from(sessionsList);
  }

  @override
  Future<List<Map<String, dynamic>>> loadSessionsListFromCache() async {
    return List<Map<String, dynamic>>.from(sessionsList);
  }

  @override
  Future<Map<String, dynamic>?> fetchSettings() async {
    return Map<String, dynamic>.from(settingsMap);
  }

  @override
  Future<Map<String, dynamic>> fetchFcmStatus() async {
    return Map<String, dynamic>.from(fcmStatusMap);
  }

  @override
  Future<Map<String, dynamic>> fetchSchedulerSettings() async {
    return Map<String, dynamic>.from(schedulerSettingsMap);
  }

  @override
  Future<bool> updateSchedulerSettings(Map<String, dynamic> settings) async {
    updateSchedulerCalled = true;
    return true;
  }

  @override
  Future<Map<String, dynamic>> sendTestPushNotification() async {
    testPushCalled = true;
    return {
      'status': 'ok',
      'message': 'Test notification successfully dispatched to registered device(s)!',
    };
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const isDark = true;
  const cardBg = Color(0xFF161622);
  const borderColor = Color(0xFF262638);
  const textPrimary = Color(0xFFF1F5F9);
  const textSecondary = Color(0xFF94A3B8);

  final mockSessions = [
    {
      'id': 'ses_scheduled_01',
      'title': '[Scheduled] Daily Health Check',
      'directory': '/var/www/ava-code',
      'agent': 'build',
      'time': {'updated': 1789187433710, 'created': 1789187433710},
      'metadata': {
        'isScheduled': true,
        'scheduledTaskId': 'task_101',
        'scheduledTaskName': 'Daily Health Check',
      },
      'model': {'id': 'gemini-2.5-flash', 'providerID': 'google'},
    },
    {
      'id': 'ses_normal_02',
      'title': 'Feature Refactoring',
      'directory': '/var/www/thundernexus-dev',
      'agent': 'build',
      'time': {'updated': 1789187400000, 'created': 1789187400000},
      'model': {'id': 'claude-3-5-sonnet', 'providerID': 'anthropic'},
    },
  ];

  final mockFcmStatus = {
    'configured': true,
    'projectId': 'ava-code',
    'hasCredentials': true,
    'registeredDevices': 2,
    'authError': null,
  };

  final mockSchedSettings = {
    'schedulerEnabled': true,
    'globalPushNotifications': true,
    'checkIntervalSeconds': 30,
  };

  late MockFullAgentCoreService coreService;

  setUp(() {
    coreService = MockFullAgentCoreService(
      sessionsList: List<Map<String, dynamic>>.from(mockSessions),
      settingsMap: {
        'model': 'anthropic/claude-3-5-sonnet',
        'permission': {'edit': 'allow', 'bash': 'allow'},
      },
      fcmStatusMap: Map<String, dynamic>.from(mockFcmStatus),
      schedulerSettingsMap: Map<String, dynamic>.from(mockSchedSettings),
    );
  });

  group('SessionsScreen Cross-Workspace & Scheduled Tests', () {
    testWidgets('1. SessionsScreen loads sessions across workspaces and displays filter chips', (tester) async {
      tester.view.physicalSize = const Size(390 * 3, 844 * 3);
      tester.view.devicePixelRatio = 3.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SessionsScreen(
              cardBg: cardBg,
              borderColor: borderColor,
              textPrimary: textPrimary,
              textSecondary: textSecondary,
              agentCoreService: coreService,
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Sessions Explorer'), findsOneWidget);
      expect(find.text('2 sessions available across workspaces'), findsOneWidget);

      expect(find.text('All Workspaces'), findsOneWidget);
      expect(find.text('Scheduled'), findsOneWidget);
      expect(find.text('ava-code'), findsWidgets);
      expect(find.text('thundernexus-dev'), findsWidgets);

      expect(find.text('SCHEDULED'), findsOneWidget);
      expect(find.byIcon(LucideIcons.clock), findsWidgets);

      await tester.tap(find.text('Scheduled'));
      await tester.pumpAndSettle();

      expect(find.text('[Scheduled] Daily Health Check'), findsOneWidget);
      expect(find.text('Feature Refactoring'), findsNothing);
    });

    testWidgets('2. DrawerNavigation displays clock icon for scheduled sessions', (tester) async {
      tester.view.physicalSize = const Size(390 * 3, 844 * 3);
      tester.view.devicePixelRatio = 3.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            drawer: DrawerNavigation(
              isDark: isDark,
              cardBg: cardBg,
              borderColor: borderColor,
              textPrimary: textPrimary,
              textSecondary: textSecondary,
              selectedNavIndex: 0,
              onSelectNav: (_) {},
              vpsWorkspacePath: '/var/www/ava-code',
              onSelectWorkspacePath: (_) {},
              agentCoreService: coreService,
            ),
            body: const Center(child: Text('Home')),
          ),
        ),
      );

      final scaffoldState = tester.state<ScaffoldState>(find.byType(Scaffold));
      scaffoldState.openDrawer();
      await tester.pumpAndSettle();

      await tester.tap(find.text('Sessions'));
      await tester.pumpAndSettle();

      expect(find.byIcon(LucideIcons.clock), findsWidgets);
      expect(find.text('[Scheduled] Daily Health Check'), findsOneWidget);
    });
  });

  group('SettingsScreen Push Notification Settings Tests', () {
    testWidgets('3. SettingsScreen renders push notification controls & test button', (tester) async {
      tester.view.physicalSize = const Size(390 * 3, 844 * 3);
      tester.view.devicePixelRatio = 3.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SettingsScreen(
              isDark: isDark,
              cardBg: cardBg,
              borderColor: borderColor,
              textPrimary: textPrimary,
              textSecondary: textSecondary,
              serverUrl: 'http://127.0.0.1:4096',
              onUpdateServerUrl: (_) {},
              vpsWorkspacePath: '/var/www/ava-code',
              onUpdateWorkspacePath: (_) {},
              agentCoreService: coreService,
              availableModels: const [
                AvaModelItem(id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'anthropic'),
              ],
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      final pushHeader = find.text('PUSH NOTIFICATIONS (FIREBASE FCM)');
      await tester.scrollUntilVisible(
        pushHeader,
        300,
        scrollable: find.byType(Scrollable).first,
      );
      expect(pushHeader, findsOneWidget);

      expect(find.text('Master Push Notifications'), findsOneWidget);
      expect(find.text('Scheduled Task Alerts'), findsOneWidget);
      expect(find.text('Agent Turn Completion'), findsOneWidget);

      final testBtn = find.text('Send Test Push Notification');
      expect(testBtn, findsOneWidget);

      await tester.tap(testBtn);
      await tester.pump(const Duration(milliseconds: 500));
      await tester.pump(const Duration(seconds: 4));
      await tester.pumpAndSettle();

      expect(coreService.testPushCalled, isTrue);
    });
  });
}
