import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:mobile/widgets/workspace_file_explorer.dart';
import 'package:mobile/services/agent_core_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('WorkspaceFileExplorerWidget & Multi-Select Tests', () {
    testWidgets('WorkspaceFileExplorerWidget mounts cleanly on 390px mobile viewport', (WidgetTester tester) async {
      final agentCoreService = AvaAgentCoreService(
        baseUrl: 'http://127.0.0.1:4096',
        workspacePath: '/var/www/ava-code',
      );

      tester.view.physicalSize = const Size(390 * 3, 844 * 3);
      tester.view.devicePixelRatio = 3.0;

      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: WorkspaceFileExplorerWidget(
              isDark: true,
              cardBg: const Color(0xFF18181B),
              borderColor: const Color(0xFF27272A),
              textPrimary: Colors.white,
              textSecondary: const Color(0xFFA1A1AA),
              agentCoreService: agentCoreService,
              vpsWorkspacePath: '/var/www/ava-code',
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Verify explorer breadcrumb bar and action buttons
      expect(find.byIcon(LucideIcons.arrowUp), findsOneWidget);
      expect(find.byIcon(LucideIcons.filePlus2), findsWidgets);
      expect(find.byIcon(LucideIcons.folderPlus), findsWidgets);

      agentCoreService.dispose();
      await tester.pumpWidget(Container());
    });
  });
}
