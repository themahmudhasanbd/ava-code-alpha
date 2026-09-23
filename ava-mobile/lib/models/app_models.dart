import 'package:flutter/material.dart';

// ─── Connection Status to Native AvA Core Engine ───────────────────────────
enum CoreConnectionStatus {
  connected,
  connecting,
  reconnecting,
  syncing,
  disconnected,
}


/// Strips synthetic system prompts, instructions, and raw attachment blocks from user bubble text.
String sanitizeUserDisplayText(String rawText) {
  if (rawText.isEmpty) return '';
  String clean = rawText;

  // 1. Remove XML/HTML system wrappers
  clean = clean.replaceAll(RegExp(r'<system_prompt>[\s\S]*?<\/system_prompt>', caseSensitive: false), '');
  clean = clean.replaceAll(RegExp(r'<instructions>[\s\S]*?<\/instructions>', caseSensitive: false), '');
  clean = clean.replaceAll(RegExp(r'<context>[\s\S]*?<\/context>', caseSensitive: false), '');
  clean = clean.replaceAll(RegExp(r'<environment_context>[\s\S]*?<\/environment_context>', caseSensitive: false), '');

  // 2. Remove [Attached Files: ...] or [Other Attached Files: ...]
  clean = clean.replaceAll(RegExp(r'\[(?:Other\s+)?Attached Files:[\s\S]*?\]', caseSensitive: false), '');

  // 3. Remove [Git Context: ...]
  clean = clean.replaceAll(RegExp(r'\[Git Context:[\s\S]*?\]', caseSensitive: false), '');

  // 4. Remove synthetic fallback instructions
  clean = clean.replaceAll(RegExp(r'Please inspect and process the following attached file\(s\):[\s\S]*?(?=(\n\n|$))', caseSensitive: false), '');
  clean = clean.replaceAll(RegExp(r'Please listen to the attached voice note audio input directly and assist the user with their request\.?', caseSensitive: false), '');
  clean = clean.replaceAll(RegExp(r'\[User sent a voice (?:message|note):[\s\S]*?\]', caseSensitive: false), '');
  clean = clean.replaceAll(RegExp(r'\[Voice Note[\s\S]*?\]', caseSensitive: false), '');

  return clean.trim();
}

// ─── Individual Message Part Model (Sequential Chronological Node) ──────────
class MessagePartModel {
  final String id;
  final String? messageId;
  final String? turnId;
  final String? callId;
  final String type; // 'reasoning' | 'tool' | 'text' | 'step'
  final String text;
  final String? tool;
  final String? status; // 'running' | 'completed' | 'failed'
  final dynamic input;
  final String? output;
  final Map<String, dynamic>? metadata;
  final String? summary;
  final bool synthetic;
  final int? durationMs;
  final DateTime timestamp;

