import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/screens/media_screen.dart';
import 'package:mobile/services/agent_core_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('MediaScreen & MediaItem Tests', () {
    test('MediaItem correctly identifies media types by extension', () {
      final img = MediaItem(name: 'hero.png', relativePath: 'hero.png', fullPath: '/root/hero.png', extension: 'png', size: '2.5 MB');
      expect(img.isImage, isTrue);
      expect(img.isVideo, isFalse);
      expect(img.isAudio, isFalse);
      expect(img.isVector, isFalse);
      expect(img.isArchive, isFalse);
      expect(img.isDocument, isFalse);
      expect(img.sizeInBytes, 2.5 * 1024 * 1024);

      final svg = MediaItem(name: 'logo.svg', relativePath: 'logo.svg', fullPath: '/root/logo.svg', extension: 'svg', size: '12 KB');
      expect(svg.isVector, isTrue);
      expect(svg.sizeInBytes, 12 * 1024);

      final vid = MediaItem(name: 'demo.mp4', relativePath: 'demo.mp4', fullPath: '/root/demo.mp4', extension: 'mp4', size: '15.2 MB');
      expect(vid.isVideo, isTrue);

      final aud = MediaItem(name: 'podcast.mp3', relativePath: 'podcast.mp3', fullPath: '/root/podcast.mp3', extension: 'mp3', size: '5 MB');
      expect(aud.isAudio, isTrue);

      final zip = MediaItem(name: 'bundle.zip', relativePath: 'bundle.zip', fullPath: '/root/bundle.zip', extension: 'zip', size: '50 MB');
      expect(zip.isArchive, isTrue);

      final doc = MediaItem(name: 'report.pdf', relativePath: 'report.pdf', fullPath: '/root/report.pdf', extension: 'pdf', size: '1.1 MB');
      expect(doc.isDocument, isTrue);

      final txt = MediaItem(name: 'notes.txt', relativePath: 'notes.txt', fullPath: '/root/notes.txt', extension: 'txt', size: '2 KB');
      expect(txt.isDocument, isTrue);
      expect(txt.isImage, isFalse);
      expect(txt.isVideo, isFalse);

      final code = MediaItem(name: 'main.dart', relativePath: 'main.dart', fullPath: '/root/main.dart', extension: 'dart', size: '4 KB');
      expect(code.isImage, isFalse);
      expect(code.isVideo, isFalse);
    });

    testWidgets('MediaScreen mounts and renders responsive layout without overflow on 390px mobile viewport', (WidgetTester tester) async {
      final agentCoreService = AvaAgentCoreService(
        baseUrl: 'http://127.0.0.1:4096',
        workspacePath: '/var/www/ava-code',
      );

      // Simulate a standard 390px mobile screen (e.g. iPhone 14/15/16)
      tester.view.physicalSize = const Size(390 * 3, 844 * 3);
      tester.view.devicePixelRatio = 3.0;

      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: MediaScreen(
              isDark: true,
              cardBg: const Color(0xFF18181B),
              borderColor: const Color(0xFF27272A),
              textPrimary: Colors.white,
              textSecondary: const Color(0xFFA1A1AA),
              agentCoreService: agentCoreService,
              vpsWorkspacePath: '/root/shared-media',
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Verify Header Elements
      expect(find.text('Media Library'), findsOneWidget);
      expect(find.text('shared-media'), findsOneWidget);
      expect(find.text('Upload'), findsOneWidget);

      // Verify Category Filter Chips
      expect(find.text('All'), findsOneWidget);
      expect(find.text('Images'), findsOneWidget);
      expect(find.text('Vectors'), findsOneWidget);
      expect(find.text('Videos'), findsOneWidget);
      expect(find.text('Audio'), findsOneWidget);
      expect(find.text('Archives'), findsOneWidget);
      expect(find.text('Docs'), findsOneWidget);

      agentCoreService.dispose();
      await tester.pumpWidget(Container());
    });

    test('FileDownloadHelper generates correct URL and handles single and multi files', () {
      final agentCoreService = AvaAgentCoreService(
        baseUrl: 'http://127.0.0.1:4096',
        workspacePath: '/var/www/ava-code',
      );

      final rawUrl = agentCoreService.getRawFileUrl('/var/www/ava-code/test.png');
      expect(rawUrl, contains('/api/workspace/raw'));
      expect(rawUrl, contains('path=%2Fvar%2Fwww%2Fava-code%2Ftest.png'));

      agentCoreService.dispose();
    });
  });
}
