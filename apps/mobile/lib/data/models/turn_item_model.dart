enum TurnItemType {
  userPrompt,
  agentMessage,
  reasoning,
  commandExecution,
  fileChange,
  mcpToolCall,
  error,
}

enum ItemStatus {
  inProgress,
  completed,
  failed,
}

/// Represents an item in a turn (message, tool call, reasoning thought, command, or file diff)
class TurnItemModel {
  final String id;
  final TurnItemType type;
  final String title;
  final String content;
  final String? secondaryContent; // e.g. diff or thought delta
  final ItemStatus status;
  final DateTime timestamp;

  TurnItemModel({
    required this.id,
    required this.type,
    required this.title,
    required this.content,
    this.secondaryContent,
    this.status = ItemStatus.completed,
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now();

  TurnItemModel copyWith({
    String? id,
    TurnItemType? type,
    String? title,
    String? content,
    String? secondaryContent,
    ItemStatus? status,
    DateTime? timestamp,
  }) {
    return TurnItemModel(
      id: id ?? this.id,
      type: type ?? this.type,
      title: title ?? this.title,
      content: content ?? this.content,
      secondaryContent: secondaryContent ?? this.secondaryContent,
      status: status ?? this.status,
      timestamp: timestamp ?? this.timestamp,
    );
  }
}