  MessagePartModel({
    required this.id,
    this.messageId,
    this.turnId,
    this.callId,
    required this.type,
    this.text = '',
    this.tool,
    this.status,
    this.input,
    this.output,
    this.metadata,
    this.summary,
    this.synthetic = false,
    this.durationMs,
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now();

  MessagePartModel copyWith({
    String? id,
    String? messageId,
    String? turnId,
    String? callId,
    String? type,
    String? text,
    String? tool,
    String? status,
    dynamic input,
    String? output,
    Map<String, dynamic>? metadata,
    String? summary,
    bool? synthetic,
    int? durationMs,
    DateTime? timestamp,
  }) {
    return MessagePartModel(
      id: id ?? this.id,
      messageId: messageId ?? this.messageId,
      turnId: turnId ?? this.turnId,
      callId: callId ?? this.callId,
      type: type ?? this.type,
      text: text ?? this.text,
      tool: tool ?? this.tool,
      status: status ?? this.status,
      input: input ?? this.input,
      output: output ?? this.output,
      metadata: metadata ?? this.metadata,
      summary: summary ?? this.summary,
      synthetic: synthetic ?? this.synthetic,
      durationMs: durationMs ?? this.durationMs,
      timestamp: timestamp ?? this.timestamp,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    if (messageId != null) 'messageId': messageId,
    if (turnId != null) 'turnId': turnId,
    if (callId != null) 'callId': callId,
    'type': type,
    'text': text,
    if (tool != null) 'tool': tool,
    if (status != null) 'status': status,
    if (input != null) 'input': input,
    if (output != null) 'output': output,
    if (metadata != null) 'metadata': metadata,
    if (summary != null) 'summary': summary,
    'synthetic': synthetic,
    if (durationMs != null) 'durationMs': durationMs,
    'timestamp': timestamp.toIso8601String(),
  };

  factory MessagePartModel.fromJson(Map<String, dynamic> json) => MessagePartModel(
    id: json['id']?.toString() ?? '',
    messageId: json['messageId']?.toString() ?? json['messageID']?.toString(),
    turnId: json['turnId']?.toString() ?? json['turnID']?.toString() ?? json['agentTurnId']?.toString(),
    callId: json['callId']?.toString() ?? json['callID']?.toString(),
    type: json['type']?.toString() ?? 'text',
    text: json['text']?.toString() ?? '',
    tool: json['tool']?.toString(),
    status: json['status']?.toString(),
    input: json['input'],
    output: json['output']?.toString(),
    metadata: json['metadata'] is Map ? Map<String, dynamic>.from(json['metadata'] as Map) : null,
    summary: json['summary']?.toString(),
    synthetic: json['synthetic'] == true,
    durationMs: json['durationMs'] is num ? (json['durationMs'] as num).toInt() : null,
    timestamp: json['timestamp'] != null
        ? DateTime.tryParse(json['timestamp'].toString()) ?? DateTime.now()
        : DateTime.now(),
  );
}

// ─── Legacy Timeline Event for backward compatibility ───────────────────────
class AgentTimelineEvent {
  final String id;
  final String type;
  final String title;
  final String? details;
  final String status;
  final List<String>? options;
  final String? command;
  final DateTime timestamp;

  AgentTimelineEvent({
    required this.id,
    required this.type,
    required this.title,
    this.details,
    this.status = 'completed',
    this.options,
    this.command,
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now();

  Map<String, dynamic> toJson() => {
    'id': id,
    'type': type,
    'title': title,
    if (details != null) 'details': details,
    'status': status,
    if (options != null) 'options': options,
    if (command != null) 'command': command,
    'timestamp': timestamp.toIso8601String(),
  };

  factory AgentTimelineEvent.fromJson(Map<String, dynamic> json) => AgentTimelineEvent(
    id: json['id']?.toString() ?? '',
    type: json['type']?.toString() ?? 'tool_use',
    title: json['title']?.toString() ?? '',
    details: json['details']?.toString(),
    status: json['status']?.toString() ?? 'completed',
    options: json['options'] is List ? List<String>.from(json['options']) : null,
    command: json['command']?.toString(),
    timestamp: json['timestamp'] != null
        ? DateTime.tryParse(json['timestamp'].toString()) ?? DateTime.now()
        : DateTime.now(),
  );
}

// ─── Compaction Summary Data Structure ─────────────────────────────────────────
class CompactionSummaryData {
  final String? objective;
  final List<String> completed;
  final List<String> active;
  final List<String> nextMove;
  final String rawText;

  const CompactionSummaryData({
    this.objective,
    this.completed = const [],
    this.active = const [],
    this.nextMove = const [],
    required this.rawText,
  });

  factory CompactionSummaryData.parse(String text, {String? explicitObjective}) {
    String? objective = explicitObjective;
    final List<String> completed = [];
    final List<String> active = [];
    final List<String> nextMove = [];

    // Objective
    if (objective == null || objective.isEmpty) {
      final objMatch = RegExp(r'## Objective\s*\n+([\s\S]*?)(?=\n## |$)', caseSensitive: false).firstMatch(text);
      if (objMatch != null && objMatch.group(1) != null) {
        final lines = objMatch.group(1)!
            .split('\n')
            .map((l) => l.replaceAll(RegExp(r'^[-*•\d.]+\s*'), '').trim())
            .where((l) => l.isNotEmpty && !l.startsWith('(') && l.toLowerCase() != 'none')
            .toList();
        if (lines.isNotEmpty) objective = lines.join(' ');
      }
    }

    // Completed
    final compMatch = RegExp(r'### Completed\s*\n+([\s\S]*?)(?=\n### |\n## |$)', caseSensitive: false).firstMatch(text);
    if (compMatch != null && compMatch.group(1) != null) {
      final lines = compMatch.group(1)!
          .split('\n')
          .map((l) => l.replaceAll(RegExp(r'^[-*•\d.]+\s*'), '').trim())
          .where((l) => l.isNotEmpty && !l.startsWith('(') && l.toLowerCase() != 'none')
          .toList();
      completed.addAll(lines);
    }

    // Active
    final actMatch = RegExp(r'### Active\s*\n+([\s\S]*?)(?=\n### |\n## |$)', caseSensitive: false).firstMatch(text);
    if (actMatch != null && actMatch.group(1) != null) {
      final lines = actMatch.group(1)!
          .split('\n')
          .map((l) => l.replaceAll(RegExp(r'^[-*•\d.]+\s*'), '').trim())
          .where((l) => l.isNotEmpty && !l.startsWith('(') && l.toLowerCase() != 'none')
          .toList();
      active.addAll(lines);
    }

    // Next Move
    final nextMatch = RegExp(r'## Next Move\s*\n+([\s\S]*?)(?=\n## |$)', caseSensitive: false).firstMatch(text);
    if (nextMatch != null && nextMatch.group(1) != null) {
      final lines = nextMatch.group(1)!
          .split('\n')
          .map((l) => l.replaceAll(RegExp(r'^[-*•\d.]+\s*'), '').trim())
          .where((l) => l.isNotEmpty && !l.startsWith('(') && l.toLowerCase() != 'none')
          .toList();
      nextMove.addAll(lines);
    }

    return CompactionSummaryData(
      objective: objective,
      completed: completed,
      active: active,
      nextMove: nextMove,
      rawText: text,
    );
  }
}

// ─── Chat Message Data Model ────────────────────────────────────────────────
class ChatMessageModel {
  final String id;
  final String sender; // 'user' | 'agent'
  final String text;
  final String timestamp;
  final List<MessagePartModel> parts; // Ordered sequence of parts
  final List<AgentTimelineEvent> timelineEvents;
  final Map<String, dynamic>? questionData;
  final Map<String, dynamic>? permissionData;
  final bool isError;
  final bool isPending;
  final bool isHistory;
  final bool isSynthetic;
  final bool isCompaction;
  final String? compactionObjective;
  final String? deliveryStatus; // 'sending' | 'sent' | 'failed'
  final String? modelName;
  final String? errorMessage;
  final String? reasoningText;
  final String? activeStatus;
  final String? parentId;
  final List<String> attachments;

  ChatMessageModel({
    required this.id,
    required this.sender,
    required this.text,
    required this.timestamp,
    this.parentId,
    List<MessagePartModel>? parts,
    List<AgentTimelineEvent>? timelineEvents,
    this.questionData,
    this.permissionData,
    this.isError = false,
    this.isPending = false,
    this.isHistory = false,
    this.isSynthetic = false,
    this.isCompaction = false,
    this.compactionObjective,
    this.deliveryStatus,
    this.modelName,
    this.errorMessage,
    this.reasoningText,
    this.activeStatus,
    List<String>? attachments,
  })  : parts = parts ?? [],
        timelineEvents = timelineEvents ?? [],
        attachments = attachments ?? [];

  bool get isSending => deliveryStatus == 'sending';
  bool get isSent => deliveryStatus == 'sent';
  bool get isSendFailed => deliveryStatus == 'failed';

  /// Real dynamic execution status derived from backend stream and active parts
  String get currentExecutionStatus {
    if (activeStatus != null && activeStatus!.trim().isNotEmpty) {
      return activeStatus!.trim();
    }

    // Check if any tool is currently running
    for (final p in parts.reversed) {
      if (p.type == 'tool' || p.type == 'tool_call' || p.type == 'tool_use' || (p.tool != null && p.tool!.isNotEmpty)) {
        if (p.status == 'running' || p.status == 'pending' || p.status == 'in_progress') {
          final tool = p.tool ?? 'tool';
          final summary = p.summary;
          if (summary != null && summary.trim().isNotEmpty) {
            return summary.length > 38 ? '${summary.substring(0, 35)}…' : summary;
          }
          return 'Executing $tool…';
        }
      }
    }

    // Check timeline events
    for (final ev in timelineEvents.reversed) {
      if (ev.status == 'running' || ev.status == 'in_progress') {
        final desc = (ev.details != null && ev.details!.isNotEmpty) ? ev.details! : ev.title;
        if (desc.isNotEmpty) {
          return desc.length > 38 ? '${desc.substring(0, 35)}…' : desc;
        }
      }
    }

    // Check if reasoning / thinking is active
    if (reasoningText != null && reasoningText!.trim().isNotEmpty) {
      return 'Reasoning & planning…';
    }
    if (parts.any((p) => (p.type == 'reasoning' || p.type == 'thinking') && (p.status == 'running' || p.status != 'completed'))) {
      return 'Reasoning & planning…';
    }

    // Check if applying patches or editing files
    if (parts.any((p) => p.type == 'patch' || p.type == 'diff')) {
      return 'Applying code modifications…';
    }

    // Check if text is currently streaming
    if (text.trim().isNotEmpty || parts.any((p) => p.type == 'text' && p.text.trim().isNotEmpty)) {
      return 'Generating response…';
    }

    if (isSending) {
      return 'Sending prompt to engine…';
    }

    return 'Analyzing prompt & context…';
  }

  bool get isCompactionMessage =>
      isCompaction ||
      (modelName == 'compaction') ||
      (parts.any((p) => p.type == 'compaction' || (p.metadata != null && p.metadata!['compaction_continue'] == true))) ||
      (text.contains('## Objective') && (text.contains('## Work State') || text.contains('## Next Move')));

  CompactionSummaryData? get compactionData {
    if (!isCompactionMessage) return null;
    String candidateText = text;
    if (candidateText.trim().isEmpty) {
      for (final p in parts) {
        if (p.type == 'compaction' || (p.summary != null && p.summary!.isNotEmpty)) {
          final s = p.summary ?? p.text;
          if (s.isNotEmpty) {
            candidateText = s;
            break;
          }
        }
      }
    }
    return CompactionSummaryData.parse(candidateText, explicitObjective: compactionObjective);
  }

  ChatMessageModel copyWith({
    String? id,
    String? sender,
    String? text,
    String? timestamp,
    String? parentId,
    List<MessagePartModel>? parts,
    List<AgentTimelineEvent>? timelineEvents,
    Map<String, dynamic>? questionData,
    Map<String, dynamic>? permissionData,
    bool? isError,
    bool? isPending,
    bool? isHistory,
    bool? isSynthetic,
    bool? isCompaction,
    String? compactionObjective,
    String? deliveryStatus,
    String? modelName,
    String? errorMessage,
    String? reasoningText,
    String? activeStatus,
    List<String>? attachments,
  }) {
    return ChatMessageModel(
      id: id ?? this.id,
      sender: sender ?? this.sender,
      text: text ?? this.text,
      timestamp: timestamp ?? this.timestamp,
      parentId: parentId ?? this.parentId,
      parts: parts ?? this.parts,
      timelineEvents: timelineEvents ?? this.timelineEvents,
      questionData: questionData ?? this.questionData,
      permissionData: permissionData ?? this.permissionData,
      isError: isError ?? this.isError,
      isPending: isPending ?? this.isPending,
      isHistory: isHistory ?? this.isHistory,
      isSynthetic: isSynthetic ?? this.isSynthetic,
      isCompaction: isCompaction ?? this.isCompaction,
      compactionObjective: compactionObjective ?? this.compactionObjective,
      deliveryStatus: deliveryStatus ?? this.deliveryStatus,
      modelName: modelName ?? this.modelName,
      errorMessage: errorMessage ?? this.errorMessage,
      reasoningText: reasoningText ?? this.reasoningText,
      activeStatus: activeStatus ?? this.activeStatus,
      attachments: attachments ?? this.attachments,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'sender': sender,
    'text': text,
    'timestamp': timestamp,
    if (parentId != null) 'parentId': parentId,
    'parts': parts.map((p) => p.toJson()).toList(),
    'timelineEvents': timelineEvents.map((e) => e.toJson()).toList(),
    if (questionData != null) 'questionData': questionData,
    if (permissionData != null) 'permissionData': permissionData,
    'isError': isError,
    'isPending': isPending,
    'isHistory': isHistory,
    'isSynthetic': isSynthetic,
    if (isCompaction) 'isCompaction': isCompaction,
    if (compactionObjective != null) 'compactionObjective': compactionObjective,
    if (deliveryStatus != null) 'deliveryStatus': deliveryStatus,
    if (modelName != null) 'modelName': modelName,
    if (errorMessage != null) 'errorMessage': errorMessage,
    if (reasoningText != null) 'reasoningText': reasoningText,
    'attachments': attachments,
  };

  factory ChatMessageModel.fromJson(Map<String, dynamic> json) => ChatMessageModel(
    id: json['id']?.toString() ?? '',
    sender: json['sender']?.toString() ?? 'agent',
    text: json['text']?.toString() ?? '',
    timestamp: json['timestamp']?.toString() ?? '',
    parentId: json['parentId']?.toString() ?? json['parentID']?.toString(),
    parts: json['parts'] is List
        ? (json['parts'] as List)
            .whereType<Map>()
            .map((p) => MessagePartModel.fromJson(Map<String, dynamic>.from(p)))
            .toList()
        : [],
    timelineEvents: json['timelineEvents'] is List
        ? (json['timelineEvents'] as List)
            .whereType<Map>()
            .map((e) => AgentTimelineEvent.fromJson(Map<String, dynamic>.from(e)))
            .toList()
        : [],
    questionData: json['questionData'] is Map ? Map<String, dynamic>.from(json['questionData']) : null,
    permissionData: json['permissionData'] is Map ? Map<String, dynamic>.from(json['permissionData']) : null,
    isError: json['isError'] == true,
    isPending: json['isPending'] == true,
    isHistory: json['isHistory'] == true,
    isSynthetic: json['isSynthetic'] == true,
    isCompaction: json['isCompaction'] == true,
    compactionObjective: json['compactionObjective']?.toString(),
    deliveryStatus: json['deliveryStatus']?.toString(),
    modelName: json['modelName']?.toString(),
    errorMessage: json['errorMessage']?.toString(),
    reasoningText: json['reasoningText']?.toString(),
    attachments: json['attachments'] is List ? List<String>.from(json['attachments']) : [],
  );

  /// Coalesces consecutive or fragmented agent messages from a single execution turn into a unified ChatMessageModel.
  /// Absorbs synthetic/internal intermediate steps so that only a single agent profile header is displayed per turn.
  static List<ChatMessageModel> coalesceList(List<ChatMessageModel> rawMessages) {
    if (rawMessages.isEmpty) return [];

    final List<ChatMessageModel> result = [];
    bool turnBoundary = false;

    for (final msg in rawMessages) {
      // 1. Compaction summary messages
      if (msg.isCompactionMessage) {
        result.add(msg);
        turnBoundary = true;
        continue;
      }

      // 2. User messages: NEVER drop genuine user messages!
      // Internal engine-injected XML command/tool notifications are filtered out of UI,
      // and they allow subsequent agent responses to coalesce with the active turn.
      if (msg.sender == 'user') {
        final trimmedText = msg.text.trim();
        final bool isEngineInternalPrompt = msg.isCompaction ||
            msg.isSynthetic ||
            trimmedText.startsWith('<command_result') ||
            trimmedText.startsWith('<tool_result') ||
            trimmedText.startsWith('<task_progress') ||
            trimmedText.startsWith('<timer_notification') ||
            trimmedText.startsWith('<task_result') ||
            trimmedText.startsWith('<task_status') ||
            trimmedText.startsWith('<synthetic_prompt') ||
            (trimmedText.startsWith('<task') && trimmedText.contains('state='));
        if (isEngineInternalPrompt) {
          continue;
        }
        result.add(msg);
        turnBoundary = false;
        continue;
      }

      // 3. Tool results or internal messages
      if (msg.sender == 'tool') {
        if (!turnBoundary && result.isNotEmpty && result.last.sender == 'agent' && !result.last.isCompactionMessage) {
          result[result.length - 1] = _mergeAgentMessages(result.last, msg);
        } else {
          result.add(msg.copyWith(sender: 'agent'));
          turnBoundary = false;
        }
        continue;
      }

      // 4. Agent / Assistant messages: coalesce consecutive steps within the SAME execution turn
      if (msg.sender == 'agent' || msg.sender == 'assistant') {
        final bool shouldMergeWithLast = !turnBoundary &&
            result.isNotEmpty &&
            result.last.sender == 'agent' &&
            !result.last.isCompactionMessage;

        if (shouldMergeWithLast) {
          result[result.length - 1] = _mergeAgentMessages(result.last, msg);
        } else {
          // Drop completely empty non-pending assistant messages that have no content
          final bool isCompletelyEmpty = !msg.isPending &&
              !msg.isError &&
              msg.parts.isEmpty &&
              msg.text.trim().isEmpty &&
              (msg.reasoningText == null || msg.reasoningText!.trim().isEmpty) &&
              msg.questionData == null &&
              msg.permissionData == null;
          if (!isCompletelyEmpty) {
            result.add(msg.copyWith(sender: 'agent'));
            turnBoundary = false;
          }
        }
        continue;
      }

      result.add(msg);
      turnBoundary = false;
    }

    // Final pass: clean any trailing empty messages that have no visible contents
    return result.where((m) {
      if (m.sender == 'agent') {
        if (m.isPending || m.isError || m.questionData != null || m.permissionData != null || m.isCompactionMessage) {
          return true;
        }
        return m.parts.isNotEmpty || m.text.trim().isNotEmpty || (m.reasoningText != null && m.reasoningText!.trim().isNotEmpty);
      }
      return true;
    }).toList();
  }

  static ChatMessageModel _mergeAgentMessages(ChatMessageModel target, ChatMessageModel source) {
    // 1. Parts merging and deduplication
    final List<MessagePartModel> combinedParts = List.from(target.parts);

    // Extract any background completion data from tool_result / command_result in source
    String? extractedTaskId;
    String? extractedStatus;
    String? extractedLogFile;
    String? extractedOutput;

    final allSourceText = '${source.text} ${source.parts.map((p) => p.text).join(' ')}';
    final toolResultMatch = RegExp(
      r'<tool_result\b[^>]*?(?:task_id|job_id|jobId)=["\x27]?([^"\x27\s>]+)["\x27]?[^>]*?(?:status=["\x27]?([^"\x27\s>]+)["\x27]?)?[^>]*?(?:log_file=["\x27]?([^"\x27\s>]+)["\x27]?)?[^>]*>([\s\S]*?)<\/tool_result>',
      caseSensitive: false,
    ).firstMatch(allSourceText);

    if (toolResultMatch != null) {
      extractedTaskId = toolResultMatch.group(1)?.trim();
      extractedStatus = toolResultMatch.group(2)?.trim();
      extractedLogFile = toolResultMatch.group(3)?.trim();
      extractedOutput = toolResultMatch.group(4)?.trim();
    }

    for (final p in source.parts) {
      final pTextTrimmed = p.text.trim();
      final bool isSyntheticTextPart = p.type == 'text' &&
          (pTextTrimmed.isEmpty ||
              p.synthetic ||
              pTextTrimmed.startsWith('<tool_result') ||
              pTextTrimmed.startsWith('<command_result') ||
              pTextTrimmed.startsWith('<task_progress') ||
              pTextTrimmed.startsWith('<timer_notification') ||
              pTextTrimmed.startsWith('<task_result') ||
              pTextTrimmed.startsWith('<task_status') ||
              pTextTrimmed.startsWith('<synthetic_prompt') ||
              (pTextTrimmed.startsWith('<task') && pTextTrimmed.contains('state=')));
      if (isSyntheticTextPart) continue;

      final existingIdx = combinedParts.indexWhere((existing) =>
          (p.id.isNotEmpty && existing.id == p.id) ||
          (p.callId != null && p.callId!.isNotEmpty && (existing.id == p.callId || existing.callId == p.callId))
      );
      if (existingIdx != -1) {
        final existing = combinedParts[existingIdx];
        combinedParts[existingIdx] = existing.copyWith(
          messageId: p.messageId ?? existing.messageId,
          turnId: p.turnId ?? existing.turnId,
          callId: p.callId ?? existing.callId,
          status: p.status ?? existing.status,
          output: (p.output != null && p.output!.isNotEmpty) ? p.output : existing.output,
          text: (p.text.isNotEmpty && p.text.length > existing.text.length) ? p.text : existing.text,
          durationMs: p.durationMs ?? existing.durationMs,
        );
      } else {
        combinedParts.add(p);
      }
    }

    // If we extracted a completed background tool result, attach the output to the matching task part
    if (extractedTaskId != null && extractedTaskId.isNotEmpty) {
      final matchingPartIdx = combinedParts.indexWhere((p) {
        final inMap = p.input is Map ? p.input as Map : {};
        final metaMap = p.metadata ?? {};
        final pTaskId = inMap['task_id']?.toString() ??
            inMap['taskId']?.toString() ??
            metaMap['taskId']?.toString() ??
            metaMap['jobId']?.toString() ??
            p.callId ??
            p.id;
        return pTaskId == extractedTaskId ||
            (pTaskId.contains('/') && pTaskId.split('/').last == extractedTaskId) ||
            (extractedTaskId!.contains('/') && extractedTaskId.split('/').last == pTaskId);
      });

      if (matchingPartIdx != -1) {
        final existing = combinedParts[matchingPartIdx];
        final updatedMeta = Map<String, dynamic>.from(existing.metadata ?? {});
        if (extractedStatus != null && extractedStatus.isNotEmpty) updatedMeta['status'] = extractedStatus;
        if (extractedLogFile != null && extractedLogFile.isNotEmpty) {
          updatedMeta['logPath'] = extractedLogFile;
          updatedMeta['log_file'] = extractedLogFile;
        }
        combinedParts[matchingPartIdx] = existing.copyWith(
          status: (extractedStatus == 'failed' || extractedStatus == 'error') ? 'failed' : 'completed',
          output: (extractedOutput != null && extractedOutput.isNotEmpty) ? extractedOutput : existing.output,
          metadata: updatedMeta,
        );
      }
    }

    // Sort parts chronologically to maintain exact execution loop sequence
    combinedParts.sort((a, b) => a.timestamp.compareTo(b.timestamp));

    // 2. Timeline events merging and deduplication
    final List<AgentTimelineEvent> combinedTimeline = List.from(target.timelineEvents);
    for (final ev in source.timelineEvents) {
      final existingIdx = combinedTimeline.indexWhere((existing) => existing.id == ev.id);
      if (existingIdx != -1) {
        final existing = combinedTimeline[existingIdx];
        combinedTimeline[existingIdx] = AgentTimelineEvent(
          id: existing.id,
          type: existing.type,
          title: existing.title,
          details: (ev.details != null && ev.details!.isNotEmpty) ? ev.details : existing.details,
          status: ev.status.isNotEmpty ? ev.status : existing.status,
          timestamp: existing.timestamp,
        );
      } else {
        combinedTimeline.add(ev);
      }
    }
    combinedTimeline.sort((a, b) => a.timestamp.compareTo(b.timestamp));

    // 3. Reasoning text deduplication
    String combinedReasoning = target.reasoningText?.trim() ?? '';
    final sourceReasoning = source.reasoningText?.trim() ?? '';
    if (sourceReasoning.isNotEmpty) {
      if (combinedReasoning.isEmpty) {
        combinedReasoning = sourceReasoning;
      } else if (!combinedReasoning.contains(sourceReasoning)) {
        if (sourceReasoning.contains(combinedReasoning)) {
          combinedReasoning = sourceReasoning;
        } else {
          combinedReasoning += '\n\n$sourceReasoning';
        }
      }
    }

    // 4. Output text deduplication with internal tag sanitization
    String combinedText = target.text.trim();
    String sourceText = source.text.trim();

    // Sanitize any internal XML tags or background boilerplate from source text
    final bool isSourceSynthetic = source.isSynthetic ||
        sourceText.startsWith('<command_result') ||
        sourceText.startsWith('<tool_result') ||
        sourceText.startsWith('<task_progress') ||
        sourceText.startsWith('<timer_notification') ||
        sourceText.startsWith('<task_result') ||
        sourceText.startsWith('<task_status') ||
        sourceText.startsWith('<synthetic_prompt') ||
        sourceText.startsWith('{"command":') ||
        sourceText.contains('Continue if you have next steps') ||
        sourceText.contains('compaction_continue');

    if (!isSourceSynthetic && sourceText.isNotEmpty) {
      sourceText = sourceText.replaceAll(RegExp(r'<tool_result\b[\s\S]*?<\/tool_result>', caseSensitive: false), '');
      sourceText = sourceText.replaceAll(RegExp(r'<command_result\b[\s\S]*?<\/command_result>', caseSensitive: false), '');
      sourceText = sourceText.replaceAll(RegExp(r'<task_result\b[\s\S]*?<\/task_result>', caseSensitive: false), '');
      sourceText = sourceText.replaceAll(RegExp(r'<task_progress\b[\s\S]*?<\/task_progress>', caseSensitive: false), '');
      sourceText = sourceText.replaceAll(RegExp(r'<timer_notification\b[\s\S]*?<\/timer_notification>', caseSensitive: false), '');
      sourceText = sourceText.replaceAll(RegExp(r'<task_status\b[\s\S]*?<\/task_status>', caseSensitive: false), '');
      sourceText = sourceText.replaceAll(RegExp(r'<synthetic_prompt\b[\s\S]*?<\/synthetic_prompt>', caseSensitive: false), '');
      sourceText = sourceText.replaceAll(RegExp(r'<(?:tool_result|command_result|task_result|task_progress|timer_notification|task_status|synthetic_prompt)\b[^>]*>', caseSensitive: false), '');
      sourceText = sourceText.replaceAll(RegExp(r'Background tool "[^"]*?" \(Task ID: [^\)]*?\) has completed with status "[^"]*?"\.\s*Log File: [^\n]*\s*Please review the result and provide the final completion summary to the user in their language\.', caseSensitive: false), '');
      sourceText = sourceText.trim();
    }

    if (sourceText.isNotEmpty && !isSourceSynthetic) {
      if (combinedText.isEmpty) {
        combinedText = sourceText;
      } else if (!combinedText.contains(sourceText)) {
        if (sourceText.contains(combinedText)) {
          combinedText = sourceText;
        } else {
          combinedText += '\n\n$sourceText';
        }
      }
    }

    final bool combinedPending = target.isPending && source.isPending;
    final bool combinedError = target.isError || source.isError;
    final String? combinedErrorMsg = source.errorMessage ?? target.errorMessage;
    final String? combinedModel = source.modelName ?? target.modelName;
    final String effectiveTimestamp = target.timestamp.isNotEmpty ? target.timestamp : source.timestamp;
    final String effectiveId = (target.id.startsWith('loading') || target.id.startsWith('pending') || target.id.isEmpty)
        ? source.id
        : target.id;

    final List<String> combinedAttachments = List.from(target.attachments);
    for (final a in source.attachments) {
      if (!combinedAttachments.contains(a)) combinedAttachments.add(a);
    }

    return ChatMessageModel(
      id: effectiveId,
      parentId: target.parentId ?? source.parentId,
      sender: 'agent',
      text: combinedText,
      timestamp: effectiveTimestamp,
      parts: combinedParts,
      timelineEvents: combinedTimeline,
      questionData: source.questionData ?? target.questionData,
      permissionData: source.permissionData ?? target.permissionData,
      isError: combinedError,
      isPending: combinedPending,
      isHistory: target.isHistory || source.isHistory,
      modelName: combinedModel,
      errorMessage: combinedErrorMsg,
      reasoningText: combinedReasoning.isNotEmpty ? combinedReasoning : null,
      attachments: combinedAttachments,
    );
  }
}

// ─── Model Item Schema Definition ───────────────────────────────────────────
class AvaModelItem {
  final String id;
  final String name;
  final String provider;
  final String providerKey;
  final String modelKey;
  final int? contextLimit;
  final bool reasoning;
  final bool supportsImages;

  const AvaModelItem({
    required this.id,
    required this.name,
    required this.provider,
    this.providerKey = '',
    this.modelKey = '',
    this.contextLimit,
    this.reasoning = false,
    this.supportsImages = false,
  });

  String get effectiveProviderKey {
    if (providerKey.isNotEmpty) return providerKey;
    if (id.startsWith("omniroute/")) return "omniroute";
    if (id.startsWith("custom/")) return "custom";
    if (id.startsWith("openai/")) return "openai";
    if (id.startsWith("anthropic/")) return "anthropic";
    return provider.toLowerCase().trim().isEmpty ? "omniroute" : provider.toLowerCase().trim();
  }

  String get effectiveModelKey {
    if (modelKey.isNotEmpty) return modelKey;
    if (id.startsWith("omniroute/")) return id.substring("omniroute/".length);
    if (id.startsWith("custom/")) return id.substring("custom/".length);
    if (id.startsWith("openai/")) return id.substring("openai/".length);
    if (id.startsWith("anthropic/")) return id.substring("anthropic/".length);
    return id.trim();
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'provider': provider,
      'providerKey': providerKey,
      'modelKey': modelKey,
      'contextLimit': contextLimit,
      'reasoning': reasoning,
      'supportsImages': supportsImages,
    };
  }

  factory AvaModelItem.fromJson(Map<String, dynamic> json) {
    return AvaModelItem(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      provider: json['provider']?.toString() ?? '',
      providerKey: json['providerKey']?.toString() ?? '',
      modelKey: json['modelKey']?.toString() ?? '',
      contextLimit: (json['contextLimit'] as num?)?.toInt(),
      reasoning: json['reasoning'] == true,
      supportsImages: json['supportsImages'] == true,
    );
  }
}

// ─── Slash Command Item Schema ──────────────────────────────────────────────
class SlashCommandItem {
  final String command;
  final String title;
  final String description;
  final IconData? icon;
  final String category;

  const SlashCommandItem({
    required this.command,
    required this.title,
    required this.description,
    this.icon,
    this.category = 'Command',
  });
}

// ─── User Profile & AI Persona Schema ───────────────────────────────────────
class AvaUserProfile {
  final String name;
  final String username;
  final String? password;
  final String avatar;
  final String aiName;
  final String aiRole;
  final String personality;
  final String characteristics;
  final String customInstructions;
  final int maxTokens;

  AvaUserProfile({
    required this.name,
    required this.username,
    this.password,
    required this.avatar,
    required this.aiName,
    required this.aiRole,
    required this.personality,
    required this.characteristics,
    required this.customInstructions,
    this.maxTokens = 4096,
  });

  factory AvaUserProfile.fromJson(Map<String, dynamic> json) {
    return AvaUserProfile(
      name: json['name'] ?? 'Mahmud Hasan',
      username: json['username'] ?? 'ava',
      password: json['password'],
      avatar: json['avatar'] ?? '',
      aiName: json['ai_name'] ?? json['aiName'] ?? 'AvA',
      aiRole: json['ai_role'] ?? json['aiRole'] ?? 'Senior AI Software Engineer',
      personality: json['personality'] ?? 'Helpful, precise, proactive, friendly, and highly capable',
      characteristics: json['characteristics'] ?? 'Writes clean modular code, high design aesthetics, zero emojis in UI, rigorous end-to-end verification',
      customInstructions: json['custom_instructions'] ?? json['customInstructions'] ?? '',
      maxTokens: json['max_tokens'] ?? json['maxTokens'] ?? 4096,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'username': username,
      if (password != null && password!.isNotEmpty) 'password': password,
      'avatar': avatar,
      'ai_name': aiName,
      'ai_role': aiRole,
      'personality': personality,
      'characteristics': characteristics,
      'custom_instructions': customInstructions,
      'max_tokens': maxTokens,
    };
  }

  AvaUserProfile copyWith({
    String? name,
    String? username,
    String? password,
    String? avatar,
    String? aiName,
    String? aiRole,
    String? personality,
    String? characteristics,
    String? customInstructions,
    int? maxTokens,
  }) {
    return AvaUserProfile(
      name: name ?? this.name,
      username: username ?? this.username,
      password: password ?? this.password,
      avatar: avatar ?? this.avatar,
      aiName: aiName ?? this.aiName,
      aiRole: aiRole ?? this.aiRole,
      personality: personality ?? this.personality,
      characteristics: characteristics ?? this.characteristics,
      customInstructions: customInstructions ?? this.customInstructions,
      maxTokens: maxTokens ?? this.maxTokens,
    );
  }
}

// ─── Queued Prompt Item Schema Definition ────────────────────────────────────
class QueuedPromptItem {
  final String id;
  final String promptText;
  final List<String> attachments;
  final String? userDisplayText;
  final DateTime queuedAt;

  QueuedPromptItem({
    required this.id,
    required this.promptText,
    this.attachments = const [],
    this.userDisplayText,
    DateTime? queuedAt,
  }) : queuedAt = queuedAt ?? DateTime.now();

  QueuedPromptItem copyWith({
    String? id,
    String? promptText,
    List<String>? attachments,
    String? userDisplayText,
    DateTime? queuedAt,
  }) {
    return QueuedPromptItem(
      id: id ?? this.id,
      promptText: promptText ?? this.promptText,
      attachments: attachments ?? this.attachments,
      userDisplayText: userDisplayText ?? this.userDisplayText,
      queuedAt: queuedAt ?? this.queuedAt,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'promptText': promptText,
    'attachments': attachments,
    if (userDisplayText != null) 'userDisplayText': userDisplayText,
    'queuedAt': queuedAt.toIso8601String(),
  };

  factory QueuedPromptItem.fromJson(Map<String, dynamic> json) => QueuedPromptItem(
    id: json['id']?.toString() ?? '',
    promptText: json['promptText']?.toString() ?? '',
    attachments: json['attachments'] is List ? List<String>.from(json['attachments']) : [],
    userDisplayText: json['userDisplayText']?.toString(),
    queuedAt: json['queuedAt'] != null ? DateTime.tryParse(json['queuedAt'].toString()) : null,
  );
}

