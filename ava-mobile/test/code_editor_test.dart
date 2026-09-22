import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:mobile/widgets/editor/code_editor_view.dart';
import 'package:mobile/screens/file_edit_screen.dart';
import 'package:mobile/services/agent_core_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  final mockCoreService = AvaAgentCoreService(
    baseUrl: 'http://127.0.0.1:4096',
    workspacePath: '/var/www/ava-code',
  );

  group('EditorLanguageInfo & CodeEditorTheme Tests', () {
    test('Correctly identifies language from file extension', () {
      expect(EditorLanguageInfo.fromExtension('dart').name, 'Dart');
      expect(EditorLanguageInfo.fromExtension('ts').name, 'TypeScript');
      expect(EditorLanguageInfo.fromExtension('json').name, 'JSON');
      expect(EditorLanguageInfo.fromExtension('py').name, 'Python');
      expect(EditorLanguageInfo.fromExtension('html').name, 'HTML');
      expect(EditorLanguageInfo.fromExtension('css').name, 'CSS');
      expect(EditorLanguageInfo.fromExtension('yaml').name, 'YAML');
      expect(EditorLanguageInfo.fromExtension('sh').name, 'Shell');
      expect(EditorLanguageInfo.fromExtension('sql').name, 'SQL');
      expect(EditorLanguageInfo.fromExtension('rs').name, 'Rust');
      expect(EditorLanguageInfo.fromExtension('go').name, 'Go');
    });

    test('Theme provides distinct dark and light color tokens', () {
      final darkTheme = CodeEditorTheme.dark();
      final lightTheme = CodeEditorTheme.light();

      expect(darkTheme.bg, const Color(0xFF1E1E2E));
      expect(lightTheme.bg, const Color(0xFFFFFFFF));
      expect(darkTheme.gutterBg, isNot(lightTheme.gutterBg));
    });
  });

  group('CodeEditorView Widget Tests', () {
    testWidgets('Renders breadcrumbs, line numbers gutter, and status bar', (tester) async {
      tester.view.physicalSize = const Size(800, 1000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      const sampleCode = 'void main() {\n  print("Hello AVA");\n}\n';

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CodeEditorView(
              fullPath: '/var/www/project/lib/main.dart',
              fileName: 'main.dart',
              initialContent: sampleCode,
              agentCoreService: mockCoreService,
              isDark: true,
              cardBg: const Color(0xFF181825),
              borderColor: const Color(0xFF313244),
              textPrimary: const Color(0xFFCDD6F4),
              textSecondary: const Color(0xFFA6ADC8),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Verify breadcrumbs
      expect(find.text('main.dart'), findsWidgets);
      expect(find.text('lib'), findsOneWidget);

      // Verify line numbers in gutter
      expect(find.text('1'), findsWidgets);
      expect(find.text('2'), findsWidgets);
      expect(find.text('3'), findsWidgets);

      // Verify Status Bar
      expect(find.text('Ln 1, Col 1'), findsOneWidget);
      expect(find.text('4 lines'), findsOneWidget);
      expect(find.text('Dart'), findsOneWidget);
      expect(find.text('UTF-8'), findsOneWidget);
      expect(find.text('Spaces: 2'), findsOneWidget);
    });

    testWidgets('Toggles search bar and adjusts font size', (tester) async {
      tester.view.physicalSize = const Size(800, 1000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      const sampleCode = 'const a = 10;\nconst b = 20;\n';

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CodeEditorView(
              fullPath: '/var/www/test.ts',
              fileName: 'test.ts',
              initialContent: sampleCode,
              agentCoreService: mockCoreService,
              isDark: true,
              cardBg: const Color(0xFF181825),
              borderColor: const Color(0xFF313244),
              textPrimary: const Color(0xFFCDD6F4),
              textSecondary: const Color(0xFFA6ADC8),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Find icon to open search
      final searchButton = find.byIcon(LucideIcons.search);
      expect(searchButton, findsOneWidget);
      await tester.tap(searchButton);
      await tester.pumpAndSettle();

      // Search field should be visible
      expect(find.text('Find in file...'), findsOneWidget);

      // Font size buttons
      final fontIncrease = find.text('A+');
      expect(fontIncrease, findsOneWidget);
      await tester.tap(fontIncrease);
      await tester.pumpAndSettle();
    });

    testWidgets('Renders on mobile viewport (390px) without overflow', (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      const sampleCode = 'function calculate() {\n  return 42;\n}\n';

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CodeEditorView(
              fullPath: '/var/www/src/index.js',
              fileName: 'index.js',
              initialContent: sampleCode,
              agentCoreService: mockCoreService,
              isDark: false,
              cardBg: Colors.white,
              borderColor: const Color(0xFFE2E8F0),
              textPrimary: const Color(0xFF24292F),
              textSecondary: const Color(0xFF57606A),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(tester.takeException(), isNull);
      expect(find.text('index.js'), findsWidgets);
      expect(find.text('JavaScript'), findsOneWidget);
    });
  });

  group('FileEditScreen Tests', () {
    testWidgets('Mounts standalone FileEditScreen cleanly', (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(
        MaterialApp(
          home: FileEditScreen(
            fullPath: '/var/www/app/index.html',
            fileName: 'index.html',
            initialContent: '<!DOCTYPE html>\n<html>\n<body><h1>Hello</h1></body>\n</html>',
            agentCoreService: mockCoreService,
            isDark: true,
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(tester.takeException(), isNull);
      expect(find.text('index.html'), findsWidgets);
      expect(find.text('HTML'), findsWidgets);
    });
  });
}
