import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/models/app_models.dart';

List<ChatMessageModel> mergeMessagesPreservingLocalOrder(
  List<ChatMessageModel> existing,
  List<ChatMessageModel> incoming, {
  String? currentlyStreamingPendingId,
}) {
  if (incoming.isEmpty) return existing;
  if (existing.isEmpty) return incoming;

  final cleanExisting = existing.where((m) => m.id != 'loading-hist').toList();
  if (cleanExisting.isEmpty) return incoming;

  final List<ChatMessageModel> incomingMerged = List<ChatMessageModel>.from(incoming);

  // 1. Enrich incoming with local metadata
  for (int i = 0; i < incomingMerged.length; i++) {
    final inc = incomingMerged[i];
    final matchIdx = cleanExisting.indexWhere((e) =>
        e.id == inc.id ||
        (e.sender == inc.sender && inc.text.trim().isNotEmpty && e.text.trim() == inc.text.trim()));
    if (matchIdx != -1) {
      final local = cleanExisting[matchIdx];
      incomingMerged[i] = inc.copyWith(
        timelineEvents: inc.timelineEvents.isNotEmpty ? inc.timelineEvents : local.timelineEvents,
        questionData: inc.questionData ?? local.questionData,
        permissionData: inc.permissionData ?? local.permissionData,
        reasoningText: (inc.reasoningText != null && inc.reasoningText!.isNotEmpty) ? inc.reasoningText : local.reasoningText,
      );
    }
  }

  // 2. Build aligned sequence starting from cleanExisting order
  final List<ChatMessageModel> result = [];
  int incomingCursor = 0;

  for (int i = 0; i < cleanExisting.length; i++) {
    final local = cleanExisting[i];
    final incIdx = incomingMerged.indexWhere((inc) =>
        inc.id == local.id ||
        (inc.sender == local.sender && inc.text.trim().isNotEmpty && inc.text.trim() == local.text.trim()));

    if (incIdx != -1) {
      // Add any earlier incoming server items that came before this matched item
      while (incomingCursor < incIdx) {
        if (!result.any((m) => m.id == incomingMerged[incomingCursor].id)) {
          result.add(incomingMerged[incomingCursor]);
        }
        incomingCursor++;
      }
      result.add(incomingMerged[incIdx]);
      incomingCursor = incIdx + 1;
    } else {
      // Keep local unmatched message (e.g. failed prompts, local error turns, or un-synced user messages)
      result.add(local);
    }
  }

  // Add any trailing incoming messages from server
  while (incomingCursor < incomingMerged.length) {
    if (!result.any((m) => m.id == incomingMerged[incomingCursor].id)) {
      result.add(incomingMerged[incomingCursor]);
    }
    incomingCursor++;
  }

  // 3. Preserve active pending agent turn if actively streaming right now
  if (currentlyStreamingPendingId != null) {
    final activePendingAgent = cleanExisting.where((m) =>
        m.id == currentlyStreamingPendingId && m.isPending && !result.any((inc) => inc.id == m.id)
    ).toList();

    for (final pAgent in activePendingAgent) {
      result.add(pAgent);
    }
  }

  return ChatMessageModel.coalesceList(result);
}

void main() {
  group('Timeline Ordering & Error Preservation Tests', () {
    test('1. Sending a failed prompt followed by a new prompt maintains proper chronological order in coalescing', () {
      final t1 = DateTime.now().subtract(const Duration(minutes: 5));
      final t2 = DateTime.now().subtract(const Duration(minutes: 1));

      final failedUserMsg = ChatMessageModel(
        id: t1.millisecondsSinceEpoch.toString(),
        sender: 'user',
        text: 'Prompt that will fail',
        timestamp: t1.toIso8601String(),
        deliveryStatus: 'failed',
        isError: true,
        errorMessage: 'Network error',
      );

      final failedAgentMsg = ChatMessageModel(
        id: (t1.millisecondsSinceEpoch + 1).toString(),
        sender: 'agent',
        text: 'Failed to communicate with agent server.',
        timestamp: t1.toIso8601String(),
        isPending: false,
        isError: true,
        errorMessage: 'Network error',
      );

      final newUserMsg = ChatMessageModel(
        id: t2.millisecondsSinceEpoch.toString(),
        sender: 'user',
        text: 'New successful prompt',
        timestamp: t2.toIso8601String(),
        deliveryStatus: 'sent',
      );

      final newAgentMsg = ChatMessageModel(
        id: (t2.millisecondsSinceEpoch + 1).toString(),
        sender: 'agent',
        text: 'Hello, I handled your second prompt!',
        timestamp: t2.toIso8601String(),
        isPending: false,
      );

      final list = [failedUserMsg, failedAgentMsg, newUserMsg, newAgentMsg];
      final coalesced = ChatMessageModel.coalesceList(list);

      expect(coalesced.length, 4);
      expect(coalesced[0].text, 'Prompt that will fail');
      expect(coalesced[1].text, 'Failed to communicate with agent server.');
      expect(coalesced[2].text, 'New successful prompt');
      expect(coalesced[3].text, 'Hello, I handled your second prompt!');
    });

    test('2. Ordered alignment preserves failed local prompt before newly returned server turn', () {
      final t1 = DateTime.now().subtract(const Duration(minutes: 5));
      final t2 = DateTime.now().subtract(const Duration(minutes: 1));

      final failedUserMsg = ChatMessageModel(
        id: t1.millisecondsSinceEpoch.toString(),
        sender: 'user',
        text: 'Prompt that failed offline',
        timestamp: t1.toIso8601String(),
        deliveryStatus: 'failed',
        isError: true,
        errorMessage: 'Network timeout',
      );

      final failedAgentMsg = ChatMessageModel(
        id: (t1.millisecondsSinceEpoch + 1).toString(),
        sender: 'agent',
        text: 'Network timeout occurred.',
        timestamp: t1.toIso8601String(),
        isPending: false,
        isError: true,
        errorMessage: 'Network timeout',
      );

      final newUserMsg = ChatMessageModel(
        id: t2.millisecondsSinceEpoch.toString(),
        sender: 'user',
        text: 'Prompt that succeeded',
        timestamp: t2.toIso8601String(),
        deliveryStatus: 'sent',
      );

      final newAgentMsg = ChatMessageModel(
        id: (t2.millisecondsSinceEpoch + 1).toString(),
        sender: 'agent',
        text: 'Result of prompt that succeeded',
        timestamp: t2.toIso8601String(),
        isPending: false,
      );

      final serverIncoming = [
        ChatMessageModel(
          id: 'server_user_${t2.millisecondsSinceEpoch}',
          sender: 'user',
          text: 'Prompt that succeeded',
          timestamp: t2.toIso8601String(),
          isHistory: true,
        ),
        ChatMessageModel(
          id: 'server_agent_${t2.millisecondsSinceEpoch}',
          sender: 'agent',
          text: 'Result of prompt that succeeded',
          timestamp: t2.toIso8601String(),
          isHistory: true,
        ),
      ];

      final localExisting = [failedUserMsg, failedAgentMsg, newUserMsg, newAgentMsg];

      final merged = mergeMessagesPreservingLocalOrder(localExisting, serverIncoming);

      expect(merged.length, 4);
      expect(merged[0].text, 'Prompt that failed offline');
      expect(merged[0].isError, isTrue);
      expect(merged[0].deliveryStatus, 'failed');
      expect(merged[1].text, 'Network timeout occurred.');
      expect(merged[1].isError, isTrue);
      expect(merged[2].text, 'Prompt that succeeded');
      expect(merged[3].text, 'Result of prompt that succeeded');
    });
  });
}
