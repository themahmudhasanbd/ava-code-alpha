import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/models/app_models.dart';
import 'package:mobile/widgets/formatted_message_view.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('FMV Image Preview & Multi-Image Gallery Tests', () {
    test('resolveImageUrl correctly resolves different URL schemas', () {
      const baseUrl = 'http://127.0.0.1:4096';

      // 1. Remote HTTP/HTTPS URL
      expect(
        resolveImageUrl('https://example.com/mockup.png', baseUrl),
        'https://example.com/mockup.png',
      );
      expect(
        resolveImageUrl('http://example.com/photo.jpg', baseUrl),
        'http://example.com/photo.jpg',
      );

      // 2. Base64 Data URL
      expect(
        resolveImageUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==', baseUrl),
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==',
      );

      // 3. Absolute VPS File Path
      expect(
        resolveImageUrl('/var/www/ava-code/assets/logo.png', baseUrl),
        'http://127.0.0.1:4096/api/workspace/raw?path=%2Fvar%2Fwww%2Fava-code%2Fassets%2Flogo.png',
      );

      // 4. file:// URI
      expect(
        resolveImageUrl('file:///root/mockup.webp', baseUrl),
        'http://127.0.0.1:4096/api/workspace/raw?path=%2Froot%2Fmockup.webp',
      );

      // 5. Existing raw API path
      expect(
        resolveImageUrl('/api/workspace/raw?path=%2Froot%2Fimg.png', baseUrl),
        'http://127.0.0.1:4096/api/workspace/raw?path=%2Froot%2Fimg.png',
      );
    });

    test('MessageImageData correctly extracts filename and extension', () {
      const item1 = MessageImageData(
        urlOrPath: '/var/www/ava-code/assets/hero_banner.png',
        alt: 'Hero Banner',
        prompt: 'Futuristic AI workspace',
        aspectRatio: '16:9',
      );
      expect(item1.fileName, 'hero_banner.png');
      expect(item1.fileExtension, 'png');

      const item2 = MessageImageData(
        urlOrPath: 'https://cdn.example.com/assets/dark_mode_preview.WEBP?version=2',
      );
      expect(item2.fileName, 'dark_mode_preview.WEBP');
      expect(item2.fileExtension, 'webp');
    });

    testWidgets('FormattedMessageView renders single Markdown Image correctly', (tester) async {
      final msg = ChatMessageModel(
        id: 'msg-1',
        sender: 'assistant',
        text: 'Here is the generated design:\n\n![Dashboard Mockup](https://example.com/dashboard.png)',
        timestamp: '10:00 AM',
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: FormattedMessageView(
              message: msg,
              isDark: true,
              cardBg: const Color(0xFF1E293B),
              borderColor: const Color(0xFF334155),
              textPrimary: Colors.white,
              textSecondary: Colors.grey,
              baseUrl: 'http://127.0.0.1:4096',
            ),
          ),
        ),
      );

      await tester.pump();

      // Verify Image Gallery widget is present
      expect(find.byType(MessageImageGallery), findsOneWidget);
      expect(find.text('Dashboard Mockup'), findsOneWidget);
      expect(find.text('Zoom'), findsOneWidget);
    });

    testWidgets('FormattedMessageView renders Multi-Image Carousel from Markdown', (tester) async {
      final msg = ChatMessageModel(
        id: 'msg-2',
        sender: 'assistant',
        text: '''Here are the alternative banner designs:
```carousel
![Slide 1](https://example.com/banner1.png)
<!-- slide -->
![Slide 2](https://example.com/banner2.png)
<!-- slide -->
![Slide 3](https://example.com/banner3.png)
```''',
        timestamp: '10:02 AM',
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: FormattedMessageView(
              message: msg,
              isDark: true,
              cardBg: const Color(0xFF1E293B),
              borderColor: const Color(0xFF334155),
              textPrimary: Colors.white,
              textSecondary: Colors.grey,
              baseUrl: 'http://127.0.0.1:4096',
            ),
          ),
        ),
      );

      await tester.pump();

      // Verify multi-image gallery is rendered with carousel header & count
      expect(find.byType(MessageImageGallery), findsOneWidget);
      expect(find.text('IMAGE GALLERY'), findsOneWidget);
      expect(find.text('1 / 3'), findsOneWidget);
      expect(find.text('Swipe to browse'), findsOneWidget);
    });

    testWidgets('FormattedMessageView renders generate_image tool card with direct image preview', (tester) async {
      final msg = ChatMessageModel(
        id: 'msg-3',
        sender: 'assistant',
        text: '',
        parts: [
          MessagePartModel(
            id: 'part-img-1',
            type: 'tool',
            tool: 'generate_image',
            status: 'completed',
            input: {
              'Prompt': 'Vibrant holographic neon city skyline at dusk',
              'ImageName': 'neon_city_skyline',
              'AspectRatio': '16:9',
            },
            output: 'Image saved to /root/workspace/neon_city_skyline.png',
            timestamp: DateTime.now(),
          ),
        ],
        timestamp: '10:05 AM',
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: FormattedMessageView(
              message: msg,
              isDark: true,
              cardBg: const Color(0xFF1E293B),
              borderColor: const Color(0xFF334155),
              textPrimary: Colors.white,
              textSecondary: Colors.grey,
              baseUrl: 'http://127.0.0.1:4096',
            ),
          ),
        ),
      );

      await tester.pump();

      // Verify Image tool card renders with prompt and direct image preview
      expect(find.text('GENERATE_IMAGE'), findsOneWidget);
      expect(find.text('16:9'), findsWidgets);
      expect(find.text('Vibrant holographic neon city skyline at dusk'), findsOneWidget);
      expect(find.byType(MessageImageGallery), findsOneWidget);
    });

    testWidgets('FormattedMessageView renders multi-image tool card when multiple ImagePaths are returned', (tester) async {
      final msg = ChatMessageModel(
        id: 'msg-4',
        sender: 'assistant',
        text: '',
        parts: [
          MessagePartModel(
            id: 'part-img-2',
            type: 'tool',
            tool: 'edit_image',
            status: 'completed',
            input: {
              'Prompt': 'Color variants for hero button',
              'ImagePaths': [
                '/root/workspace/button_blue.png',
                '/root/workspace/button_purple.png',
                '/root/workspace/button_emerald.png',
              ],
            },
            output: 'Processed 3 images successfully.',
            timestamp: DateTime.now(),
          ),
        ],
        timestamp: '10:07 AM',
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: FormattedMessageView(
              message: msg,
              isDark: true,
              cardBg: const Color(0xFF1E293B),
              borderColor: const Color(0xFF334155),
              textPrimary: Colors.white,
              textSecondary: Colors.grey,
              baseUrl: 'http://127.0.0.1:4096',
            ),
          ),
        ),
      );

      await tester.pump();

      // Verify tool card with 3 images renders horizontal scrollable gallery
      expect(find.text('EDIT_IMAGE'), findsOneWidget);
      expect(find.text('IMAGE GALLERY'), findsOneWidget);
      expect(find.text('1 / 3'), findsOneWidget);
      expect(find.text('Swipe to browse'), findsOneWidget);
    });
  });
}
