import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mobile/models/app_models.dart';
import 'package:mobile/services/agent_core_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('ChatMessageModel.coalesceList Tests', () {
    test('1. Preserves single user and single agent message intact', () {
      final input = [
        ChatMessageModel(id: 'u1', sender: 'user', text: 'Hello', timestamp: '12:00'),
        ChatMessageModel(id: 'a1', sender: 'agent', text: 'Hi there!', timestamp: '12:00'),
      ];

      final result = ChatMessageModel.coalesceList(input);
      expect(result.length, equals(2));
      expect(result[0].sender, equals('user'));
      expect(result[0].text, equals('Hello'));
      expect(result[1].sender, equals('agent'));
      expect(result[1].text, equals('Hi there!'));
    });

    test('2. Merges multiple assistant parts/messages into a single agent turn', () {
      final input = [
        ChatMessageModel(id: 'u1', sender: 'user', text: 'Create a file', timestamp: '12:00'),
        ChatMessageModel(
          id: 'a1',
          sender: 'agent',
          text: '',
          timestamp: '12:00',
          parts: [
            MessagePartModel(id: 'p1', type: 'tool', tool: 'write_file', status: 'completed'),
          ],
          timelineEvents: [
            AgentTimelineEvent(id: 'ev1', type: 'tool_use', title: 'write_file: main.dart'),
          ],
        ),
        ChatMessageModel(
          id: 'a2',
          sender: 'agent',
          text: 'I created main.dart successfully.',
          timestamp: '12:01',
          parts: [
            MessagePartModel(id: 'p2', type: 'text', text: 'I created main.dart successfully.'),
          ],
        ),
      ];

      final result = ChatMessageModel.coalesceList(input);
      expect(result.length, equals(2));
      expect(result[0].sender, equals('user'));
      expect(result[1].sender, equals('agent'));
      expect(result[1].parts.length, equals(2));
      expect(result[1].timelineEvents.length, equals(1));
      expect(result[1].text, equals('I created main.dart successfully.'));
    });

    test('3. Absorbs synthetic user messages and command results into the agent turn', () {
      final input = [
        ChatMessageModel(id: 'u1', sender: 'user', text: 'Run the test suite', timestamp: '12:00'),
        ChatMessageModel(
          id: 'a1',
          sender: 'agent',
          text: '',
          timestamp: '12:00',
          parts: [
            MessagePartModel(id: 'p1', type: 'tool', tool: 'run_command', status: 'running'),
          ],
        ),
        ChatMessageModel(
          id: 'u_synth',
          sender: 'user',
          text: '<command_result exit_code=0>All 10 tests passed</command_result>',
          timestamp: '12:00',
          isSynthetic: true,
        ),
        ChatMessageModel(
          id: 'a2',
          sender: 'agent',
          text: 'Tests finished with 0 errors.',
          timestamp: '12:01',
          parts: [
            MessagePartModel(id: 'p1', type: 'tool', tool: 'run_command', status: 'completed', output: 'All 10 tests passed'),
            MessagePartModel(id: 'p2', type: 'text', text: 'Tests finished with 0 errors.'),
          ],
        ),
      ];

      final result = ChatMessageModel.coalesceList(input);
      expect(result.length, equals(2));
      expect(result[0].sender, equals('user'));
      expect(result[0].text, equals('Run the test suite'));
      expect(result[1].sender, equals('agent'));
      expect(result[1].text, equals('Tests finished with 0 errors.'));
      expect(result[1].parts.length, equals(2));
      expect(result[1].parts[0].status, equals('completed'));
      expect(result[1].parts[0].output, equals('All 10 tests passed'));
    });

    test('4. Deduplicates overlapping text and progressive reasoning without stutter', () {
      final input = [
        ChatMessageModel(id: 'u1', sender: 'user', text: 'Analyze this', timestamp: '12:00'),
        ChatMessageModel(
          id: 'a1',
          sender: 'agent',
          text: 'Thinking through the solution...',
          reasoningText: 'Analyzing code structure...',
          timestamp: '12:00',
        ),
        ChatMessageModel(
          id: 'a2',
          sender: 'agent',
          text: 'Thinking through the solution...\n\nHere is the full solution.',
          reasoningText: 'Analyzing code structure...\nIdentified 2 bugs.',
          timestamp: '12:01',
        ),
      ];

      final result = ChatMessageModel.coalesceList(input);
      expect(result.length, equals(2));
      expect(result[1].text, equals('Thinking through the solution...\n\nHere is the full solution.'));
      expect(result[1].reasoningText, equals('Analyzing code structure...\nIdentified 2 bugs.'));
    });

    test('5. Accurately handles multi-turn conversations and compaction messages', () {
      final input = [
        ChatMessageModel(id: 'u1', sender: 'user', text: 'Turn 1 prompt', timestamp: '12:00'),
        ChatMessageModel(id: 'a1', sender: 'agent', text: 'Turn 1 answer', timestamp: '12:00'),
        ChatMessageModel(
          id: 'comp1',
          sender: 'agent',
          text: '## Objective\nRefactor auth\n\n## Work State\nCompleted\n\n## Next Move\nReady',
          timestamp: '12:05',
          isCompaction: true,
        ),
        ChatMessageModel(id: 'u2', sender: 'user', text: 'Turn 2 prompt', timestamp: '12:06'),
        ChatMessageModel(id: 'a2_part1', sender: 'agent', text: '', timestamp: '12:06', parts: [
          MessagePartModel(id: 'tool_1', type: 'tool', tool: 'check_db'),
        ]),
        ChatMessageModel(id: 'a2_part2', sender: 'agent', text: 'Turn 2 final answer', timestamp: '12:07'),
      ];

      final result = ChatMessageModel.coalesceList(input);
      expect(result.length, equals(5));
      expect(result[0].text, equals('Turn 1 prompt'));
      expect(result[1].text, equals('Turn 1 answer'));
      expect(result[2].isCompactionMessage, isTrue);
      expect(result[3].text, equals('Turn 2 prompt'));
      expect(result[4].text, equals('Turn 2 final answer'));
      expect(result[4].parts.length, equals(1));
    });

    test('6. Cache save and load cycle preserves coalesced single-turn messages', () async {
      SharedPreferences.setMockInitialValues({});
      final service = AvaAgentCoreService(
        baseUrl: 'http://127.0.0.1:4096',
        workspacePath: '/var/www/ava-code',
      );

      final fragmented = [
        ChatMessageModel(id: 'u1', sender: 'user', text: 'Do task', timestamp: '12:00'),
        ChatMessageModel(id: 'a1', sender: 'agent', text: '', timestamp: '12:00', parts: [
          MessagePartModel(id: 'p1', type: 'tool', tool: 'build'),
        ]),
        ChatMessageModel(id: 'a2', sender: 'agent', text: 'Done with build.', timestamp: '12:01'),
      ];

      await service.saveSessionMessagesToCache('test_sess_1', fragmented);
      final restored = await service.loadSessionMessagesFromCache('test_sess_1');

      expect(restored.length, equals(2));
      expect(restored[0].sender, equals('user'));
      expect(restored[1].sender, equals('agent'));
     expect(restored[1].text, equals('Done with build.'));
     expect(restored[1].parts.length, equals(1));
   });

    test('7. Multi-turn conversation keeps distinct turns separated and user delivery status sent', () {
      final turns = [
        ChatMessageModel(id: 'u1', sender: 'user', text: 'First turn prompt', timestamp: '12:00', deliveryStatus: 'sent'),
        ChatMessageModel(id: 'a1', sender: 'agent', text: 'First turn answer', timestamp: '12:00', isPending: false),
        ChatMessageModel(id: 'u2', sender: 'user', text: 'hello kono file update koiro nah', timestamp: '12:05', deliveryStatus: 'sent'),
        ChatMessageModel(id: 'a2', sender: 'agent', text: 'Understood, no files modified.', timestamp: '12:06', isPending: false),
      ];

      final result = ChatMessageModel.coalesceList(turns);
      expect(result.length, equals(4));
      expect(result[0].text, equals('First turn prompt'));
      expect(result[1].text, equals('First turn answer'));
      expect(result[2].text, equals('hello kono file update koiro nah'));
      expect(result[2].deliveryStatus, equals('sent'));
      expect(result[3].text, equals('Understood, no files modified.'));
    });

    test('8. Consecutive distinct completed agent turns are not mixed into one', () {
      final turns = [
        ChatMessageModel(id: 'a1', sender: 'agent', text: 'First standalone turn', timestamp: '12:00', isPending: false),
        ChatMessageModel(id: 'a2', sender: 'agent', text: 'Second standalone turn', timestamp: '12:05', isPending: false),
      ];

      final result = ChatMessageModel.coalesceList(turns);
      expect(result.length, equals(2));
      expect(result[0].text, equals('First standalone turn'));
      expect(result[1].text, equals('Second standalone turn'));
    });
  });
}
