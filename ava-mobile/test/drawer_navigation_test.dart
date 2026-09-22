import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mobile/widgets/drawer_navigation.dart';
import 'package:mobile/services/agent_core_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('DrawerNavigation Widget Tests', () {
    setUp(() {
      SharedPreferences.setMockInitialValues({});
    });

    testWidgets('DrawerNavigation mounts cleanly on 390px mobile viewport without overflow', (WidgetTester tester) async {
      final agentCoreService = AvaAgentCoreService(
        baseUrl: 'http://127.0.0.1:4096',
        workspacePath: '/root',
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
            drawer: DrawerNavigation(
              isDark: true,
              cardBg: const Color(0xFF18181B),
              borderColor: const Color(0xFF27272A),
              textPrimary: Colors.white,
              textSecondary: const Color(0xFFA1A1AA),
              selectedNavIndex: 0,
              onSelectNav: (_) {},
              vpsWorkspacePath: '/root',
              onSelectWorkspacePath: (_) {},
              agentCoreService: agentCoreService,
            ),
            body: const Center(child: Text('Main Body')),
          ),
        ),
      );

      // Open Drawer
      final ScaffoldState state = tester.firstState(find.byType(Scaffold));
      state.openDrawer();
      await tester.pumpAndSettle();

      // Verify Navigation tab items
      expect(find.text('Navigation'), findsOneWidget);
      expect(find.text('Sessions'), findsOneWidget);
      expect(find.text('Agent Chat'), findsOneWidget);
      expect(find.text('Workspace Preferences & Hub'), findsOneWidget);
      expect(find.text('File Explorer'), findsOneWidget);

      // Switch to Sessions tab
      await tester.tap(find.text('Sessions'));
      await tester.pumpAndSettle();

      // Verify New Session button
      expect(find.text('New Session'), findsOneWidget);

      agentCoreService.dispose();
      await tester.pumpWidget(Container());
    });
  });
}
