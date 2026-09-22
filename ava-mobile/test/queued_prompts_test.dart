import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/models/app_models.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('QueuedPromptItem Model Tests', () {
    test('1. Creates item with proper default values and timestamp', () {
      final now = DateTime.now();
      final item = QueuedPromptItem(
        id: 'q1',
        promptText: 'Analyze git status',
        attachments: ['/var/www/test.dart'],
        queuedAt: now,
      );

      expect(item.id, equals('q1'));
      expect(item.promptText, equals('Analyze git status'));
      expect(item.attachments, equals(['/var/www/test.dart']));
      expect(item.queuedAt, equals(now));
      expect(item.userDisplayText, isNull);
    });

    test('2. Correctly serializes to JSON and deserializes from JSON', () {
      final now = DateTime.now();
      final item = QueuedPromptItem(
        id: 'q2',
        promptText: 'Build Flutter APK',
        attachments: ['a.dart', 'b.dart'],
        userDisplayText: 'Build APK',
        queuedAt: now,
      );

      final json = item.toJson();
      expect(json['id'], equals('q2'));
      expect(json['promptText'], equals('Build Flutter APK'));
      expect(json['attachments'], equals(['a.dart', 'b.dart']));
      expect(json['userDisplayText'], equals('Build APK'));
      expect(json['queuedAt'], isNotNull);

      final restored = QueuedPromptItem.fromJson(json);
      expect(restored.id, equals(item.id));
      expect(restored.promptText, equals(item.promptText));
      expect(restored.attachments, equals(item.attachments));
      expect(restored.userDisplayText, equals(item.userDisplayText));
      expect(restored.queuedAt.millisecondsSinceEpoch, equals(item.queuedAt.millisecondsSinceEpoch));
    });

    test('3. copyWith creates a modified clone properly', () {
      final item = QueuedPromptItem(
        id: 'q3',
        promptText: 'Original Text',
        attachments: ['old.dart'],
      );

      final updated = item.copyWith(
        promptText: 'Updated Text',
        attachments: ['new.dart'],
      );

      expect(updated.id, equals('q3'));
      expect(updated.promptText, equals('Updated Text'));
      expect(updated.attachments, equals(['new.dart']));
      expect(item.promptText, equals('Original Text'));
    });
  });

  group('Queued Prompts Queue Management Logic', () {
    test('4. Enqueues and drains items in FIFO order', () {
      final List<QueuedPromptItem> queue = [];

      // Add 3 prompts
      queue.add(QueuedPromptItem(id: '1', promptText: 'Task 1'));
      queue.add(QueuedPromptItem(id: '2', promptText: 'Task 2'));
      queue.add(QueuedPromptItem(id: '3', promptText: 'Task 3'));

      expect(queue.length, equals(3));
      expect(queue.first.promptText, equals('Task 1'));

      // Pop first item (FIFO)
      final popped = queue.removeAt(0);
      expect(popped.id, equals('1'));
      expect(queue.length, equals(2));
      expect(queue.first.promptText, equals('Task 2'));

      final secondPopped = queue.removeAt(0);
      expect(secondPopped.id, equals('2'));
      expect(queue.length, equals(1));
      expect(queue.first.promptText, equals('Task 3'));
    });

    test('5. Reordering queued items works accurately', () {
      final List<QueuedPromptItem> queue = [
        QueuedPromptItem(id: '1', promptText: 'Low priority 1'),
        QueuedPromptItem(id: '2', promptText: 'High priority 2'),
        QueuedPromptItem(id: '3', promptText: 'Normal priority 3'),
      ];

      // Move index 1 (High priority 2) to top (index 0)
      final oldIdx = 1;
      var newIdx = 0;
      if (oldIdx < newIdx) {
        newIdx -= 1;
      }
      final item = queue.removeAt(oldIdx);
      queue.insert(newIdx, item);

      expect(queue[0].id, equals('2'));
      expect(queue[1].id, equals('1'));
      expect(queue[2].id, equals('3'));
    });
  });

  group('Dynamic Send vs Stop Button Logic Tests', () {
    bool computeShowStopButton({
      required bool isSending,
      required bool hasPendingMessage,
      required String promptInput,
      required List<String> attachments,
    }) {
      final bool hasTypedContent = promptInput.trim().isNotEmpty || attachments.isNotEmpty;
      final bool hasActiveTurn = isSending || hasPendingMessage;
      return hasActiveTurn && !hasTypedContent;
    }

    test('6. Idle agent -> Stop button FALSE (shows Send)', () {
      final showStop = computeShowStopButton(
        isSending: false,
        hasPendingMessage: false,
        promptInput: '',
        attachments: [],
      );
      expect(showStop, isFalse);
    });

    test('7. Running agent + empty input -> Stop button TRUE (shows Stop)', () {
      final showStop = computeShowStopButton(
        isSending: true,
        hasPendingMessage: true,
        promptInput: '',
        attachments: [],
      );
      expect(showStop, isTrue);
    });

    test('8. Running agent + typed text -> Stop button FALSE (shows Send/Queue)', () {
      final showStop = computeShowStopButton(
        isSending: true,
        hasPendingMessage: true,
        promptInput: 'Next instruction to queue',
        attachments: [],
      );
      expect(showStop, isFalse);
    });

    test('9. Running agent + attached file -> Stop button FALSE (shows Send/Queue)', () {
      final showStop = computeShowStopButton(
        isSending: true,
        hasPendingMessage: true,
        promptInput: '',
        attachments: ['/var/www/file.dart'],
      );
      expect(showStop, isFalse);
    });
  });
}
