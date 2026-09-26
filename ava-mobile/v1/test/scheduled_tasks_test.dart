import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/screens/scheduled_tasks_screen.dart';
import 'package:mobile/services/agent_core_service.dart';

class MockScheduledTasksAgentCoreService extends AvaAgentCoreService {
  final List<Map<String, dynamic>> tasksData;
  final Map<String, dynamic> settingsData;
  bool runTaskCalled = false;
  bool toggleTaskCalled = false;
  bool deleteTaskCalled = false;

  MockScheduledTasksAgentCoreService({
    required this.tasksData,
    required this.settingsData,
  }) : super(baseUrl: 'http://127.0.0.1:4096', workspacePath: '/var/www/ava-code');

  @override
  Future<List<Map<String, dynamic>>> fetchScheduledTasks() async {
    return List<Map<String, dynamic>>.from(tasksData);
  }

  @override
  Future<Map<String, dynamic>> fetchSchedulerSettings() async {
    return Map<String, dynamic>.from(settingsData);
  }

  @override
  Future<bool> runScheduledTaskNow(String id) async {
    runTaskCalled = true;
    return true;
  }

  @override
  Future<Map<String, dynamic>?> toggleScheduledTask(String id, [bool? enabled]) async {
    toggleTaskCalled = true;
    final match = tasksData.firstWhere((t) => t['id'] == id);
    final copy = Map<String, dynamic>.from(match);
    copy['enabled'] = enabled ?? !(copy['enabled'] as bool);
    return copy;
  }

  @override
  Future<bool> deleteScheduledTask(String id) async {
    deleteTaskCalled = true;
    tasksData.removeWhere((t) => t['id'] == id);
    return true;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const isDark = true;
  const cardBg = Color(0xFF161622);
  const borderColor = Color(0xFF262638);
  const textPrimary = Color(0xFFF1F5F9);
  const textSecondary = Color(0xFF94A3B8);

  final mockTasks = [
    {
      'id': 'task_101',
      'name': 'Hourly Code Health Check',
      'prompt': 'Run linter and check for syntax errors',
      'targetType': 'agent_prompt',
      'agent': 'build',
      'sandboxMode': 'WORKSPACE_WRITE',
      'scheduleType': 'interval',
      'scheduleValue': {'amount': 1, 'unit': 'hours'},
      'enabled': true,
      'workspacePath': '/var/www/ava-code',
      'lastRun': '2026-09-12T04:00:00.000Z',
      'lastStatus': 'success',
      'lastSessionId': 'ses_scheduled_101',
      'nextRun': '2026-09-12T05:00:00.000Z',
      'runCount': 3,
      'history': [
        {
          'timestamp': '2026-09-12T04:00:00.000Z',
          'status': 'success',
          'durationMs': 120,
          'output': 'Session created (ses_scheduled_101) and prompt dispatched.',
          'sessionId': 'ses_scheduled_101',
        },
      ],
    },
    {
      'id': 'task_102',
      'name': 'Daily Backup Script',
      'prompt': 'tar -czf backup.tar.gz /var/www',
      'targetType': 'shell_command',
      'agent': 'build',
      'sandboxMode': 'WORKSPACE_WRITE',
      'scheduleType': 'daily',
      'scheduleValue': {'hour': 2, 'minute': 30},
      'enabled': false,
      'workspacePath': '/var/www/ava-code',
      'lastRun': null,
      'lastStatus': null,
      'lastSessionId': null,
      'nextRun': '2026-09-13T02:30:00.000Z',
      'runCount': 0,
      'history': [],
    },
  ];

  final mockSettings = {
    'schedulerEnabled': true,
    'checkIntervalSeconds': 30,
    'maxConcurrentTasks': 3,
    'defaultAgent': 'build',
    'defaultSandboxMode': 'WORKSPACE_WRITE',
    'globalPushNotifications': true,
    'autoPruneHistoryDays': 30,
  };

  late MockScheduledTasksAgentCoreService coreService;

  setUp(() {
    coreService = MockScheduledTasksAgentCoreService(
      tasksData: List<Map<String, dynamic>>.from(mockTasks),
      settingsData: Map<String, dynamic>.from(mockSettings),
    );
  });

  group('ScheduledTasksScreen Widget & Flow Tests', () {
    testWidgets('1. Loads and renders scheduled tasks cleanly on mobile viewport (390px)', (tester) async {
      tester.view.physicalSize = const Size(390 * 3, 844 * 3);
      tester.view.devicePixelRatio = 3.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        MaterialApp(
          home: ScheduledTasksScreen(
            isDark: isDark,
            cardBg: cardBg,
            borderColor: borderColor,
            textPrimary: textPrimary,
            textSecondary: textSecondary,
            agentCoreService: coreService,
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Scheduled Sessions'), findsOneWidget);
      expect(find.text('ACTIVE'), findsOneWidget);

      expect(find.text('Hourly Code Health Check'), findsOneWidget);
      expect(find.text('Daily Backup Script'), findsOneWidget);

      expect(find.text('AI Session'), findsOneWidget);
      expect(find.text('Shell Script'), findsOneWidget);
      expect(find.text('Every 1 hours'), findsOneWidget);
      expect(find.text('Daily at 02:30'), findsOneWidget);

      expect(find.text('Session'), findsOneWidget);
      expect(find.text('Run Now'), findsWidgets);
    });

    testWidgets('2. Clicking Session button triggers onSelectSession callback', (tester) async {
      tester.view.physicalSize = const Size(390 * 3, 844 * 3);
      tester.view.devicePixelRatio = 3.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      Map<String, dynamic>? selectedSession;

      await tester.pumpWidget(
        MaterialApp(
          home: ScheduledTasksScreen(
            isDark: isDark,
            cardBg: cardBg,
            borderColor: borderColor,
            textPrimary: textPrimary,
            textSecondary: textSecondary,
            agentCoreService: coreService,
            onSelectSession: (s) {
              selectedSession = s;
            },
          ),
        ),
      );

      await tester.pumpAndSettle();

      final sessionBtn = find.text('Session');
      expect(sessionBtn, findsOneWidget);

      await tester.tap(sessionBtn);
      await tester.pump(const Duration(milliseconds: 500));
      await tester.pump(const Duration(seconds: 4));
      await tester.pumpAndSettle();

      expect(selectedSession, isNotNull);
      expect(selectedSession?['id'], equals('ses_scheduled_101'));
    });

    testWidgets('3. Clicking Run Now triggers task execution endpoint', (tester) async {
      tester.view.physicalSize = const Size(390 * 3, 844 * 3);
      tester.view.devicePixelRatio = 3.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        MaterialApp(
          home: ScheduledTasksScreen(
            isDark: isDark,
            cardBg: cardBg,
            borderColor: borderColor,
            textPrimary: textPrimary,
            textSecondary: textSecondary,
            agentCoreService: coreService,
          ),
        ),
      );

      await tester.pumpAndSettle();

      final runNowBtn = find.text('Run Now').first;
      await tester.tap(runNowBtn);
      await tester.pump(const Duration(milliseconds: 500));
      await tester.pump(const Duration(seconds: 4));
      await tester.pumpAndSettle();

      expect(coreService.runTaskCalled, isTrue);
    });
  });
}
