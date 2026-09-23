import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/models/app_models.dart';
import 'package:mobile/widgets/header_bar.dart';
import 'package:mobile/widgets/chat/modals/model_reasoning_modal.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  final List<AvaModelItem> dummyModels = [
    const AvaModelItem(
      id: 'claude-3-7-sonnet',
      name: 'Claude 3.7 Sonnet',
      provider: 'anthropic',
      contextLimit: 200000,
    ),
    const AvaModelItem(
      id: 'gpt-4o',
      name: 'GPT-4o',
      provider: 'openai',
      contextLimit: 128000,
    ),
    const AvaModelItem(
      id: 'omniroute/coding-combo',
      name: 'Ultra Coding Combo',
      provider: 'omniroute',
      contextLimit: 128000,
    ),
  ];

  group('HeaderBar Session Title & Workspace Modal Trigger Tests', () {
    testWidgets('HeaderBar displays active session title cleanly', (WidgetTester tester) async {
      bool workspaceOpened = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            appBar: HeaderBar(
              isDark: true,
              cardBg: const Color(0xFF141418),
              borderColor: const Color(0xFF27272A),
              textPrimary: Colors.white,
              textSecondary: Colors.white70,
              activeSessionTitle: 'Refactor Payment Gateway',
              isCoreConnected: true,
              onOpenDrawer: () {},
              onOpenWorkspacePreferences: () {
                workspaceOpened = true;
              },
            ),
          ),
        ),
      );

      expect(find.text('Refactor Payment Gateway'), findsOneWidget);
      // Tap on the session title pill
      await tester.tap(find.text('Refactor Payment Gateway'));
      await tester.pumpAndSettle();

      expect(workspaceOpened, isTrue);
    });

    testWidgets('HeaderBar shows fallback session id or New Session when title is empty', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            appBar: HeaderBar(
              isDark: true,
              cardBg: const Color(0xFF141418),
              borderColor: const Color(0xFF27272A),
              textPrimary: Colors.white,
              textSecondary: Colors.white70,
              activeSessionId: 'sess_123456789abc',
              isCoreConnected: true,
              onOpenDrawer: () {},
            ),
          ),
        ),
      );

      expect(find.text('Session sess_123'), findsOneWidget);
    });
  });

  group('ModelReasoningModal Tests', () {
    testWidgets('ModelReasoningModal mounts and allows searching & selecting models', (WidgetTester tester) async {
      AvaModelItem? selectedModel;
      String? selectedEffort;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () {
                  ModelReasoningModal.show(
                    context,
                    currentModel: dummyModels.first,
                    availableModels: dummyModels,
                    currentReasoningEffort: 'medium',
                    isDark: true,
                    cardBg: const Color(0xFF141418),
                    borderColor: const Color(0xFF27272A),
                    textPrimary: Colors.white,
                    textSecondary: Colors.white70,
                    onSelectModel: (m) => selectedModel = m,
                    onSelectReasoningEffort: (e) => selectedEffort = e,
                  );
                },
                child: const Text('Open Modal'),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Open Modal'));
      await tester.pumpAndSettle();

      expect(find.text('Model & Reasoning'), findsOneWidget);
      expect(find.text('Claude 3.7 Sonnet'), findsOneWidget);
      expect(find.text('GPT-4o'), findsOneWidget);
      expect(find.text('Ultra Coding Combo'), findsOneWidget);

      // Search for GPT
      final searchField = find.byType(TextField);
      expect(searchField, findsOneWidget);
      await tester.enterText(searchField, 'GPT');
      await tester.pumpAndSettle();

      expect(find.text('GPT-4o'), findsOneWidget);
      expect(find.text('Claude 3.7 Sonnet'), findsNothing);

      // Tap GPT-4o
      await tester.tap(find.text('GPT-4o'));
      await tester.pumpAndSettle();

      expect(selectedModel?.id, 'gpt-4o');

      // Drain toast timer
      await tester.pump(const Duration(seconds: 4));
    });

    testWidgets('ModelReasoningModal allows selecting reasoning effort level', (WidgetTester tester) async {
      String? selectedEffort;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () {
                  ModelReasoningModal.show(
                    context,
                    currentModel: dummyModels.first,
                    availableModels: dummyModels,
                    currentReasoningEffort: 'low',
                    isDark: true,
                    cardBg: const Color(0xFF141418),
                    borderColor: const Color(0xFF27272A),
                    textPrimary: Colors.white,
                    textSecondary: Colors.white70,
                    onSelectReasoningEffort: (e) => selectedEffort = e,
                  );
                },
                child: const Text('Open Modal'),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Open Modal'));
      await tester.pumpAndSettle();

      // Switch to Reasoning Effort tab
      await tester.tap(find.byType(Tab).last);
      await tester.pumpAndSettle();

      expect(find.text('Extra High'), findsOneWidget);
      expect(find.text('High'), findsOneWidget);

      // Tap Extra High
      await tester.tap(find.text('Extra High'));
      await tester.pumpAndSettle();

      expect(selectedEffort, 'xhigh');

      // Drain toast timer
      await tester.pump(const Duration(seconds: 4));
    });
  });
}
