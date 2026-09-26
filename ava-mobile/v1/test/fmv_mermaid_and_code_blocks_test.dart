import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/models/app_models.dart';
import 'package:mobile/widgets/formatted_message_view.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Mermaid & Rich Code Blocks Rendering Tests', () {
    testWidgets('1. FormattedMessageView renders Mermaid flowchart diagram', (tester) async {
      const mermaidFlowchart = '''
```mermaid
graph TD
    A[Start Node] --> B{Decision}
    B -->|Yes| C[Approve]
    B -->|No| D[Reject]
```
''';

      final msg = ChatMessageModel(
        id: 'msg-mermaid-1',
        sender: 'assistant',
        text: mermaidFlowchart,
        timestamp: '12:00 PM',
      );

      await tester.binding.setSurfaceSize(const Size(390, 844));

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: FormattedMessageView(
                message: msg,
                isDark: true,
                cardBg: const Color(0xFF131A2B),
                borderColor: const Color(0xFF1E293B),
                textPrimary: Colors.white,
                textSecondary: Colors.white70,
              ),
            ),
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 250));

      expect(find.textContaining('FLOWCHART'), findsOneWidget);
      expect(find.text('Start Node'), findsOneWidget);
      expect(find.text('Decision'), findsOneWidget);
      expect(find.text('Approve'), findsOneWidget);
      expect(find.text('Reject'), findsOneWidget);
    });

    testWidgets('2. FormattedMessageView renders Mermaid pie chart diagram', (tester) async {
      const mermaidPie = '''
```mermaid
pie title Programming Languages
    "Dart" : 45
    "TypeScript" : 35
    "Python" : 20
```
''';

      final msg = ChatMessageModel(
        id: 'msg-mermaid-2',
        sender: 'assistant',
        text: mermaidPie,
        timestamp: '12:01 PM',
      );

      await tester.binding.setSurfaceSize(const Size(390, 844));

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: FormattedMessageView(
                message: msg,
                isDark: true,
                cardBg: const Color(0xFF131A2B),
                borderColor: const Color(0xFF1E293B),
                textPrimary: Colors.white,
                textSecondary: Colors.white70,
              ),
            ),
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 250));

      expect(find.textContaining('PIE'), findsOneWidget);
      expect(find.text('Dart'), findsOneWidget);
      expect(find.text('TypeScript'), findsOneWidget);
      expect(find.text('Python'), findsOneWidget);
    });

    testWidgets('3. FormattedMessageView renders Mermaid sequence diagram', (tester) async {
      const mermaidSequence = '''
```mermaid
sequenceDiagram
    participant User
    participant Agent
    User->>Agent: Send Request
    Agent-->>User: Streaming Response
```
''';

      final msg = ChatMessageModel(
        id: 'msg-mermaid-3',
        sender: 'assistant',
        text: mermaidSequence,
        timestamp: '12:02 PM',
      );

      await tester.binding.setSurfaceSize(const Size(390, 844));

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: FormattedMessageView(
                message: msg,
                isDark: true,
                cardBg: const Color(0xFF131A2B),
                borderColor: const Color(0xFF1E293B),
                textPrimary: Colors.white,
                textSecondary: Colors.white70,
              ),
            ),
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 250));

      expect(find.textContaining('SEQUENCE'), findsOneWidget);
      expect(find.text('Send Request'), findsOneWidget);
      expect(find.text('Streaming Response'), findsOneWidget);
    });

    testWidgets('4. FormattedMessageView renders diff code blocks with color styling', (tester) async {
      const diffContent = '''
```diff
@@ -1,4 +1,4 @@
-const oldVersion = "1.0.0";
+const newVersion = "2.0.0";
 const stable = true;
```
''';

      final msg = ChatMessageModel(
        id: 'msg-diff-1',
        sender: 'assistant',
        text: diffContent,
        timestamp: '12:03 PM',
      );

      await tester.binding.setSurfaceSize(const Size(390, 844));

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: FormattedMessageView(
                message: msg,
                isDark: true,
                cardBg: const Color(0xFF131A2B),
                borderColor: const Color(0xFF1E293B),
                textPrimary: Colors.white,
                textSecondary: Colors.white70,
              ),
            ),
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 250));

      expect(find.text('DIFF'), findsOneWidget);
      expect(find.textContaining('oldVersion'), findsOneWidget);
      expect(find.textContaining('newVersion'), findsOneWidget);
    });

    testWidgets('5. FormattedMessageView toggles Diagram to Raw Code view on Mermaid diagrams', (tester) async {
      const mermaidCode = '''
```mermaid
graph LR
    Client --> Server
```
''';

      final msg = ChatMessageModel(
        id: 'msg-mermaid-toggle',
        sender: 'assistant',
        text: mermaidCode,
        timestamp: '12:04 PM',
      );

      await tester.binding.setSurfaceSize(const Size(390, 844));

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: FormattedMessageView(
                message: msg,
                isDark: true,
                cardBg: const Color(0xFF131A2B),
                borderColor: const Color(0xFF1E293B),
                textPrimary: Colors.white,
                textSecondary: Colors.white70,
              ),
            ),
          ),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 250));

      // Tap Code toggle button
      final codeToggleFinder = find.text('Code');
      expect(codeToggleFinder, findsOneWidget);
      await tester.tap(codeToggleFinder);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 250));

      // Now should show Diagram toggle button and raw code
      expect(find.text('Diagram'), findsOneWidget);
      expect(find.textContaining('graph LR'), findsOneWidget);
    });
  });
}
