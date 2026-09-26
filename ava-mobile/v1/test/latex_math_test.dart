import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_math_fork/flutter_math.dart';
import 'package:mobile/widgets/formatted_message_view.dart';
import 'package:mobile/models/app_models.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('LaTeX Math Rendering in FormattedMessageView', () {
    testWidgets('Renders inline math equation without throwing or going blank', (WidgetTester tester) async {
      final msg = ChatMessageModel(
        id: 'msg-math-inline-1',
        text: r'The loss function is defined as $L(\theta) = \frac{1}{N}\sum_{i=1}^N (y_i - \hat{y}_i)^2$ where $\theta$ is optimized.',
        sender: 'assistant',
        timestamp: DateTime.now().toIso8601String(),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: FormattedMessageView(
              message: msg,
              isDark: true,
              cardBg: const Color(0xFF141926),
              borderColor: const Color(0xFF272F45),
              textPrimary: Colors.white,
              textSecondary: Colors.grey,
            ),
          ),
        ),
      );

      await tester.pump(const Duration(milliseconds: 100));
      expect(find.byType(Math), findsWidgets);
    });

    testWidgets('Renders block math equations with \$\$ block syntax', (WidgetTester tester) async {
      final msg = ChatMessageModel(
        id: 'msg-math-block-1',
        text: "Here is the equation:\n\n\$\$\nE = mc^2\n\$\$\n\nFollowed by more content.",
        sender: 'assistant',
        timestamp: DateTime.now().toIso8601String(),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: FormattedMessageView(
              message: msg,
              isDark: true,
              cardBg: const Color(0xFF141926),
              borderColor: const Color(0xFF272F45),
              textPrimary: Colors.white,
              textSecondary: Colors.grey,
            ),
          ),
        ),
      );

      await tester.pump(const Duration(milliseconds: 100));
      expect(find.byType(Math), findsWidgets);
    });
  });
}
