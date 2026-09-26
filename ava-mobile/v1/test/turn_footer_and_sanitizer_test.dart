import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/models/app_models.dart';

void main() {
  group('User Prompt Sanitizer Tests', () {
    test('strips system_prompt and instructions tags cleanly', () {
      const raw = '<system_prompt>You are AvA...</system_prompt><instructions>Do task</instructions>Help me build a flutter widget';
      final clean = sanitizeUserDisplayText(raw);
      expect(clean, 'Help me build a flutter widget');
    });

    test('strips [Attached Files: ...] block from user bubble text', () {
      const raw = 'Check this code\n\n[Attached Files:\n- /var/www/ava-code/lib/main.dart\n- /var/www/ava-code/pubspec.yaml]';
      final clean = sanitizeUserDisplayText(raw);
      expect(clean, 'Check this code');
    });

    test('strips synthetic voice note system instructions', () {
      const raw = 'Please listen to the attached voice note audio input directly and assist the user with their request.';
      final clean = sanitizeUserDisplayText(raw);
      expect(clean, '');
    });

    test('strips synthetic attached files fallback header', () {
      const raw = 'Please inspect and process the following attached file(s):\n- /path/to/img.png';
      final clean = sanitizeUserDisplayText(raw);
      expect(clean, '');
    });
  });

  group('ChatMessageModel & Duration Tests', () {
    test('ChatMessageModel correctly stores attachments and execution status', () {
      final msg = ChatMessageModel(
        id: 'msg_1',
        sender: 'agent',
        text: 'Finished processing.',
        timestamp: '12:00 PM',
        parts: [
          MessagePartModel(
            id: 'p1',
            type: 'tool',
            tool: 'read_file',
            status: 'completed',
            durationMs: 1400,
          ),
          MessagePartModel(
            id: 'p2',
            type: 'text',
            text: 'Finished processing.',
            status: 'completed',
            durationMs: 600,
          ),
        ],
      );

      expect(msg.parts.length, 2);
      expect(msg.parts[0].durationMs, 1400);
      expect(msg.parts[1].durationMs, 600);
    });
  });
}
